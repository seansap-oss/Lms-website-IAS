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

export type UserTier =
  | "free"
  | "foundation"
  | "prelims"
  | "mains"
  | "optional"
  | "all-access";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tier: UserTier;
  avatar_url: string | null;
  phone: string | null;
  target_exam: string | null;
  target_year: number | null;
  current_device_id: string | null;
  current_device_label: string | null;
  device_bound_at: string | null;
  last_active_at: string | null;
  device_switch_count: number;
  created_at: string;
  updated_at: string;
};

export type DeviceAction = "bound" | "rebound" | "evicted" | "released" | "blocked";

export type DeviceSessionRow = {
  id: string;
  user_id: string;
  device_id: string;
  device_label: string | null;
  platform: string | null;
  user_agent: string | null;
  action: DeviceAction;
  created_at: string;
};
export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string | null;
  price: number;
  category: CourseCategory;
  level: CourseLevel;
  required_tier: UserTier;
  price_inr: number;
  discounted_price_inr: number | null;
  duration_months: number | null;
  short_tagline: string | null;
  display_order: number;
  instructor_id: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
export type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
};
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
};
export type DiscountType = "percentage" | "flat";
export type EnrolledVia =
  | "upi_auto"
  | "admin_manual"
  | "cash_offline"
  | "scholarship"
  | "trial";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export type DiscountCodeRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  min_purchase_inr: number;
  max_discount_inr: number | null;
  applies_to_course_id: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EnrollmentRow = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  amount_paid: number;
  discount_code_used: string | null;
  enrolled_via: EnrolledVia;
  upi_reference: string | null;
  payment_status: PaymentStatus;
  granted_by: string | null;
  notes: string | null;
  created_at: string;
};

export type SalesAnalyticsRow = {
  total_students: number;
  total_enrollments: number;
  total_revenue_inr: number;
  active_courses: number;
  upi_enrollments: number;
  manual_enrollments: number;
  active_discount_codes: number;
  revenue_this_month_inr: number;
};
export type LessonProgressRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  watched_seconds: number;
  updated_at: string;
};
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
};
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
};
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
      enrollments: DefaultedTable<EnrollmentRow, "user_id" | "course_id">;
      lesson_progress: Table<LessonProgressRow>;
      user_gamification: DefaultedTable<UserGamificationRow, "user_id">;
      calendar_events: DefaultedTable<
        CalendarEventRow,
        "user_id" | "title" | "start_time" | "end_time"
      >;
      discount_codes: DefaultedTable<DiscountCodeRow, "code">;
      device_sessions: DefaultedTable<DeviceSessionRow, "user_id" | "device_id">;
    };
    Views: {
      sales_analytics: { Row: SalesAnalyticsRow; Relationships: [] };
    } & Record<string, { Row: Record<string, unknown>; Relationships: [] }>;
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
      replace_ai_calendar_plan: {
        Args: { p_events: Json };
        Returns: CalendarEventRow[];
      };
      is_admin: {
        Args: { uid?: string };
        Returns: boolean;
      };
      is_instructor: {
        Args: { uid?: string };
        Returns: boolean;
      };
      validate_discount_code: {
        Args: { p_code: string; p_course_id: string };
        Returns: Json;
      };
      redeem_enrollment: {
        Args: {
          p_course_id: string;
          p_code?: string | null;
          p_via?: string;
          p_reference?: string | null;
        };
        Returns: Json;
      };
      admin_grant_entitlement: {
        Args: {
          p_user_id: string;
          p_course_id: string;
          p_via?: string;
          p_amount?: number;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      admin_revoke_entitlement: {
        Args: { p_user_id: string; p_course_id: string };
        Returns: Json;
      };
      course_effective_price: {
        Args: { p_course_id: string };
        Returns: number;
      };
      claim_device: {
        Args: {
          p_device_id: string;
          p_device_label?: string | null;
          p_platform?: string | null;
          p_user_agent?: string | null;
        };
        Returns: Json;
      };
      verify_device: {
        Args: { p_device_id: string };
        Returns: Json;
      };
      release_device: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_reset_device: {
        Args: { p_user_id: string };
        Returns: Json;
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
