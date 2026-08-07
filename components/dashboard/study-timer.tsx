"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Timer, Brain, Coffee, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FATIGUE_THRESHOLD_MINUTES,
  BREAK_DURATION_MINUTES,
  formatStudyClock,
} from "@/lib/gamification";

interface StudyTimerProps {
  onXpEarned?: (xp: number) => void;
}

export function StudyTimer({ onXpEarned }: StudyTimerProps) {
  const [running, setRunning] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [showBreakModal, setShowBreakModal] = React.useState(false);
  const [breakSeconds, setBreakSeconds] = React.useState(0);
  const [onBreak, setOnBreak] = React.useState(false);
  const [sessionsToday, setSessionsToday] = React.useState(0);
  const lastXpMinuteRef = React.useRef(0);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  React.useEffect(() => {
    if (!onBreak) return;
    const id = setInterval(() => setBreakSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [onBreak]);

  React.useEffect(() => {
    const minutes = Math.floor(seconds / 60);
    if (minutes > lastXpMinuteRef.current) {
      lastXpMinuteRef.current = minutes;
      onXpEarned?.(2);
    }
    if (minutes >= FATIGUE_THRESHOLD_MINUTES && minutes % FATIGUE_THRESHOLD_MINUTES === 0 && seconds % 60 === 0) {
      setRunning(false);
      setShowBreakModal(true);
    }
  }, [seconds, onXpEarned]);

  React.useEffect(() => {
    if (onBreak && breakSeconds >= BREAK_DURATION_MINUTES * 60) {
      setOnBreak(false);
      setBreakSeconds(0);
      setShowBreakModal(false);
      setSeconds(0);
      lastXpMinuteRef.current = 0;
      setRunning(true);
    }
  }, [breakSeconds, onBreak]);

  const minutes = Math.floor(seconds / 60);
  const fatiguePercent = Math.min(100, (minutes / FATIGUE_THRESHOLD_MINUTES) * 100);
  const fatigueColor =
    fatiguePercent >= 90 ? "bg-red-500" : fatiguePercent >= 60 ? "bg-amber-500" : "bg-green-500";

  const handleReset = () => {
    if (seconds > 60) setSessionsToday((n) => n + 1);
    setRunning(false);
    setSeconds(0);
    lastXpMinuteRef.current = 0;
  };

  const startBreak = () => {
    setOnBreak(true);
    setBreakSeconds(0);
  };

  const skipBreak = () => {
    setShowBreakModal(false);
    setOnBreak(false);
    setBreakSeconds(0);
    setSeconds(0);
    lastXpMinuteRef.current = 0;
    setRunning(true);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Timer className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Study Session</p>
                <p className="text-xs text-muted-foreground">
                  {sessionsToday} session{sessionsToday === 1 ? "" : "s"} today
                </p>
              </div>
            </div>
            {running && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Active
              </span>
            )}
          </div>

          <div className="text-center mb-4">
            <p className="text-4xl font-bold font-mono tabular-nums tracking-tight">
              {formatStudyClock(seconds)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">+{minutes * 2} XP earned this session</p>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <Brain className="h-3 w-3" /> Focus Capacity
              </span>
              <span className="font-medium">
                {minutes}/{FATIGUE_THRESHOLD_MINUTES} min
              </span>
            </div>
            <Progress value={fatiguePercent} indicatorClassName={fatigueColor} />
            {fatiguePercent >= 60 && fatiguePercent < 100 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                Approaching fatigue threshold — a break will be suggested soon.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setRunning((r) => !r)}
              className="flex-1"
              variant={running ? "outline" : "default"}
            >
              {running ? (
                <>
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> {seconds > 0 ? "Resume" : "Start"}
                </>
              )}
            </Button>
            <Button onClick={handleReset} variant="ghost" size="icon" aria-label="Reset timer">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showBreakModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md"
            >
              <Card className="relative overflow-hidden border-2 border-amber-400/40">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10" />
                <button
                  onClick={skipBreak}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted transition-colors z-10"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
                <CardContent className="relative p-8 text-center">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
                    className="text-6xl mb-4"
                  >
                    🧠
                  </motion.div>

                  {!onBreak ? (
                    <>
                      <h3 className="text-xl font-bold mb-2">Great focus! 🎉</h3>
                      <p className="text-muted-foreground mb-1">
                        You&apos;ve studied for <strong>{minutes} minutes</strong> straight.
                      </p>
                      <p className="text-muted-foreground mb-6">
                        Take a 10-minute stretch break to keep your retention high ✨
                      </p>
                      <div className="grid grid-cols-3 gap-3 mb-6 text-left">
                        {[
                          { icon: "🚶", label: "Walk" },
                          { icon: "💧", label: "Hydrate" },
                          { icon: "👀", label: "Rest eyes" },
                        ].map((t) => (
                          <div key={t.label} className="rounded-lg bg-muted/60 p-3 text-center">
                            <div className="text-2xl mb-1">{t.icon}</div>
                            <div className="text-xs text-muted-foreground">{t.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={startBreak} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                          <Coffee className="mr-2 h-4 w-4" />
                          Start 10-min Break
                        </Button>
                        <Button onClick={skipBreak} variant="outline">
                          Keep Going
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold mb-2">Break in progress</h3>
                      <p className="text-4xl font-bold font-mono tabular-nums my-4">
                        {formatStudyClock(BREAK_DURATION_MINUTES * 60 - breakSeconds)}
                      </p>
                      <Progress
                        value={(breakSeconds / (BREAK_DURATION_MINUTES * 60)) * 100}
                        indicatorClassName="bg-amber-500"
                        className="mb-4"
                      />
                      <p className="text-sm text-muted-foreground mb-4">
                        Step away from the screen. Your session resumes automatically.
                      </p>
                      <Button onClick={skipBreak} variant="outline" className="w-full">
                        End Break Early
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
