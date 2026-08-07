"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Lock,
  AlertTriangle,
  Loader2,
  MonitorSmartphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { claimDevice } from "@/lib/supabase/auth-device";

const REASONS: Record<string, { title: string; body: string }> = {
  concurrent_login: {
    title: "Signed in on another device",
    body: "Your account was opened elsewhere. For content security only one device can be active at a time — sign in again to use this device.",
  },
  session_expired: {
    title: "Session expired",
    body: "Please sign in again to continue your preparation.",
  },
  unbound: {
    title: "Device verification needed",
    body: "Sign in to register this device with your account.",
  },
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reasonKey = params.get("reason") ?? "";
  const reason = REASONS[reasonKey];

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    const supabase = createClient();
    if (!supabase) {
      setError("Authentication is not configured yet. Please contact the institute.");
      setBusy(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    // Bind this device — evicts any previous session.
    await claimDevice();
    router.replace("/dashboard");
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <span className="block text-lg font-bold leading-tight text-slate-900 dark:text-white">
              Ibemhal
            </span>
            <span className="block text-[10px] font-medium tracking-wider text-blue-600 dark:text-blue-400">
              IAS ACADEMY
            </span>
          </div>
        </Link>
      </div>

      {reason && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-3.5 dark:border-amber-800/60 dark:bg-amber-950/30"
        >
          <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              {reason.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-300/80">
              {reason.body}
            </p>
          </div>
        </motion.div>
      )}

      <Card>
        <CardContent className="p-6">
          <h1 className="text-lg font-bold">Student sign in</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Access your courses, AI tutor and study planner.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="lg-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lg-pw">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lg-pw"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            New here?{" "}
            <Link href="/#courses" className="font-medium text-primary hover:underline">
              Browse courses to enrol
            </Link>
          </p>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
        Your account is limited to one active device to protect course content.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F6] p-4 dark:bg-slate-950">
      <div className="absolute inset-0 grid-overlay opacity-30" />
      <div className="relative">
        <React.Suspense
          fallback={
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          }
        >
          <LoginForm />
        </React.Suspense>
      </div>
    </div>
  );
}
