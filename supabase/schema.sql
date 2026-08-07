-- =====================================================================
-- IBEMHAL IAS LMS — COMPLETE SUPABASE SCHEMA
--
-- Project Ref : nhjhnevxyynllomfmyxp
-- Dashboard   : https://supabase.com/dashboard/project/nhjhnevxyynllomfmyxp
-- SQL Editor  : https://supabase.com/dashboard/project/nhjhnevxyynllomfmyxp/sql
--
-- ONE-CLICK INSTALL: paste this entire file into the SQL Editor and Run.
-- Fully IDEMPOTENT — safe to run repeatedly. No data loss on re-run.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- SECTION 1 — TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  tier TEXT NOT NULL DEFAULT 'free',
  avatar_url TEXT,
  phone TEXT,
  target_exam TEXT,
  target_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additive columns for databases created before this revision
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_exam TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_year INTEGER;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'instructor', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_tier_check
    CHECK (tier IN ('free', 'foundation', 'prelims', 'mains', 'optional', 'all-access'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'foundation',
  level TEXT NOT NULL DEFAULT 'beginner',
  required_tier TEXT NOT NULL DEFAULT 'free',
  instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE courses ADD COLUMN IF NOT EXISTS required_tier TEXT NOT NULL DEFAULT 'free';

DO $$ BEGIN
  ALTER TABLE courses ADD CONSTRAINT courses_category_check
    CHECK (category IN ('foundation', 'prelims', 'mains', 'optional', 'test-series'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE courses ADD CONSTRAINT courses_level_check
    CHECK (level IN ('beginner', 'intermediate', 'advanced'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- modules
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'video',
  video_mux_id TEXT,
  audio_url TEXT,
  text_content TEXT,
  vtt_caption_url TEXT,
  transcript_text TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE lessons ADD CONSTRAINT lessons_content_type_check
    CHECK (content_type IN ('video', 'audio', 'text'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- ---------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ---------------------------------------------------------------------
-- user_gamification
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_gamification (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  lessons_completed INTEGER NOT NULL DEFAULT 0 CHECK (lessons_completed >= 0),
  essays_submitted INTEGER NOT NULL DEFAULT 0 CHECK (essays_submitted >= 0),
  quizzes_completed INTEGER NOT NULL DEFAULT 0 CHECK (quizzes_completed >= 0),
  total_study_minutes INTEGER NOT NULL DEFAULT 0 CHECK (total_study_minutes >= 0),
  last_login_date DATE,
  unlocked_badges TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- calendar_events
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'study',
  subject TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check
    CHECK (type IN ('study','revision','mock-test','live-class','answer-writing','current-affairs','break'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_time_order
    CHECK (end_time > start_time);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- SECTION 2 — INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role            ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_tier            ON profiles(tier);
CREATE INDEX IF NOT EXISTS idx_modules_course_id        ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order            ON modules(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id        ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order            ON lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id      ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id    ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id  ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson   ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_courses_category         ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_slug             ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_published        ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id  ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start    ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_ai       ON calendar_events(user_id, ai_generated);

-- =====================================================================
-- SECTION 3 — HELPER FUNCTIONS
--
-- IMPORTANT: is_admin() is SECURITY DEFINER so it can read `profiles`
-- without re-triggering that table's own RLS policies. Querying profiles
-- directly inside a profiles policy causes infinite recursion (42P17).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_instructor(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role IN ('instructor', 'admin'));
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- SECTION 4 — ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events   ENABLE ROW LEVEL SECURITY;

-- Drop existing policies so this file can be re-run cleanly
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','courses','modules','lessons','enrollments',
                        'lesson_progress','user_gamification','calendar_events')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
CREATE POLICY "profiles_select_own"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_all"    ON profiles FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
CREATE POLICY "courses_select_published" ON courses FOR SELECT USING (is_published = true);
CREATE POLICY "courses_instructor_all"   ON courses FOR ALL
  USING (auth.uid() = instructor_id) WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "courses_admin_all"        ON courses FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- modules
-- ---------------------------------------------------------------------
CREATE POLICY "modules_select_published" ON modules FOR SELECT USING (
  course_id IN (SELECT id FROM courses WHERE is_published = true)
);
CREATE POLICY "modules_instructor_all"   ON modules FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE instructor_id = auth.uid())
);
CREATE POLICY "modules_admin_all"        ON modules FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- lessons — free previews are public; full lessons require enrolment
-- ---------------------------------------------------------------------
CREATE POLICY "lessons_select_preview_or_enrolled" ON lessons FOR SELECT USING (
  is_free_preview = true
  OR module_id IN (
    SELECT m.id FROM modules m
    JOIN enrollments e ON e.course_id = m.course_id
    WHERE e.user_id = auth.uid()
  )
);
CREATE POLICY "lessons_instructor_all" ON lessons FOR ALL USING (
  module_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE c.instructor_id = auth.uid()
  )
);
CREATE POLICY "lessons_admin_all" ON lessons FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------
CREATE POLICY "enrollments_select_own" ON enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "enrollments_insert_own" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enrollments_delete_own" ON enrollments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "enrollments_admin_all"  ON enrollments FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------
CREATE POLICY "lesson_progress_own_all" ON lesson_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lesson_progress_admin_select" ON lesson_progress FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------
-- user_gamification
-- ---------------------------------------------------------------------
CREATE POLICY "gamification_select_own" ON user_gamification FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gamification_insert_own" ON user_gamification FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gamification_update_own" ON user_gamification FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gamification_admin_select" ON user_gamification FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------
-- calendar_events
-- ---------------------------------------------------------------------
CREATE POLICY "calendar_select_own" ON calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "calendar_insert_own" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_update_own" ON calendar_events FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_delete_own" ON calendar_events FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "calendar_admin_select" ON calendar_events FOR SELECT USING (public.is_admin());

-- =====================================================================
-- SECTION 5 — TRIGGERS
-- =====================================================================

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER trg_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_gamification_updated_at ON user_gamification;
CREATE TRIGGER trg_gamification_updated_at BEFORE UPDATE ON user_gamification
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_calendar_updated_at ON calendar_events;
CREATE TRIGGER trg_calendar_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------
-- Auto-provision profile + gamification row on signup
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'tier', 'free')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_gamification (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_on_signup();

-- =====================================================================
-- SECTION 6 — RPC FUNCTIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- award_xp() — atomic XP award + streak calculation
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.award_xp(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.award_xp(
  p_xp      INTEGER DEFAULT 0,
  p_lessons INTEGER DEFAULT 0,
  p_essays  INTEGER DEFAULT 0,
  p_quizzes INTEGER DEFAULT 0,
  p_minutes INTEGER DEFAULT 0
)
RETURNS user_gamification
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result    user_gamification;
  today     DATE := CURRENT_DATE;
  uid       UUID := auth.uid();
  new_streak INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'award_xp: not authenticated';
  END IF;

  INSERT INTO user_gamification (user_id) VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT CASE
           WHEN g.last_login_date = today                        THEN g.streak_days
           WHEN g.last_login_date = today - INTERVAL '1 day'     THEN g.streak_days + 1
           ELSE 1
         END
  INTO new_streak
  FROM user_gamification g
  WHERE g.user_id = uid;

  UPDATE user_gamification SET
    xp                  = xp + GREATEST(COALESCE(p_xp, 0), 0),
    lessons_completed   = lessons_completed + GREATEST(COALESCE(p_lessons, 0), 0),
    essays_submitted    = essays_submitted + GREATEST(COALESCE(p_essays, 0), 0),
    quizzes_completed   = quizzes_completed + GREATEST(COALESCE(p_quizzes, 0), 0),
    total_study_minutes = total_study_minutes + GREATEST(COALESCE(p_minutes, 0), 0),
    streak_days         = new_streak,
    longest_streak      = GREATEST(longest_streak, new_streak),
    last_login_date     = today
  WHERE user_id = uid
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------
-- replace_ai_calendar_plan() — swap the AI plan atomically
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.replace_ai_calendar_plan(JSONB);

CREATE OR REPLACE FUNCTION public.replace_ai_calendar_plan(p_events JSONB)
RETURNS SETOF calendar_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'replace_ai_calendar_plan: not authenticated';
  END IF;

  DELETE FROM calendar_events WHERE user_id = uid AND ai_generated = true;

  RETURN QUERY
  INSERT INTO calendar_events (
    user_id, title, description, start_time, end_time, type, subject, completed, ai_generated
  )
  SELECT
    uid,
    e->>'title',
    NULLIF(e->>'description', ''),
    (e->>'start_time')::TIMESTAMPTZ,
    (e->>'end_time')::TIMESTAMPTZ,
    COALESCE(e->>'type', 'study'),
    NULLIF(e->>'subject', ''),
    COALESCE((e->>'completed')::BOOLEAN, false),
    true
  FROM jsonb_array_elements(p_events) AS e
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_ai_calendar_plan(JSONB) TO authenticated;

-- ---------------------------------------------------------------------
-- promote_to_admin() — bootstrap helper (service_role only)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_to_admin(p_email TEXT)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result profiles;
BEGIN
  UPDATE profiles
  SET role = 'admin', tier = 'all-access'
  WHERE email = p_email
  RETURNING * INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'No profile found for %', p_email;
  END IF;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_to_admin(TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.promote_to_admin(TEXT) TO service_role;

-- =====================================================================
-- SECTION 7 — BACKFILL (safe on re-run)
-- =====================================================================

INSERT INTO profiles (id, email, full_name, role, tier)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       'student',
       'free'
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL AND u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_gamification (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================================
-- SECTION 8 — VERIFICATION
-- Re-run these SELECTs any time to confirm the install.
-- =====================================================================

SELECT 'TABLES' AS check_type, tablename AS name,
       CASE WHEN rowsecurity THEN 'RLS ON' ELSE 'RLS OFF' END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles','courses','modules','lessons','enrollments',
                    'lesson_progress','user_gamification','calendar_events')
UNION ALL
SELECT 'FUNCTIONS', p.proname, 'OK'
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('award_xp','is_admin','is_instructor','replace_ai_calendar_plan',
                    'promote_to_admin','create_profile_on_signup','update_updated_at')
UNION ALL
SELECT 'POLICIES', tablename || ' (' || COUNT(*)::TEXT || ')', 'OK'
FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename
ORDER BY check_type, name;

-- =====================================================================
-- POST-INSTALL
--
-- 1. Create your admin user (Dashboard → Authentication → Add user):
--       email: admin@ibemhal.ias
--
-- 2. Promote it:
--       UPDATE profiles SET role = 'admin', tier = 'all-access'
--       WHERE email = 'admin@ibemhal.ias';
--
-- 3. Confirm:
--       SELECT id, email, role, tier FROM profiles WHERE role = 'admin';
-- =====================================================================
