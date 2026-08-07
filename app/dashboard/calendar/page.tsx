"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  addMonths,
  addWeeks,
  addYears,
  addDays,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  parseISO,
  startOfWeek,
  endOfWeek,
  formatISO,
  set,
} from "date-fns";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  Grid3x3,
  List as ListIcon,
  Sparkles,
  Plus,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { YearView } from "@/components/calendar/year-view";
import { ListView } from "@/components/calendar/list-view";
import { AiPlanDialog } from "@/components/calendar/ai-plan-dialog";
import { buildSeedEvents } from "@/lib/calendar-data";
import { CATEGORY_META, type CalendarEvent, type CalendarView } from "@/types/calendar";
import { hapticSuccess } from "@/lib/native";

const VIEWS: Array<{ id: CalendarView; label: string; icon: React.ElementType }> = [
  { id: "month", label: "Month", icon: CalendarDays },
  { id: "week", label: "Week", icon: CalendarRange },
  { id: "year", label: "Year", icon: Grid3x3 },
  { id: "list", label: "List", icon: ListIcon },
];

export default function CalendarPage() {
  const [view, setView] = React.useState<CalendarView>("month");
  const [previousView, setPreviousView] = React.useState<CalendarView>("month");
  const [cursor, setCursor] = React.useState(() => new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [listScope, setListScope] = React.useState<"day" | "month" | "week" | "year">("month");
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [planBanner, setPlanBanner] = React.useState<{ title: string; strategy: string; servedBy: string } | null>(null);
  const [detail, setDetail] = React.useState<CalendarEvent | null>(null);

  React.useEffect(() => {
    setEvents(buildSeedEvents(new Date()));
  }, []);

  const goToList = () => {
    setPreviousView(view);
    if (view === "month") setListScope(selectedDate ? "day" : "month");
    else if (view === "week") setListScope("week");
    else if (view === "year") setListScope("year");
    setView("list");
  };

  const switchView = (v: CalendarView) => {
    if (v === "list") return goToList();
    setPreviousView(view);
    setView(v);
  };

  const navigate = (dir: -1 | 1) => {
    setCursor((c) => {
      if (view === "month") return addMonths(c, dir);
      if (view === "week") return addWeeks(c, dir);
      if (view === "year") return addYears(c, dir);
      if (listScope === "day") return addDays(c, dir);
      if (listScope === "week") return addWeeks(c, dir);
      if (listScope === "year") return addYears(c, dir);
      return addMonths(c, dir);
    });
    setSelectedDate(null);
  };

  const scopedEvents = React.useMemo(() => {
    if (view === "list") {
      if (listScope === "day" && selectedDate)
        return events.filter((e) => isSameDay(parseISO(e.start), selectedDate));
      if (listScope === "week") {
        const s = startOfWeek(cursor, { weekStartsOn: 1 });
        const en = endOfWeek(cursor, { weekStartsOn: 1 });
        return events.filter((e) => {
          const d = parseISO(e.start);
          return d >= s && d <= en;
        });
      }
      if (listScope === "year") return events.filter((e) => isSameYear(parseISO(e.start), cursor));
      return events.filter((e) => isSameMonth(parseISO(e.start), cursor));
    }
    return events;
  }, [view, listScope, selectedDate, cursor, events]);

  const scopeLabel = React.useMemo(() => {
    if (listScope === "day" && selectedDate) return format(selectedDate, "d MMMM yyyy");
    if (listScope === "week")
      return `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM")} – ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "d MMM yyyy")}`;
    if (listScope === "year") return format(cursor, "yyyy");
    return format(cursor, "MMMM yyyy");
  }, [listScope, selectedDate, cursor]);

  const headerLabel = React.useMemo(() => {
    if (view === "week")
      return `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM")} – ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "d MMM yyyy")}`;
    if (view === "year") return format(cursor, "yyyy");
    if (view === "list") return scopeLabel;
    return format(cursor, "MMMM yyyy");
  }, [view, cursor, scopeLabel]);

  const toggleComplete = (id: string) =>
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e)));

  const addQuickEvent = (date: Date, hour: number) => {
    const start = set(date, { hours: hour, minutes: 0, seconds: 0, milliseconds: 0 });
    const newEvent: CalendarEvent = {
      id: `manual-${Date.now()}`,
      title: "New Study Block",
      category: "study",
      start: formatISO(start),
      end: formatISO(set(date, { hours: hour + 1, minutes: 0, seconds: 0, milliseconds: 0 })),
      completed: false,
    };
    setEvents((prev) => [...prev, newEvent]);
    setDetail(newEvent);
  };

  const handleGenerated = (
    generated: CalendarEvent[],
    meta: { title: string; strategy: string; servedBy: string }
  ) => {
    setEvents((prev) => [...prev.filter((e) => !e.aiGenerated), ...generated]);
    setPlanBanner(meta);
    hapticSuccess();
  };

  const upcoming = React.useMemo(
    () =>
      [...events]
        .filter((e) => !e.completed && parseISO(e.start) >= new Date())
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 3),
    [events]
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b pt-safe">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-semibold flex-1">Study Calendar</h1>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
              <Sparkles className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">AI Study Plan</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <button
              onClick={() => {
                setCursor(new Date());
                setSelectedDate(null);
              }}
              className="text-sm font-semibold hover:text-primary transition-colors truncate"
            >
              {headerLabel}
            </button>

            <div className="flex-1" />

            <div className="inline-flex rounded-lg bg-muted p-0.5">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => switchView(v.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 sm:px-2.5 py-1.5 text-xs font-medium transition-colors",
                    view === v.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <v.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {planBanner && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
              <CardContent className="p-4 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{planBanner.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{planBanner.strategy}</p>
                  <Badge variant="outline" className="mt-2 text-[10px]">{planBanner.servedBy}</Badge>
                </div>
                <button onClick={() => setPlanBanner(null)} className="p-1 rounded hover:bg-muted">
                  <X className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {view !== "list" && upcoming.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upcoming.map((e) => (
              <Card key={e.id} className={cn("border-l-2", CATEGORY_META[e.category].ring)}>
                <CardContent className="p-3">
                  <p className="text-xs font-medium truncate">{e.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(e.start), "EEE d MMM · HH:mm")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {view === "month" && (
          <MonthView
            cursor={cursor}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpenDay={(d) => {
              setSelectedDate(d);
              setListScope("day");
              setPreviousView("month");
              setView("list");
            }}
          />
        )}

        {view === "week" && (
          <WeekView
            cursor={cursor}
            events={events}
            onSelectSlot={addQuickEvent}
            onSelectEvent={setDetail}
          />
        )}

        {view === "year" && (
          <YearView
            cursor={cursor}
            events={events}
            onSelectMonth={(m) => {
              setCursor(m);
              setView("month");
            }}
            onSelectDay={(d) => {
              setCursor(d);
              setSelectedDate(d);
              setListScope("day");
              setView("list");
            }}
          />
        )}

        {view === "list" && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setView(previousView === "list" ? "month" : previousView)}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back to {previousView === "list" ? "Month" : previousView}
              </Button>
              <div className="inline-flex rounded-lg bg-muted p-0.5">
                {(["day", "week", "month", "year"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setListScope(s);
                      if (s === "day" && !selectedDate) setSelectedDate(cursor);
                    }}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                      listScope === s ? "bg-background shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <ListView
              events={scopedEvents}
              scopeLabel={scopeLabel}
              onToggleComplete={toggleComplete}
              onSelectEvent={setDetail}
            />
          </>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {Object.entries(CATEGORY_META).map(([k, m]) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", m.dot)} />
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setDetail(null)}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm"
          >
            <Card className="rounded-b-none sm:rounded-b-xl">
              <CardContent className="p-5 pb-safe sm:pb-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Badge variant="outline" className={cn("text-[10px] border", CATEGORY_META[detail.category].chip)}>
                    {CATEGORY_META[detail.category].label}
                  </Badge>
                  <button onClick={() => setDetail(null)} className="p-1 rounded hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="font-semibold mb-1">{detail.title}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(detail.start), "EEEE, d MMM yyyy · HH:mm")} –{" "}
                  {format(parseISO(detail.end), "HH:mm")}
                </p>
                {detail.subject && (
                  <p className="text-xs mb-2">
                    <span className="text-muted-foreground">Subject:</span> {detail.subject}
                  </p>
                )}
                {detail.description && (
                  <p className="text-xs text-muted-foreground mb-4">{detail.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={detail.completed ? "outline" : "default"}
                    className="flex-1"
                    onClick={() => {
                      toggleComplete(detail.id);
                      setDetail({ ...detail, completed: !detail.completed });
                    }}
                  >
                    {detail.completed ? "Mark Incomplete" : "Mark Complete"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      setEvents((prev) => prev.filter((e) => e.id !== detail.id));
                      setDetail(null);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      <AiPlanDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onGenerated={handleGenerated} />

      <button
        onClick={() => addQuickEvent(selectedDate ?? new Date(), new Date().getHours())}
        className="md:hidden fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[70] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Add event"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
