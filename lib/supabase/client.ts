"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

let cached: SupabaseClient<Database> | null = null;

/**
 * Browser Supabase client (cookie-backed session, shared with the server).
 * Returns null when the project has not been provisioned yet so callers can
 * fall back to local state instead of throwing.
 */
export function createClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  if (cached) return cached;

  cached = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}

export { isSupabaseConfigured };
