-- Ibemhal IAS LMS - Supabase PostgreSQL Schema (Full)
-- Complete database schema with Row Level Security (RLS) policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'foundation' CHECK (category IN ('foundation', 'prelims', 'mains', 'optional', 'test-series')),
  level TEXT NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  instructor_id UUID REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MODULES TABLE
-- ============================================
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LESSONS TABLE (with transcription support)
-- ============================================
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'video' CHECK (content_type IN ('video', 'audio', 'text')),
  video_mux_id TEXT,
  audio_url TEXT,
  text_content TEXT,
  vtt_caption_url TEXT,
  transcript_text TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENROLLMENTS TABLE
-- ============================================
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- ============================================
-- LESSON PROGRESS TABLE
-- ============================================
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  watched_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ============================================
-- USER GAMIFICATION TABLE
-- ============================================
CREATE TABLE user_gamification (
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

-- ============================================
-- CALENDAR EVENTS TABLE
-- ============================================
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'study' CHECK (
    type IN ('study', 'revision', 'mock-test', 'live-class', 'answer-writing', 'current-affairs', 'break')
  ),
  subject TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT calendar_events_time_order CHECK (end_time > start_time)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_modules_course_id ON modules(course_id);
CREATE INDEX idx_lessons_module_id ON lessons(module_id);
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start ON calendar_events(user_id, start_time);
CREATE INDEX idx_calendar_events_ai ON calendar_events(user_id, ai_generated);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- COURSES
CREATE POLICY "Anyone can view published courses" ON courses FOR SELECT USING (is_published = true);
CREATE POLICY "Instructors can manage own courses" ON courses FOR ALL USING (auth.uid() = instructor_id);
CREATE POLICY "Admins can manage all courses" ON courses FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- MODULES
CREATE POLICY "Anyone can view modules of published courses" ON modules FOR SELECT USING (
  course_id IN (SELECT id FROM courses WHERE is_published = true)
);
CREATE POLICY "Instructors can manage own modules" ON modules FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE instructor_id = auth.uid())
);
CREATE POLICY "Admins can manage all modules" ON modules FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- LESSONS
CREATE POLICY "Enrolled students can view lessons" ON lessons FOR SELECT USING (
  module_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE c.is_published = true
    OR m.course_id IN (SELECT course_id FROM enrollments WHERE user_id = auth.uid())
  )
);
CREATE POLICY "Instructors can manage own lessons" ON lessons FOR ALL USING (
  module_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE c.instructor_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage all lessons" ON lessons FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- ENROLLMENTS
CREATE POLICY "Users can view own enrollments" ON enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own enrollments" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments" ON enrollments FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- LESSON PROGRESS
CREATE POLICY "Users can view own progress" ON lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON lesson_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress" ON lesson_progress FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- USER GAMIFICATION (owner-only, strict)
CREATE POLICY "Users can view own gamification" ON user_gamification FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gamification" ON user_gamification FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gamification" ON user_gamification FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all gamification" ON user_gamification FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- CALENDAR EVENTS (owner-only, strict)
CREATE POLICY "Users can view own events" ON calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON calendar_events FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON calendar_events FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all events" ON calendar_events FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_gamification_updated_at BEFORE UPDATE ON user_gamification
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );

  -- Every new profile starts with a gamification row.
  INSERT INTO user_gamification (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();

-- ============================================
-- RPC: atomic XP / streak award
-- ============================================
CREATE OR REPLACE FUNCTION award_xp(
  p_xp INTEGER DEFAULT 0,
  p_lessons INTEGER DEFAULT 0,
  p_essays INTEGER DEFAULT 0,
  p_quizzes INTEGER DEFAULT 0,
  p_minutes INTEGER DEFAULT 0
)
RETURNS user_gamification AS $$
DECLARE
  result user_gamification;
  today DATE := CURRENT_DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO user_gamification (user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE user_gamification SET
    xp = xp + GREATEST(p_xp, 0),
    lessons_completed = lessons_completed + GREATEST(p_lessons, 0),
    essays_submitted = essays_submitted + GREATEST(p_essays, 0),
    quizzes_completed = quizzes_completed + GREATEST(p_quizzes, 0),
    total_study_minutes = total_study_minutes + GREATEST(p_minutes, 0),
    streak_days = CASE
      WHEN last_login_date = today THEN streak_days
      WHEN last_login_date = today - INTERVAL '1 day' THEN streak_days + 1
      WHEN last_login_date IS NULL THEN 1
      ELSE 1
    END,
    longest_streak = GREATEST(
      longest_streak,
      CASE
        WHEN last_login_date = today THEN streak_days
        WHEN last_login_date = today - INTERVAL '1 day' THEN streak_days + 1
        ELSE 1
      END
    ),
    last_login_date = today
  WHERE user_id = auth.uid()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- BACKFILL (safe to re-run)
-- ============================================
INSERT INTO user_gamification (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;
