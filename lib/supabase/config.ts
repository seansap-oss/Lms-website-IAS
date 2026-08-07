export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * True only when both public Supabase credentials are present.
 * The whole app degrades gracefully to local/deterministic state when false,
 * so the platform still builds and runs before a project is provisioned.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function assertSupabaseConfigured(context: string): void {
  if (!isSupabaseConfigured) {
    throw new Error(
      `[supabase] ${context} requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY`
    );
  }
}
