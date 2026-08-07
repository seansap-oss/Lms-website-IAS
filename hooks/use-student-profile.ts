"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";

export interface StudentProfile {
  id: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
}

const EMPTY: StudentProfile = {
  id: null,
  fullName: null,
  email: null,
  phone: null,
  role: null,
};

/**
 * Resolves the signed-in student's identity for watermarking.
 * Falls back to a neutral label when Supabase is not provisioned so the
 * watermark still renders (never leaves content unmarked).
 */
export function useStudentProfile(): { profile: StudentProfile; loading: boolean } {
  const [profile, setProfile] = React.useState<StudentProfile>(EMPTY);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (alive) setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!alive) return;

      setProfile({
        id: user.id,
        fullName: data?.full_name ?? user.email?.split("@")[0] ?? null,
        email: data?.email ?? user.email ?? null,
        phone: data?.phone ?? null,
        role: data?.role ?? "student",
      });
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { profile, loading };
}
