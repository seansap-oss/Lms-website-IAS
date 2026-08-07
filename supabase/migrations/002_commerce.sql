-- =====================================================================
-- IBEMHAL IAS LMS — MIGRATION 002: COMMERCE, DISCOUNTS & ENTITLEMENTS
--
-- Project Ref : nhjhnevxyynllomfmyxp
-- SQL Editor  : https://supabase.com/dashboard/project/nhjhnevxyynllomfmyxp/sql
--
-- Run AFTER schema.sql. Fully IDEMPOTENT — safe to re-run.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- SECTION 1 — COURSES EXPANSION (modular catalogue, 100+ courses)
-- =====================================================================

ALTER TABLE courses ADD COLUMN IF NOT EXISTS price_inr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS discounted_price_inr INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_months INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS short_tagline TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Backfill price_inr from the legacy `price` column, then keep both in sync
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'price'
  ) THEN
    UPDATE courses SET price_inr = COALESCE(price, 0) WHERE price_inr = 0;
    ALTER TABLE courses ALTER COLUMN price DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE courses ADD CONSTRAINT courses_price_positive CHECK (price_inr >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE courses ADD CONSTRAINT courses_discount_valid
    CHECK (discounted_price_inr IS NULL OR (discounted_price_inr >= 0 AND discounted_price_inr <= price_inr));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Effective list price helper
CREATE OR REPLACE FUNCTION public.course_effective_price(p_course_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(discounted_price_inr, price_inr) FROM courses WHERE id = p_course_id;
$$;

-- =====================================================================
-- SECTION 2 — DISCOUNT CODES
-- =====================================================================

CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  min_purchase_inr INTEGER NOT NULL DEFAULT 0,
  max_discount_inr INTEGER,
  applies_to_course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE discount_codes ADD CONSTRAINT discount_codes_type_check
    CHECK (discount_type IN ('percentage', 'flat'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE discount_codes ADD CONSTRAINT discount_codes_value_check
    CHECK (discount_value >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE discount_codes ADD CONSTRAINT discount_codes_pct_range
    CHECK (discount_type <> 'percentage' OR discount_value <= 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE discount_codes ADD CONSTRAINT discount_codes_uses_check
    CHECK (max_uses IS NULL OR current_uses <= max_uses);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Codes are always stored and compared in UPPERCASE
CREATE OR REPLACE FUNCTION public.normalise_discount_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.code := UPPER(TRIM(NEW.code));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discount_code_upper ON discount_codes;
CREATE TRIGGER trg_discount_code_upper BEFORE INSERT OR UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.normalise_discount_code();

-- =====================================================================
-- SECTION 3 — ENROLLMENTS EXPANSION
-- =====================================================================

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS discount_code_used TEXT;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS enrolled_via TEXT NOT NULL DEFAULT 'admin_manual';
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS upi_reference TEXT;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE enrollments ADD CONSTRAINT enrollments_via_check
    CHECK (enrolled_via IN ('upi_auto', 'admin_manual', 'cash_offline', 'scholarship', 'trial'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- SECTION 4 — INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_discount_codes_code    ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active  ON discount_codes(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_discount_codes_course  ON discount_codes(applies_to_course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_via        ON enrollments(enrolled_via);
CREATE INDEX IF NOT EXISTS idx_enrollments_status     ON enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_enrollments_created    ON enrollments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_display_order  ON courses(display_order, title);
CREATE INDEX IF NOT EXISTS idx_courses_price          ON courses(price_inr);

-- =====================================================================
-- SECTION 5 — ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'discount_codes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.discount_codes', r.policyname);
  END LOOP;
END $$;

-- Anyone may read ACTIVE codes (needed to validate at checkout).
-- Validation itself runs through the SECURITY DEFINER RPC below, so
-- usage counters can never be tampered with from the client.
CREATE POLICY "discount_select_active" ON discount_codes FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));
CREATE POLICY "discount_admin_all" ON discount_codes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_discount_codes_updated_at ON discount_codes;
CREATE TRIGGER trg_discount_codes_updated_at BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================================
-- SECTION 6 — RPC: validate_discount_code
-- Pure read-only price calculator. Never mutates current_uses.
-- =====================================================================

DROP FUNCTION IF EXISTS public.validate_discount_code(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.validate_discount_code(
  p_code      TEXT,
  p_course_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code     discount_codes%ROWTYPE;
  v_base     INTEGER;
  v_discount NUMERIC(10,2);
  v_final    INTEGER;
BEGIN
  SELECT COALESCE(discounted_price_inr, price_inr) INTO v_base
  FROM courses WHERE id = p_course_id AND is_published = true;

  IF v_base IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'course_not_found',
      'message', 'This course is not available.');
  END IF;

  SELECT * INTO v_code FROM discount_codes
  WHERE code = UPPER(TRIM(p_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found',
      'message', 'Invalid promo code.', 'basePrice', v_base, 'finalPrice', v_base);
  END IF;

  IF NOT v_code.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'inactive',
      'message', 'This promo code is no longer active.', 'basePrice', v_base, 'finalPrice', v_base);
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at <= NOW() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired',
      'message', 'This promo code has expired.', 'basePrice', v_base, 'finalPrice', v_base);
  END IF;

  IF v_code.max_uses IS NOT NULL AND v_code.current_uses >= v_code.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'exhausted',
      'message', 'This promo code has reached its usage limit.', 'basePrice', v_base, 'finalPrice', v_base);
  END IF;

  IF v_code.applies_to_course_id IS NOT NULL AND v_code.applies_to_course_id <> p_course_id THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'wrong_course',
      'message', 'This promo code does not apply to this course.', 'basePrice', v_base, 'finalPrice', v_base);
  END IF;

  IF v_base < v_code.min_purchase_inr THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'below_minimum',
      'message', format('Minimum purchase of Rs %s required.', v_code.min_purchase_inr),
      'basePrice', v_base, 'finalPrice', v_base);
  END IF;

  IF v_code.discount_type = 'percentage' THEN
    v_discount := ROUND(v_base * v_code.discount_value / 100.0);
  ELSE
    v_discount := LEAST(v_code.discount_value, v_base);
  END IF;

  IF v_code.max_discount_inr IS NOT NULL THEN
    v_discount := LEAST(v_discount, v_code.max_discount_inr);
  END IF;

  v_final := GREATEST(0, v_base - v_discount::INTEGER);

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_code.code,
    'description', v_code.description,
    'discountType', v_code.discount_type,
    'discountValue', v_code.discount_value,
    'basePrice', v_base,
    'discountAmount', v_discount::INTEGER,
    'finalPrice', v_final,
    'remainingUses', CASE WHEN v_code.max_uses IS NULL THEN NULL
                          ELSE v_code.max_uses - v_code.current_uses END,
    'message', format('Promo applied — you save Rs %s!', v_discount::INTEGER)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_discount_code(TEXT, UUID) TO anon, authenticated;

-- =====================================================================
-- SECTION 7 — RPC: redeem_enrollment
-- Atomically: verify price server-side, increment code usage, enrol.
-- Client-supplied prices are NEVER trusted.
-- =====================================================================

DROP FUNCTION IF EXISTS public.redeem_enrollment(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.redeem_enrollment(
  p_course_id UUID,
  p_code      TEXT DEFAULT NULL,
  p_via       TEXT DEFAULT 'upi_auto',
  p_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid          UUID := auth.uid();
  v_validation JSONB;
  v_final      INTEGER;
  v_enrollment enrollments%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'redeem_enrollment: not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM enrollments WHERE user_id = uid AND course_id = p_course_id) THEN
    RETURN jsonb_build_object('success', true, 'alreadyEnrolled', true,
      'message', 'You are already enrolled in this course.');
  END IF;

  IF p_code IS NOT NULL AND LENGTH(TRIM(p_code)) > 0 THEN
    v_validation := public.validate_discount_code(p_code, p_course_id);

    IF NOT (v_validation->>'valid')::BOOLEAN THEN
      RETURN jsonb_build_object('success', false,
        'message', v_validation->>'message', 'reason', v_validation->>'reason');
    END IF;

    v_final := (v_validation->>'finalPrice')::INTEGER;

    UPDATE discount_codes
    SET current_uses = current_uses + 1
    WHERE code = UPPER(TRIM(p_code))
      AND is_active = true
      AND (max_uses IS NULL OR current_uses < max_uses);

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'reason', 'exhausted',
        'message', 'This promo code was just exhausted. Please try another.');
    END IF;
  ELSE
    SELECT COALESCE(discounted_price_inr, price_inr) INTO v_final
    FROM courses WHERE id = p_course_id AND is_published = true;

    IF v_final IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Course not available.');
    END IF;
  END IF;

  INSERT INTO enrollments (
    user_id, course_id, amount_paid, discount_code_used,
    enrolled_via, upi_reference, payment_status
  )
  VALUES (
    uid, p_course_id, v_final, NULLIF(UPPER(TRIM(COALESCE(p_code, ''))), ''),
    p_via, p_reference, CASE WHEN p_via = 'cash_offline' THEN 'pending' ELSE 'paid' END
  )
  RETURNING * INTO v_enrollment;

  RETURN jsonb_build_object(
    'success', true,
    'alreadyEnrolled', false,
    'enrollmentId', v_enrollment.id,
    'amountPaid', v_final,
    'message', 'Enrollment confirmed. Welcome aboard!'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_enrollment(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================================
-- SECTION 8 — RPC: admin_grant_entitlement / admin_revoke_entitlement
-- Used by the Local Institute Admin panel for manual/cash enrolments.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_grant_entitlement(
  p_user_id   UUID,
  p_course_id UUID,
  p_via       TEXT DEFAULT 'admin_manual',
  p_amount    NUMERIC DEFAULT 0,
  p_notes     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_grant_entitlement: admin role required';
  END IF;

  INSERT INTO enrollments (user_id, course_id, amount_paid, enrolled_via,
                           payment_status, granted_by, notes)
  VALUES (p_user_id, p_course_id, COALESCE(p_amount, 0), p_via, 'paid', auth.uid(), p_notes)
  ON CONFLICT (user_id, course_id) DO UPDATE
    SET amount_paid = EXCLUDED.amount_paid,
        enrolled_via = EXCLUDED.enrolled_via,
        notes = EXCLUDED.notes
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'enrollmentId', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_entitlement(
  p_user_id   UUID,
  p_course_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_revoke_entitlement: admin role required';
  END IF;

  DELETE FROM enrollments WHERE user_id = p_user_id AND course_id = p_course_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_entitlement(UUID, UUID, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_entitlement(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_grant_entitlement(UUID, UUID, TEXT, NUMERIC, TEXT) TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.admin_revoke_entitlement(UUID, UUID) TO authenticated, service_role;

-- =====================================================================
-- SECTION 9 — SALES ANALYTICS VIEW
-- =====================================================================

CREATE OR REPLACE VIEW public.sales_analytics AS
SELECT
  (SELECT COUNT(DISTINCT user_id) FROM enrollments)                             AS total_students,
  (SELECT COUNT(*) FROM enrollments)                                            AS total_enrollments,
  (SELECT COALESCE(SUM(amount_paid), 0) FROM enrollments
     WHERE payment_status = 'paid')                                             AS total_revenue_inr,
  (SELECT COUNT(*) FROM courses WHERE is_published = true)                      AS active_courses,
  (SELECT COUNT(*) FROM enrollments WHERE enrolled_via = 'upi_auto')            AS upi_enrollments,
  (SELECT COUNT(*) FROM enrollments WHERE enrolled_via IN ('admin_manual','cash_offline')) AS manual_enrollments,
  (SELECT COUNT(*) FROM discount_codes WHERE is_active = true)                  AS active_discount_codes,
  (SELECT COALESCE(SUM(amount_paid), 0) FROM enrollments
     WHERE payment_status = 'paid'
       AND created_at >= date_trunc('month', NOW()))                            AS revenue_this_month_inr;

GRANT SELECT ON public.sales_analytics TO authenticated, service_role;

-- =====================================================================
-- SECTION 10 — SEED PROMO CODES (safe on re-run)
-- =====================================================================

INSERT INTO discount_codes (code, description, discount_type, discount_value, max_uses, expires_at, is_active)
VALUES
  ('IAR2026',    'Ibemhal Aspirant Rebate 2026 — 25% off',  'percentage', 25, 500,  NOW() + INTERVAL '365 days', true),
  ('EARLYBIRD',  'Early bird — 30% off',                     'percentage', 30, 100,  NOW() + INTERVAL '90 days',  true),
  ('MANIPUR10',  'Manipur student special — flat Rs 10,000', 'flat',    10000, NULL, NOW() + INTERVAL '180 days', true),
  ('TOPPER50',   'Topper scholarship — 50% off',             'percentage', 50, 25,   NOW() + INTERVAL '60 days',  true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- SECTION 11 — VERIFICATION
-- =====================================================================

SELECT 'TABLES' AS check_type, tablename AS name,
       CASE WHEN rowsecurity THEN 'RLS ON' ELSE 'RLS OFF' END AS status
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('discount_codes', 'enrollments', 'courses')
UNION ALL
SELECT 'FUNCTIONS', p.proname, 'OK'
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('validate_discount_code','redeem_enrollment','admin_grant_entitlement',
                    'admin_revoke_entitlement','course_effective_price')
UNION ALL
SELECT 'PROMO CODES', code, discount_type || ' ' || discount_value::TEXT
FROM discount_codes
ORDER BY check_type, name;
