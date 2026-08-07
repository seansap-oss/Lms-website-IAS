"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLocalAdminSession } from "@/lib/local-admin";
import { hapticSuccess } from "@/lib/native";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

export function LocalAdminAuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [passcode, setPasscode] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [attempts, setAttempts] = React.useState(0);
  const [lockedUntil, setLockedUntil] = React.useState(0);
  const [now, setNow] = React.useState(Date.now());
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setPasscode("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  React.useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const locked = lockedUntil > now;
  const secondsLeft = Math.ceil((lockedUntil - now) / 1000);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked || busy) return;

    setBusy(true);
    setError("");
    await new Promise((r) => setTimeout(r, 350));

    if (createLocalAdminSession(passcode)) {
      hapticSuccess();
      onClose();
      router.push("/local-admin");
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setPasscode("");
      if (next >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setAttempts(0);
        setError(`Too many attempts. Locked for ${LOCKOUT_MS / 1000}s.`);
      } else {
        setError(`Incorrect passcode. ${MAX_ATTEMPTS - next} attempt(s) remaining.`);
      }
    }
    setBusy(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.94, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 18, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            <Card className="overflow-hidden border-2 border-amber-500/30">
              <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
              <CardContent className="p-6">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex flex-col items-center text-center mb-5">
                  <motion.div
                    initial={{ rotate: -12, scale: 0.85 }}
                    animate={{ rotate: 0, scale: 1 }}
                    className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg mb-3"
                  >
                    <ShieldCheck className="h-7 w-7 text-white" />
                  </motion.div>
                  <h2 className="text-lg font-bold">Local Institute Access</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Restricted console for on-site Ibemhal IAS staff
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {error}
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="la-pass">Local Admin Passcode</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="la-pass"
                        ref={inputRef}
                        type="password"
                        inputMode="text"
                        autoComplete="off"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="••••••••••••"
                        className="pl-10 tracking-widest"
                        disabled={locked || busy}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                    disabled={locked || busy || !passcode}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying…
                      </>
                    ) : locked ? (
                      `Locked — ${secondsLeft}s`
                    ) : (
                      "Unlock Console"
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-center text-[10px] text-muted-foreground leading-relaxed">
                  All actions are logged. This console manages student profiles,
                  course entitlements and promo codes.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
