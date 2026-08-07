import {
  addDays,
  set,
  startOfWeek,
  formatISO,
} from "date-fns";
import type { CalendarEvent, EventCategory } from "@/types/calendar";

function at(base: Date, hour: number, minute = 0) {
  return formatISO(set(base, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 }));
}

const SEED: Array<{
  dayOffset: number;
  hour: number;
  durationH: number;
  title: string;
  category: EventCategory;
  subject?: string;
  description?: string;
}> = [
  { dayOffset: 0, hour: 6, durationH: 1, title: "The Hindu — Editorial Analysis", category: "current-affairs", subject: "Current Affairs" },
  { dayOffset: 0, hour: 9, durationH: 2, title: "Polity: Fundamental Rights (Art. 12-35)", category: "study", subject: "Indian Polity" },
  { dayOffset: 0, hour: 15, durationH: 1, title: "Answer Writing — GS-2 Governance", category: "answer-writing", subject: "GS Paper II" },
  { dayOffset: 0, hour: 19, durationH: 1, title: "Revision: Yesterday's Notes", category: "revision" },

  { dayOffset: 1, hour: 6, durationH: 1, title: "PIB & Yojana Digest", category: "current-affairs", subject: "Current Affairs" },
  { dayOffset: 1, hour: 10, durationH: 2, title: "Modern History: 1857 to 1947", category: "study", subject: "History" },
  { dayOffset: 1, hour: 18, durationH: 2, title: "Live Class — Economy with Faculty", category: "live-class", subject: "Indian Economy" },

  { dayOffset: 2, hour: 9, durationH: 3, title: "Prelims Mock Test #14 (GS Paper I)", category: "mock-test", subject: "Prelims", description: "Full-length 100 questions, 2 hours + 1 hour analysis" },
  { dayOffset: 2, hour: 16, durationH: 1, title: "Mock Test Analysis & Error Log", category: "revision" },

  { dayOffset: 3, hour: 7, durationH: 2, title: "Geography: Climatology & Monsoon", category: "study", subject: "Geography" },
  { dayOffset: 3, hour: 15, durationH: 1, title: "Essay Practice — Ethics & Governance", category: "answer-writing", subject: "Essay" },
  { dayOffset: 3, hour: 20, durationH: 1, title: "Break — Walk & Reflection", category: "break" },

  { dayOffset: 4, hour: 9, durationH: 2, title: "Economy: Budget & Fiscal Policy", category: "study", subject: "Indian Economy" },
  { dayOffset: 4, hour: 18, durationH: 2, title: "Live Class — Optional Subject", category: "live-class", subject: "Optional" },

  { dayOffset: 5, hour: 10, durationH: 3, title: "Weekly Revision — All Subjects", category: "revision" },
  { dayOffset: 5, hour: 16, durationH: 1, title: "CSAT Practice Set", category: "mock-test", subject: "CSAT" },

  { dayOffset: 6, hour: 9, durationH: 2, title: "Ethics: Case Studies (GS-4)", category: "study", subject: "GS Paper IV" },
  { dayOffset: 6, hour: 15, durationH: 1, title: "Monthly Current Affairs Compilation", category: "current-affairs" },

  { dayOffset: 8, hour: 9, durationH: 2, title: "Science & Tech: Space Missions", category: "study", subject: "Science & Tech" },
  { dayOffset: 10, hour: 9, durationH: 3, title: "Mains Mock — GS Paper III", category: "mock-test", subject: "Mains" },
  { dayOffset: 12, hour: 10, durationH: 2, title: "Environment & Biodiversity", category: "study", subject: "Environment" },
  { dayOffset: 14, hour: 9, durationH: 2, title: "International Relations — Neighbourhood", category: "study", subject: "GS Paper II" },
  { dayOffset: 16, hour: 18, durationH: 2, title: "Live Class — Interview Guidance", category: "live-class" },
  { dayOffset: 20, hour: 9, durationH: 3, title: "Prelims Mock Test #15", category: "mock-test", subject: "Prelims" },
  { dayOffset: 24, hour: 10, durationH: 2, title: "Art & Culture Revision", category: "revision", subject: "Art & Culture" },
  { dayOffset: 28, hour: 9, durationH: 3, title: "Full Syllabus Revision Sprint", category: "revision" },

  { dayOffset: -3, hour: 9, durationH: 2, title: "Polity: DPSP & Fundamental Duties", category: "study", subject: "Indian Polity" },
  { dayOffset: -6, hour: 9, durationH: 3, title: "Prelims Mock Test #13", category: "mock-test", subject: "Prelims" },
  { dayOffset: -10, hour: 10, durationH: 2, title: "Ancient History: Indus Valley", category: "study", subject: "History" },
];

export function buildSeedEvents(reference: Date = new Date()): CalendarEvent[] {
  const weekStart = startOfWeek(reference, { weekStartsOn: 1 });

  return SEED.map((s, i) => {
    const day = addDays(weekStart, s.dayOffset);
    return {
      id: `seed-${i}`,
      title: s.title,
      description: s.description,
      category: s.category,
      subject: s.subject,
      start: at(day, s.hour),
      end: at(day, s.hour + s.durationH),
      completed: s.dayOffset < 0,
      aiGenerated: false,
    };
  });
}

export const UPSC_TOPIC_PRESETS = [
  "Indian Polity",
  "Modern History",
  "Ancient & Medieval History",
  "Art & Culture",
  "Geography",
  "Indian Economy",
  "Environment & Ecology",
  "Science & Technology",
  "International Relations",
  "Ethics (GS-4)",
  "Internal Security",
  "Disaster Management",
  "Current Affairs",
  "CSAT",
];
