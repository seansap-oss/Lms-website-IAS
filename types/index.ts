export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "instructor" | "admin";
  avatar_url?: string;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  price: number;
  category: "foundation" | "prelims" | "mains" | "optional" | "test-series";
  level: "beginner" | "intermediate" | "advanced";
  instructor_id?: string;
  is_published?: boolean;
  created_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  description?: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content_type: "video" | "audio" | "text";
  video_mux_id?: string;
  audio_url?: string;
  text_content?: string;
  vtt_caption_url?: string;
  transcript_text?: string;
  duration_seconds: number;
  is_free_preview: boolean;
  order_index: number;
  description?: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  watched_seconds: number;
  updated_at: string;
}

export interface Topper {
  id: string;
  name: string;
  rank: string;
  exam: string;
  year: number;
  quote: string;
  avatar_url: string;
}

export interface FeePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  emi_monthly: number;
  emi_months: number;
  features: string[];
  popular?: boolean;
}

export interface Facility {
  id: string;
  name: string;
  description: string;
  image_url: string;
  location: string;
}
