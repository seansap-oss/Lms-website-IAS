"use client";

import * as React from "react";
import {
  startOfYear,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/calendar";

export function YearView({
  cursor,
  events,
  onSelectMonth,
  onSelectDay,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onSelectMonth: (d: Date) => void;
  onSelectDay: (d: Date) => void;
}) {
  const yearStart = startOfYear(cursor);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

  const density = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const key = format(parseISO(e.start), "yyyy-MM-dd");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {months.map((month) => {
        const from = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
        const to = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: from, end: to });
        const monthCount = events.filter((e) =>
          isSameMonth(parseISO(e.start), month)
        ).length;

        return (
          <div key={month.toISOString()} className="rounded-xl border bg-card p-3">
            <button
              onClick={() => onSelectMonth(month)}
              className="w-full flex items-center justify-between mb-2 group"
            >
              <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                {format(month, "MMMM")}
              </span>
              {monthCount > 0 && (
                <span className="text-[10px] rounded-full bg-primary/10 text-primary px-1.5 py-0.5">
                  {monthCount}
                </span>
              )}
            </button>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="text-center text-[9px] text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const count = density.get(key) ?? 0;
                const inMonth = isSameMonth(day, month);
                return (
                  <button
                    key={key}
                    onClick={() => onSelectDay(day)}
                    className={cn(
                      "aspect-square rounded-[3px] text-[9px] flex items-center justify-center transition-colors",
                      !inMonth && "opacity-25",
                      isToday(day) && "ring-1 ring-primary font-bold",
                      count === 0 && "bg-muted/40 text-muted-foreground hover:bg-muted",
                      count === 1 && "bg-blue-500/25 text-blue-700 dark:text-blue-200",
                      count === 2 && "bg-blue-500/45 text-blue-900 dark:text-blue-50",
                      count >= 3 && "bg-blue-600 text-white font-semibold"
                    )}
                    title={count ? `${count} event${count > 1 ? "s" : ""}` : undefined}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
