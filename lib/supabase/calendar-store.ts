"use client";

import { createClient } from "./client";
import { buildSeedEvents } from "@/lib/calendar-data";
import type { CalendarEvent, EventCategory } from "@/types/calendar";
import type { CalendarEventRow } from "@/types/database";

const LOCAL_KEY = "ibemhal:calendar-events";

export type CalendarMode = "supabase" | "local";

export interface CalendarLoad {
  events: CalendarEvent[];
  mode: CalendarMode;
  userId: string | null;
}

export function rowToEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.type as EventCategory,
    subject: row.subject ?? undefined,
    start: row.start_time,
    end: row.end_time,
    completed: row.completed,
    aiGenerated: row.ai_generated,
  };
}

export function eventToRow(e: CalendarEvent, userId: string) {
  return {
    user_id: userId,
    title: e.title,
    description: e.description ?? null,
    start_time: e.start,
    end_time: e.end,
    type: e.category,
    subject: e.subject ?? null,
    completed: Boolean(e.completed),
    ai_generated: Boolean(e.aiGenerated),
  };
}

function readLocal(): CalendarEvent[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : null;
  } catch {
    return null;
  }
}

function writeLocal(events: CalendarEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

export async function loadEvents(): Promise<CalendarLoad> {
  const supabase = createClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: true });

      if (!error) {
        return {
          events: (data ?? []).map((r) => rowToEvent(r as CalendarEventRow)),
          mode: "supabase",
          userId: user.id,
        };
      }
    }
  }

  const local = readLocal();
  return {
    events: local ?? buildSeedEvents(new Date()),
    mode: "local",
    userId: null,
  };
}

export async function createEvent(
  event: CalendarEvent,
  mode: CalendarMode,
  userId: string | null,
  all: CalendarEvent[]
): Promise<CalendarEvent> {
  if (mode === "supabase" && userId) {
    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase
        .from("calendar_events")
        .insert(eventToRow(event, userId))
        .select("*")
        .maybeSingle();
      if (data) return rowToEvent(data as CalendarEventRow);
    }
  }
  writeLocal([...all, event]);
  return event;
}

export async function updateEvent(
  id: string,
  patch: Partial<Pick<CalendarEvent, "completed" | "title" | "description">>,
  mode: CalendarMode,
  all: CalendarEvent[]
): Promise<void> {
  if (mode === "supabase") {
    const supabase = createClient();
    if (supabase) {
      await supabase
        .from("calendar_events")
        .update({
          ...(patch.completed !== undefined ? { completed: patch.completed } : {}),
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
        })
        .eq("id", id);
      return;
    }
  }
  writeLocal(all.map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

export async function deleteEvent(
  id: string,
  mode: CalendarMode,
  all: CalendarEvent[]
): Promise<void> {
  if (mode === "supabase") {
    const supabase = createClient();
    if (supabase) {
      await supabase.from("calendar_events").delete().eq("id", id);
      return;
    }
  }
  writeLocal(all.filter((e) => e.id !== id));
}

/**
 * Replaces the previous AI-generated plan with a new one.
 * Manual events are always preserved.
 */
export async function replaceAiPlan(
  generated: CalendarEvent[],
  mode: CalendarMode,
  userId: string | null,
  all: CalendarEvent[]
): Promise<CalendarEvent[]> {
  const manual = all.filter((e) => !e.aiGenerated);

  if (mode === "supabase" && userId) {
    const supabase = createClient();
    if (supabase) {
      // Preferred path: single atomic RPC (delete + insert in one transaction).
      const payload = generated.map((e) => ({
        title: e.title,
        description: e.description ?? "",
        start_time: e.start,
        end_time: e.end,
        type: e.category,
        subject: e.subject ?? "",
        completed: Boolean(e.completed),
      }));

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "replace_ai_calendar_plan",
        { p_events: payload }
      );

      if (!rpcError && Array.isArray(rpcData)) {
        return [...manual, ...rpcData.map((r) => rowToEvent(r as CalendarEventRow))];
      }

      // Fallback: manual delete + chunked insert (RPC not yet installed).
      await supabase
        .from("calendar_events")
        .delete()
        .eq("user_id", userId)
        .eq("ai_generated", true);

      const rows = generated.map((e) => eventToRow({ ...e, aiGenerated: true }, userId));
      const inserted: CalendarEvent[] = [];

      for (let i = 0; i < rows.length; i += 200) {
        const { data } = await supabase
          .from("calendar_events")
          .insert(rows.slice(i, i + 200))
          .select("*");
        if (data) inserted.push(...data.map((r) => rowToEvent(r as CalendarEventRow)));
      }

      return [...manual, ...(inserted.length ? inserted : generated)];
    }
  }

  const next = [...manual, ...generated];
  writeLocal(next);
  return next;
}
