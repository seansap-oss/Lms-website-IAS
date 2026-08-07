export interface Level {
  index: number;
  name: string;
  minXp: number;
  icon: string;
  color: string;
}

export const LEVELS: Level[] = [
  { index: 0, name: "Novice Aspirant", minXp: 0, icon: "🌱", color: "from-slate-500 to-slate-600" },
  { index: 1, name: "Prelims Warrior", minXp: 500, icon: "📘", color: "from-emerald-500 to-teal-600" },
  { index: 2, name: "Mains Contender", minXp: 1500, icon: "✍️", color: "from-blue-500 to-indigo-600" },
  { index: 3, name: "Interview Ready", minXp: 3500, icon: "🎯", color: "from-purple-500 to-fuchsia-600" },
  { index: 4, name: "IAS Select", minXp: 7000, icon: "🏛️", color: "from-amber-500 to-orange-600" },
];

export const XP_RULES = {
  dailyLogin: 20,
  lessonCompleted: 50,
  quizCompleted: 40,
  answerSubmitted: 80,
  essaySubmitted: 150,
  studyMinute: 2,
  streakBonusPerDay: 10,
} as const;

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: (s: GamificationState) => boolean;
}

export interface GamificationState {
  xp: number;
  streakDays: number;
  lessonsCompleted: number;
  essaysSubmitted: number;
  quizzesCompleted: number;
  totalStudyMinutes: number;
  lastLoginDate: string;
  unlockedBadges: string[];
}

export const DEFAULT_STATE: GamificationState = {
  xp: 1240,
  streakDays: 47,
  lessonsCompleted: 34,
  essaysSubmitted: 6,
  quizzesCompleted: 12,
  totalStudyMinutes: 8520,
  lastLoginDate: "",
  unlockedBadges: [],
};

export const BADGES: Badge[] = [
  {
    id: "first-steps",
    name: "First Steps",
    icon: "👣",
    description: "Complete your first lesson",
    requirement: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: "streak-7",
    name: "7-Day Streak Warrior",
    icon: "🔥",
    description: "Study 7 days in a row",
    requirement: (s) => s.streakDays >= 7,
  },
  {
    id: "streak-30",
    name: "30-Day Iron Will",
    icon: "⚡",
    description: "Maintain a 30-day streak",
    requirement: (s) => s.streakDays >= 30,
  },
  {
    id: "streak-100",
    name: "Centurion",
    icon: "💯",
    description: "Maintain a 100-day streak",
    requirement: (s) => s.streakDays >= 100,
  },
  {
    id: "essay-master",
    name: "Essay Master",
    icon: "✍️",
    description: "Submit 5 essays for evaluation",
    requirement: (s) => s.essaysSubmitted >= 5,
  },
  {
    id: "quiz-champ",
    name: "Quiz Champion",
    icon: "🧠",
    description: "Complete 10 practice quizzes",
    requirement: (s) => s.quizzesCompleted >= 10,
  },
  {
    id: "lesson-25",
    name: "Syllabus Crusher",
    icon: "📚",
    description: "Complete 25 lessons",
    requirement: (s) => s.lessonsCompleted >= 25,
  },
  {
    id: "marathon",
    name: "Marathon Mind",
    icon: "🏃",
    description: "Log 100 hours of study time",
    requirement: (s) => s.totalStudyMinutes >= 6000,
  },
  {
    id: "night-owl",
    name: "Night Owl",
    icon: "🦉",
    description: "Reach 2,000 XP",
    requirement: (s) => s.xp >= 2000,
  },
  {
    id: "ias-select",
    name: "IAS Select",
    icon: "🏛️",
    description: "Reach the highest level (7,000 XP)",
    requirement: (s) => s.xp >= 7000,
  },
];

export function getLevel(xp: number): Level {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) current = l;
  return current;
}

export function getNextLevel(xp: number): Level | null {
  return LEVELS.find((l) => l.minXp > xp) ?? null;
}

export function getLevelProgress(xp: number): number {
  const current = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  const span = next.minXp - current.minXp;
  return Math.round(((xp - current.minXp) / span) * 100);
}

export function getUnlockedBadges(state: GamificationState): Badge[] {
  return BADGES.filter((b) => b.requirement(state));
}

export const MOTIVATIONAL_QUOTES: Array<{ text: string; author: string }> = [
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Do not pray for an easy life; pray for the strength to endure a difficult one.", author: "Bruce Lee" },
  { text: "Arise, awake, and stop not till the goal is reached.", author: "Swami Vivekananda" },
  { text: "You must be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "Constitution is not a mere lawyers' document; it is a vehicle of life.", author: "Dr. B.R. Ambedkar" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "Dream is not that which you see while sleeping; it is something that does not let you sleep.", author: "Dr. A.P.J. Abdul Kalam" },
];

export function getQuoteOfTheDay(): { text: string; author: string } {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return MOTIVATIONAL_QUOTES[dayIndex % MOTIVATIONAL_QUOTES.length];
}

export const FATIGUE_THRESHOLD_MINUTES = 90;
export const BREAK_DURATION_MINUTES = 10;

export function formatStudyClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
