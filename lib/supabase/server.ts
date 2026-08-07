import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

/**
 * Server Component / Route Handler client.
 * Reads and refreshes the auth session from Next.js cookies.
 */
export async function createClient(): Promise<SupabaseClient<Database> | null> {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — session refresh is handled by middleware.
        }
      },
    },
  });
}

/**
 * Service-role client for privileged server-side writes (bypasses RLS).
 * NEVER import this into a Client Component.
 */
export function createServiceClient(): SupabaseClient<Database> | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) return null;

  return createSupabaseClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Returns the authenticated user's profile, or null. */
export async function getSessionProfile() {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  return profile ? { user, profile } : null;
}

export { isSupabaseConfigured };
