"use client";

import { createClient } from "./client";
import {
  DEFAULT_STATE,
  EMPTY_STATE,
  BADGES,
  rowToState,
  type GamificationState,
} from "@/lib/gamification";

const LOCAL_KEY = "ibemhal:gamification";

export interface XpDelta {
  xp?: number;
  lessons?: number;
  essays?: number;
  quizzes?: number;
  minutes?: number;
}

export type PersistenceMode = "supabase" | "local";

export interface LoadResult {
  state: GamificationState;
  mode: PersistenceMode;
  userId: string | null;
}

function readLocal(): GamificationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as GamificationState) : null;
  } catch {
    return null;
  }
}

function writeLocal(state: GamificationState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    // storage full / disabled — non-fatal
  }
}

/**
 * Loads gamification state.
 * Supabase (authenticated) → localStorage → demo defaults.
 */
export async function loadGamification(): Promise<LoadResult> {
  const supabase = createClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        return { state: rowToState(data), mode: "supabase", userId: user.id };
      }

      // First login — create the row.
      const { data: created } = await supabase
        .from("user_gamification")
        .insert({ user_id: user.id })
        .select("*")
        .maybeSingle();

      return {
        state: created ? rowToState(created) : EMPTY_STATE,
        mode: "supabase",
        userId: user.id,
      };
    }
  }

  return { state: readLocal() ?? DEFAULT_STATE, mode: "local", userId: null };
}

/**
 * Applies an XP delta. Uses the atomic `award_xp` RPC when authenticated so
 * concurrent tabs cannot clobber each other; otherwise persists locally.
 */
export async function awardXp(
  current: GamificationState,
  delta: XpDelta,
  mode: PersistenceMode
): Promise<GamificationState> {
  const optimistic: GamificationState = {
    ...current,
    xp: current.xp + (delta.xp ?? 0),
    lessonsCompleted: current.lessonsCompleted + (delta.lessons ?? 0),
    essaysSubmitted: current.essaysSubmitted + (delta.essays ?? 0),
    quizzesCompleted: current.quizzesCompleted + (delta.quizzes ?? 0),
    totalStudyMinutes: current.totalStudyMinutes + (delta.minutes ?? 0),
  };
  optimistic.unlockedBadges = BADGES.filter((b) => b.requirement(optimistic)).map((b) => b.id);

  if (mode === "local") {
    writeLocal(optimistic);
    return optimistic;
  }

  const supabase = createClient();
  if (!supabase) return optimistic;

  const { data, error } = await supabase.rpc("award_xp", {
    p_xp: delta.xp ?? 0,
    p_lessons: delta.lessons ?? 0,
    p_essays: delta.essays ?? 0,
    p_quizzes: delta.quizzes ?? 0,
    p_minutes: delta.minutes ?? 0,
  });

  if (error || !data) return optimistic;

  const row = Array.isArray(data) ? data[0] : data;
  const next = rowToState(row as Parameters<typeof rowToState>[0]);
  next.unlockedBadges = BADGES.filter((b) => b.requirement(next)).map((b) => b.id);

  await supabase
    .from("user_gamification")
    .update({ unlocked_badges: next.unlockedBadges })
    .eq("user_id", (row as { user_id: string }).user_id);

  return next;
}

/** Records a daily login (streak advance + login XP). */
export async function registerDailyLogin(
  current: GamificationState,
  mode: PersistenceMode
): Promise<GamificationState> {
  const today = new Date().toISOString().slice(0, 10);
  if (current.lastLoginDate === today) return current;

  const next = await awardXp(current, { xp: 20 }, mode);

  if (mode === "local") {
    const withDate = { ...next, lastLoginDate: today, streakDays: next.streakDays + 1 };
    writeLocal(withDate);
    return withDate;
  }
  return next;
}
