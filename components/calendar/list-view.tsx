"use client";

import * as React from "react";
import { format, parseISO, isToday, isTomorrow, isYesterday } from "date-fns";
import { CalendarX2, Check, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_META, type CalendarEvent } from "@/types/calendar";

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM yyyy");
}

export function ListView({
  events,
  scopeLabel,
  onToggleComplete,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  scopeLabel: string;
  onToggleComplete: (id: string) => void;
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
    for (const e of sorted) {
      const key = format(parseISO(e.start), "yyyy-MM-dd");
      const arr = map.get(key);
      if (arr) arr.push(e);
      else map.set(key, [e]);
    }
    return Array.from(map.entries());
  }, [events]);

  if (!grouped.length) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <CalendarX2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium">No events in {scopeLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Generate an AI study plan or add a task to fill this period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Showing <strong>{events.length}</strong> event{events.length === 1 ? "" : "s"} for{" "}
        <strong>{scopeLabel}</strong>
      </p>

      {grouped.map(([key, dayEvents]) => {
        const date = parseISO(`${key}T00:00:00`);
        return (
          <div key={key} className="rounded-xl border bg-card overflow-hidden">
            <div
              className={cn(
                "px-4 py-2 border-b flex items-center justify-between",
                isToday(date) ? "bg-primary/10" : "bg-muted/40"
              )}
            >
              <span className={cn("text-sm font-semibold", isToday(date) && "text-primary")}>
                {dayLabel(date)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {dayEvents.length} item{dayEvents.length === 1 ? "" : "s"}
              </span>
            </div>

            <ul className="divide-y">
              {dayEvents.map((e) => {
                const meta = CATEGORY_META[e.category];
                const start = parseISO(e.start);
                const end = parseISO(e.end);
                return (
                  <li key={e.id} className={cn("flex items-start gap-3 p-3 border-l-2", meta.ring)}>
                    <button
                      onClick={() => onToggleComplete(e.id)}
                      aria-label={e.completed ? "Mark incomplete" : "Mark complete"}
                      className={cn(
                        "mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                        e.completed
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-muted-foreground/30 hover:border-primary"
                      )}
                    >
                      {e.completed && <Check className="h-3 w-3" />}
                    </button>

                    <button onClick={() => onSelectEvent(e)} className="flex-1 min-w-0 text-left">
                      <p
                        className={cn(
                          "text-sm font-medium leading-tight",
                          e.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {e.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(start, "HH:mm")} – {format(end, "HH:mm")}
                        </span>
                        <Badge variant="outline" className={cn("text-[10px] border", meta.chip)}>
                          {meta.label}
                        </Badge>
                        {e.subject && (
                          <span className="text-[11px] text-muted-foreground">{e.subject}</span>
                        )}
                        {e.aiGenerated && (
                          <Badge variant="outline" className="text-[10px] gap-0.5">
                            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                            AI
                          </Badge>
                        )}
                      </div>
                      {e.description && (
                        <p className="text-[11px] text-muted-foreground mt-1">{e.description}</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
