"use client";

import * as React from "react";
import {
  startOfWeek,
  addDays,
  format,
  isToday,
  isSameDay,
  parseISO,
  getHours,
  getMinutes,
  differenceInMinutes,
} from "date-fns";
import { cn } from "@/lib/utils";
import { CATEGORY_META, type CalendarEvent } from "@/types/calendar";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_PX = 52;

export function WeekView({
  cursor,
  events,
  onSelectSlot,
  onSelectEvent,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onSelectSlot: (date: Date, hour: number) => void;
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 6 * HOUR_PX;
  }, []);

  return (
    <div className="rounded-xl border overflow-hidden bg-card">
      <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b bg-muted/40 sticky top-0 z-10">
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="py-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">{format(d, "EEE")}</p>
            <p
              className={cn(
                "mx-auto mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                isToday(d) ? "bg-primary text-primary-foreground" : "text-foreground"
              )}
            >
              {format(d, "d")}
            </p>
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="relative overflow-y-auto max-h-[62vh]">
        <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))]">
          <div>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_PX }}
                className="relative border-b border-r text-[10px] text-muted-foreground"
              >
                <span className="absolute -top-1.5 right-1.5">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = events.filter((e) => isSameDay(parseISO(e.start), day));
            return (
              <div key={day.toISOString()} className="relative border-r last:border-r-0">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    onClick={() => onSelectSlot(day, h)}
                    style={{ height: HOUR_PX }}
                    className="block w-full border-b hover:bg-primary/5 transition-colors"
                    aria-label={`${format(day, "EEE d MMM")} ${h}:00`}
                  />
                ))}

                {dayEvents.map((e) => {
                  const s = parseISO(e.start);
                  const en = parseISO(e.end);
                  const top = (getHours(s) + getMinutes(s) / 60) * HOUR_PX;
                  const height = Math.max(22, (differenceInMinutes(en, s) / 60) * HOUR_PX - 2);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelectEvent(e)}
                      style={{ top, height }}
                      className={cn(
                        "absolute left-0.5 right-0.5 rounded-md border-l-2 px-1 py-0.5 text-left overflow-hidden",
                        CATEGORY_META[e.category].chip,
                        CATEGORY_META[e.category].ring,
                        e.completed && "opacity-50"
                      )}
                    >
                      <p className="text-[10px] font-semibold leading-tight truncate">{e.title}</p>
                      <p className="text-[9px] opacity-75">{format(s, "HH:mm")}</p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
