-- =====================================================================
-- IBEMHAL IAS LMS — MIGRATION 003: SINGLE-DEVICE SESSION ENFORCEMENT
--
-- Project Ref : nhjhnevxyynllomfmyxp
-- SQL Editor  : https://supabase.com/dashboard/project/nhjhnevxyynllomfmyxp/sql
--
-- Run AFTER schema.sql and 002_commerce.sql. Fully IDEMPOTENT.
-- =====================================================================

-- =====================================================================
-- SECTION 1 — PROFILE DEVICE COLUMNS
-- =====================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_device_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_device_label TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_bound_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_switch_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_device ON profiles(current_device_id);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at DESC);

-- =====================================================================
-- SECTION 2 — DEVICE AUDIT LOG
-- =====================================================================

CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_label TEXT,
  platform TEXT,
  user_agent TEXT,
  action TEXT NOT NULL DEFAULT 'bound',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE device_sessions ADD CONSTRAINT device_sessions_action_check
    CHECK (action IN ('bound', 'rebound', 'evicted', 'released', 'blocked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_device_sessions_user ON device_sessions(user_id, created_at DESC);

ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'device_sessions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.device_sessions', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "device_sessions_select_own" ON device_sessions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "device_sessions_admin_all" ON device_sessions FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================================
-- SECTION 3 — RPC: claim_device
--
-- Binds the calling user to a device. Admins and instructors are exempt
-- so support staff can work across machines.
--
-- Returns: { status, deviceId, boundAt, switchCount, message }
--   'bound'    → first device, or same device re-confirming
--   'rebound'  → previous device evicted, this one now owns the session
-- =====================================================================

DROP FUNCTION IF EXISTS public.claim_device(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.claim_device(
  p_device_id    TEXT,
  p_device_label TEXT DEFAULT NULL,
  p_platform     TEXT DEFAULT NULL,
  p_user_agent   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid      UUID := auth.uid();
  v_prof   profiles%ROWTYPE;
  v_status TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'claim_device: not authenticated';
  END IF;

  IF p_device_id IS NULL OR LENGTH(TRIM(p_device_id)) < 8 THEN
    RAISE EXCEPTION 'claim_device: invalid device id';
  END IF;

  SELECT * INTO v_prof FROM profiles WHERE id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim_device: profile not found';
  END IF;

  -- Staff bypass single-device binding
  IF v_prof.role IN ('admin', 'instructor') THEN
    UPDATE profiles SET last_active_at = NOW() WHERE id = uid;
    RETURN jsonb_build_object(
      'status', 'exempt',
      'deviceId', p_device_id,
      'message', 'Staff accounts are not device-locked.'
    );
  END IF;

  IF v_prof.current_device_id IS NULL THEN
    v_status := 'bound';
  ELSIF v_prof.current_device_id = p_device_id THEN
    v_status := 'bound';
  ELSE
    v_status := 'rebound';
  END IF;

  UPDATE profiles SET
    current_device_id    = p_device_id,
    current_device_label = COALESCE(p_device_label, current_device_label),
    device_bound_at      = CASE WHEN v_status = 'rebound' OR current_device_id IS NULL
                                THEN NOW() ELSE device_bound_at END,
    last_active_at       = NOW(),
    device_switch_count  = CASE WHEN v_status = 'rebound'
                                THEN device_switch_count + 1 ELSE device_switch_count END
  WHERE id = uid
  RETURNING * INTO v_prof;

  INSERT INTO device_sessions (user_id, device_id, device_label, platform, user_agent, action)
  VALUES (uid, p_device_id, p_device_label, p_platform, LEFT(COALESCE(p_user_agent, ''), 400), v_status);

  RETURN jsonb_build_object(
    'status', v_status,
    'deviceId', v_prof.current_device_id,
    'boundAt', v_prof.device_bound_at,
    'switchCount', v_prof.device_switch_count,
    'message', CASE
      WHEN v_status = 'rebound'
        THEN 'Signed in on this device. Your other device has been signed out.'
      ELSE 'Device verified.'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_device(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================================
-- SECTION 4 — RPC: verify_device (heartbeat)
--
-- Cheap, read-mostly check used by the client poller. Returns valid=false
-- as soon as another device claims the account.
-- =====================================================================

DROP FUNCTION IF EXISTS public.verify_device(TEXT);

CREATE OR REPLACE FUNCTION public.verify_device(p_device_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid    UUID := auth.uid();
  v_prof profiles%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'no_session');
  END IF;

  SELECT * INTO v_prof FROM profiles WHERE id = uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'no_profile');
  END IF;

  IF v_prof.role IN ('admin', 'instructor') THEN
    UPDATE profiles SET last_active_at = NOW() WHERE id = uid;
    RETURN jsonb_build_object('valid', true, 'reason', 'exempt');
  END IF;

  IF v_prof.current_device_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'unbound');
  END IF;

  IF v_prof.current_device_id <> p_device_id THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'concurrent_login',
      'boundLabel', v_prof.current_device_label
    );
  END IF;

  UPDATE profiles SET last_active_at = NOW() WHERE id = uid;

  RETURN jsonb_build_object('valid', true, 'reason', 'ok');
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_device(TEXT) TO authenticated;

-- =====================================================================
-- SECTION 5 — RPC: release_device (clean sign-out)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.release_device()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  v_device TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false);
  END IF;

  SELECT current_device_id INTO v_device FROM profiles WHERE id = uid;

  UPDATE profiles
  SET current_device_id = NULL, device_bound_at = NULL, last_active_at = NOW()
  WHERE id = uid;

  IF v_device IS NOT NULL THEN
    INSERT INTO device_sessions (user_id, device_id, action)
    VALUES (uid, v_device, 'released');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_device() TO authenticated;

-- =====================================================================
-- SECTION 6 — RPC: admin_reset_device
-- Lets institute staff unlock a student who changed handsets.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_reset_device(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_device TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_reset_device: admin role required';
  END IF;

  SELECT current_device_id INTO v_device FROM profiles WHERE id = p_user_id;

  UPDATE profiles
  SET current_device_id = NULL, device_bound_at = NULL
  WHERE id = p_user_id;

  INSERT INTO device_sessions (user_id, device_id, action)
  VALUES (p_user_id, COALESCE(v_device, 'none'), 'evicted');

  RETURN jsonb_build_object('success', true, 'clearedDevice', v_device);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reset_device(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_reset_device(UUID) TO authenticated, service_role;

-- =====================================================================
-- SECTION 7 — VERIFICATION
-- =====================================================================

SELECT 'COLUMNS' AS check_type, column_name AS name, data_type AS status
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('current_device_id','current_device_label','device_bound_at',
                      'last_active_at','device_switch_count')
UNION ALL
SELECT 'FUNCTIONS', p.proname, 'OK'
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('claim_device','verify_device','release_device','admin_reset_device')
UNION ALL
SELECT 'TABLE', 'device_sessions',
       CASE WHEN rowsecurity THEN 'RLS ON' ELSE 'RLS OFF' END
FROM pg_tables WHERE schemaname = 'public' AND tablename = 'device_sessions'
ORDER BY check_type, name;
