"use client";

import * as React from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import { CATEGORY_META, type CalendarEvent } from "@/types/calendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({
  cursor,
  events,
  selectedDate,
  onSelectDate,
  onOpenDay,
}: {
  cursor: Date;
  events: CalendarEvent[];
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
  onOpenDay: (d: Date) => void;
}) {
  const days = React.useMemo(() => {
    const from = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const to = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: from, end: to });
  }, [cursor]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = format(parseISO(e.start), "yyyy-MM-dd");
      const arr = map.get(key);
      if (arr) arr.push(e);
      else map.set(key, [e]);
    }
    return map;
  }, [events]);

  return (
    <div className="rounded-xl border overflow-hidden bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const today = isToday(day);

          return (
            <button
              key={key}
              onClick={() => onSelectDate(day)}
              onDoubleClick={() => onOpenDay(day)}
              className={cn(
                "relative min-h-[72px] sm:min-h-[104px] border-b border-r p-1 sm:p-1.5 text-left transition-colors",
                "last:border-r-0 [&:nth-child(7n)]:border-r-0",
                inMonth ? "bg-background" : "bg-muted/25",
                selected && "ring-2 ring-inset ring-primary",
                "hover:bg-muted/50"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  today && "bg-primary text-primary-foreground font-bold",
                  !today && inMonth && "text-foreground",
                  !today && !inMonth && "text-muted-foreground/50"
                )}
              >
                {format(day, "d")}
              </span>

              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      "hidden sm:block truncate rounded px-1 py-0.5 text-[10px] border-l-2",
                      CATEGORY_META[e.category].chip,
                      CATEGORY_META[e.category].ring,
                      e.completed && "line-through opacity-50"
                    )}
                  >
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="hidden sm:block text-[10px] text-muted-foreground pl-1">
                    +{dayEvents.length - 2} more
                  </div>
                )}

                <div className="sm:hidden flex flex-wrap gap-0.5">
                  {dayEvents.slice(0, 4).map((e) => (
                    <span
                      key={e.id}
                      className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_META[e.category].dot)}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
