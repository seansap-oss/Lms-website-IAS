"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Flame,
  TrendingUp,
  Clock,
  PlayCircle,
  Award,
  Calendar,
  ArrowRight,
  GraduationCap,
  Bot,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StudyTimer } from "@/components/dashboard/study-timer";
import { XpLevelCard } from "@/components/dashboard/xp-level-card";
import { BadgesCard } from "@/components/dashboard/badges-card";
import { QuoteCard } from "@/components/dashboard/quote-card";
import { courses, sampleLessons } from "@/lib/mock-data";
import { DEFAULT_STATE, type GamificationState } from "@/lib/gamification";
import {
  loadGamification,
  awardXp,
  registerDailyLogin,
  type PersistenceMode,
} from "@/lib/supabase/gamification-store";
import Link from "next/link";

const enrolledCourses = courses.slice(0, 3);

export default function DashboardPage() {
  const [game, setGame] = React.useState<GamificationState>(DEFAULT_STATE);
  const [mode, setMode] = React.useState<PersistenceMode>("local");
  const [xpToast, setXpToast] = React.useState<number | null>(null);
  const pendingRef = React.useRef(0);
  const flushTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const { state, mode: m } = await loadGamification();
      if (!alive) return;
      setMode(m);
      const withLogin = await registerDailyLogin(state, m);
      if (alive) setGame(withLogin);
    })();
    return () => {
      alive = false;
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);

  // Optimistic UI + debounced persistence so per-minute XP ticks
  // do not generate one network round-trip each.
  const addXp = React.useCallback(
    (amount: number) => {
      setGame((g) => ({ ...g, xp: g.xp + amount }));
      setXpToast(amount);
      setTimeout(() => setXpToast(null), 1800);

      pendingRef.current += amount;
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(async () => {
        const batched = pendingRef.current;
        pendingRef.current = 0;
        if (!batched) return;
        setGame((current) => {
          void awardXp(current, { xp: 0, minutes: Math.round(batched / 2) }, mode).then(
            (persisted) => setGame(persisted)
          );
          return current;
        });
      }, 5000);
    },
    [mode]
  );

  const overallProgress = Math.round((game.lessonsCompleted / (sampleLessons.length * 5)) * 100);
  const studyHours = Math.round(game.totalStudyMinutes / 60);

  const stats = [
    { icon: Flame, value: game.streakDays, label: "Day Streak", gradient: "from-orange-500 to-red-500" },
    { icon: TrendingUp, value: `${overallProgress}%`, label: "Syllabus Coverage", gradient: "from-blue-500 to-indigo-500" },
    { icon: BookOpen, value: game.lessonsCompleted, label: "Lessons Done", gradient: "from-green-500 to-emerald-500" },
    { icon: Clock, value: `${studyHours}h`, label: "Study Time", gradient: "from-purple-500 to-pink-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {xpToast !== null && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-20 right-6 z-[90] rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg flex items-center gap-1.5"
        >
          <Sparkles className="h-4 w-4" />+{xpToast} XP
        </motion.div>
      )}

      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">Ibemhal</span>
          </Link>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1 hidden sm:flex">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {game.xp.toLocaleString()} XP
            </Badge>
            <Link href="/ai-tutor" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              AI Tutor
            </Link>
            <Avatar fallback="S" size="sm" />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back, <span className="gradient-text">Student</span>
          </h1>
          <p className="text-muted-foreground">Continue your preparation journey</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className={`bg-gradient-to-br ${stat.gradient} border-0 text-white`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-white/80">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <XpLevelCard xp={game.xp} />

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                Continue Learning
              </h2>
              <div className="space-y-4">
                {enrolledCourses.map((course, i) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <Card className="glass-card-hover overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-48 h-32 sm:h-auto bg-gradient-to-br from-blue-500 to-purple-600 relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="h-full w-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold leading-tight">{course.title}</h3>
                            <Badge variant="outline" className="shrink-0">{course.category}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 24 lessons</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Enrolled Jan 2025</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress value={45 + i * 15} className="flex-1" />
                            <span className="text-xs text-muted-foreground">{45 + i * 15}%</span>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Link href={`/learn/${course.slug}`}>
                              <Button size="sm" variant="ghost" className="text-primary">
                                Resume <ArrowRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            <BadgesCard state={game} />
          </div>

          <div className="space-y-6">
            <StudyTimer onXpEarned={addXp} />

            <QuoteCard />

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Weekly Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>Complete 5 lessons</span>
                    <span className="text-muted-foreground">3/5</span>
                  </div>
                  <Progress value={60} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>Write 3 answers</span>
                    <span className="text-muted-foreground">1/3</span>
                  </div>
                  <Progress value={33} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>Read current affairs</span>
                    <span className="text-muted-foreground">7/7</span>
                  </div>
                  <Progress value={100} indicatorClassName="bg-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 text-white">
              <CardContent className="p-6 text-center">
                <Bot className="h-10 w-10 mx-auto mb-3 text-blue-200" />
                <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
                <p className="text-sm text-blue-100 mb-4">
                  Ask our AI tutor anything about your preparation
                </p>
                <Link href="/ai-tutor">
                  <Button variant="secondary" size="sm" className="w-full">
                    Open AI Tutor
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
