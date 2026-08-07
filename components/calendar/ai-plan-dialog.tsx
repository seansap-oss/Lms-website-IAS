"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatISO } from "date-fns";
import { Sparkles, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UPSC_TOPIC_PRESETS } from "@/lib/calendar-data";
import type { CalendarEvent } from "@/types/calendar";
import { apiFetch } from "@/lib/api-base";

const EXAMS = ["UPSC Prelims", "UPSC Mains", "MPSC", "State PSC"] as const;

export function AiPlanDialog({
  open,
  onClose,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  onGenerated: (events: CalendarEvent[], meta: { title: string; strategy: string; servedBy: string }) => void;
}) {
  const [targetExam, setTargetExam] = React.useState<(typeof EXAMS)[number]>("UPSC Prelims");
  const [targetYear, setTargetYear] = React.useState(new Date().getFullYear() + 1);
  const [dailyHours, setDailyHours] = React.useState(6);
  const [weeks, setWeeks] = React.useState(4);
  const [optionalSubject, setOptionalSubject] = React.useState("");
  const [topics, setTopics] = React.useState<string[]>([
    "Indian Polity",
    "Modern History",
    "Geography",
    "Indian Economy",
    "Environment & Ecology",
  ]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const toggleTopic = (t: string) =>
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/ai/calendar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetExam,
          targetYear,
          dailyHours,
          weeks,
          topics,
          optionalSubject: optionalSubject || undefined,
          startDate: formatISO(new Date(), { representation: "date" }),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Generation failed");
        return;
      }
      onGenerated(json.events as CalendarEvent[], {
        title: json.planTitle,
        strategy: json.strategy,
        servedBy: json.servedBy,
      });
      onClose();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg"
          >
            <Card className="rounded-b-none sm:rounded-b-xl max-h-[88vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Generate AI UPSC Study Plan</p>
                    <p className="text-[11px] text-muted-foreground">Powered by the 6-tier AI chain</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <CardContent className="p-5 space-y-4 overflow-y-auto">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Target Exam</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {EXAMS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setTargetExam(e)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                          targetExam === e
                            ? "border-primary bg-primary/5 text-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={targetYear}
                      onChange={(e) => setTargetYear(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hours/day</Label>
                    <Input
                      type="number"
                      min={2}
                      max={14}
                      value={dailyHours}
                      onChange={(e) => setDailyHours(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weeks</Label>
                    <Input
                      type="number"
                      min={1}
                      max={16}
                      value={weeks}
                      onChange={(e) => setWeeks(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Optional Subject (if any)</Label>
                  <Input
                    value={optionalSubject}
                    onChange={(e) => setOptionalSubject(e.target.value)}
                    placeholder="e.g., Geography, PSIR, Anthropology"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Syllabus Topics</Label>
                    <span className="text-[11px] text-muted-foreground">{topics.length} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {UPSC_TOPIC_PRESETS.map((t) => {
                      const on = topics.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => toggleTopic(t)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {on && <CheckCircle2 className="h-2.5 w-2.5 inline mr-1" />}
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[11px] text-muted-foreground">
                    The planner applies <strong>spaced repetition</strong> (D+3, D+10, D+30), a weekly
                    full-length mock with error-log analysis, daily current affairs, and four
                    answer-writing sessions per week.
                  </p>
                </div>
              </CardContent>

              <div className="p-5 pt-0 shrink-0 pb-safe">
                <Button onClick={generate} disabled={loading || !topics.length} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Building your {weeks}-week plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Study Plan
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
