export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = "student" | "instructor" | "admin";
export type CourseCategory = "foundation" | "prelims" | "mains" | "optional" | "test-series";
export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type LessonContentType = "video" | "audio" | "text";
export type CalendarEventType =
  | "study"
  | "revision"
  | "mock-test"
  | "live-class"
  | "answer-writing"
  | "current-affairs"
  | "break";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string | null;
  price: number;
  category: CourseCategory;
  level: CourseLevel;
  instructor_id: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  content_type: LessonContentType;
  video_mux_id: string | null;
  audio_url: string | null;
  text_content: string | null;
  vtt_caption_url: string | null;
  transcript_text: string | null;
  duration_seconds: number;
  is_free_preview: boolean;
  order_index: number;
  created_at: string;
}

export type EnrollmentRow = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

export type LessonProgressRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  watched_seconds: number;
  updated_at: string;
}

export type UserGamificationRow = {
  user_id: string;
  xp: number;
  streak_days: number;
  longest_streak: number;
  lessons_completed: number;
  essays_submitted: number;
  quizzes_completed: number;
  total_study_minutes: number;
  last_login_date: string | null;
  unlocked_badges: string[];
  created_at: string;
  updated_at: string;
}

export type CalendarEventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  type: CalendarEventType;
  subject: string | null;
  completed: boolean;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

/** Server-generated columns are optional on insert. */
type Generated = "id" | "created_at" | "updated_at";

type Table<Row extends object> = {
  Row: Row;
  Insert: Omit<Row, Extract<keyof Row, Generated>> &
    Partial<Pick<Row, Extract<keyof Row, Generated>>>;
  Update: Partial<Row>;
  Relationships: [];
};

/** Tables whose non-key columns all have DB defaults. */
type DefaultedTable<Row extends object, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      courses: Table<CourseRow>;
      modules: Table<ModuleRow>;
      lessons: Table<LessonRow>;
      enrollments: Table<EnrollmentRow>;
      lesson_progress: Table<LessonProgressRow>;
      user_gamification: DefaultedTable<UserGamificationRow, "user_id">;
      calendar_events: DefaultedTable<
        CalendarEventRow,
        "user_id" | "title" | "start_time" | "end_time"
      >;
    };
    Views: Record<
      string,
      { Row: Record<string, unknown>; Relationships: [] }
    >;
    Functions: {
      award_xp: {
        Args: {
          p_xp?: number;
          p_lessons?: number;
          p_essays?: number;
          p_quizzes?: number;
          p_minutes?: number;
        };
        Returns: UserGamificationRow;
      };
    };
    Enums: {
      user_role: UserRole;
      course_category: CourseCategory;
      course_level: CourseLevel;
      lesson_content_type: LessonContentType;
      calendar_event_type: CalendarEventType;
    };
    CompositeTypes: Record<string, never>;
  };
};
