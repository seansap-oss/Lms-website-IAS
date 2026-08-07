export type CalendarView = "month" | "week" | "year" | "list";

export type EventCategory =
  | "study"
  | "revision"
  | "mock-test"
  | "live-class"
  | "answer-writing"
  | "current-affairs"
  | "break";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  start: string;
  end: string;
  allDay?: boolean;
  subject?: string;
  completed?: boolean;
  aiGenerated?: boolean;
}

export interface StudyPlanRequest {
  targetExam: "UPSC Prelims" | "UPSC Mains" | "MPSC" | "State PSC";
  targetYear: number;
  targetDate?: string;
  dailyHours: number;
  topics: string[];
  optionalSubject?: string;
  startDate: string;
  weeks: number;
}

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; dot: string; chip: string; ring: string }
> = {
  study: {
    label: "Study",
    dot: "bg-blue-500",
    chip: "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25",
    ring: "border-l-blue-500",
  },
  revision: {
    label: "Revision",
    dot: "bg-amber-500",
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
    ring: "border-l-amber-500",
  },
  "mock-test": {
    label: "Mock Test",
    dot: "bg-red-500",
    chip: "bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/25",
    ring: "border-l-red-500",
  },
  "live-class": {
    label: "Live Class",
    dot: "bg-purple-500",
    chip: "bg-purple-500/12 text-purple-700 dark:text-purple-300 border-purple-500/25",
    ring: "border-l-purple-500",
  },
  "answer-writing": {
    label: "Answer Writing",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    ring: "border-l-emerald-500",
  },
  "current-affairs": {
    label: "Current Affairs",
    dot: "bg-cyan-500",
    chip: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
    ring: "border-l-cyan-500",
  },
  break: {
    label: "Break",
    dot: "bg-slate-400",
    chip: "bg-slate-400/12 text-slate-600 dark:text-slate-300 border-slate-400/25",
    ring: "border-l-slate-400",
  },
};
