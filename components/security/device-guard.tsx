"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MonitorSmartphone, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { verifyDevice, claimDevice, releaseDevice } from "@/lib/supabase/auth-device";

/** Only protected surfaces are policed — marketing pages stay public. */
const GUARDED_PREFIXES = ["/dashboard", "/learn", "/ai-tutor", "/profile"];

const HEARTBEAT_MS = 60_000;

function isGuarded(pathname: string): boolean {
  return GUARDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function DeviceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [evicted, setEvicted] = React.useState(false);
  const evictingRef = React.useRef(false);
  const guarded = isGuarded(pathname);

  const evict = React.useCallback(
    async (reason: string) => {
      if (evictingRef.current) return;
      evictingRef.current = true;
      setEvicted(true);

      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut().catch(() => undefined);
      }

      setTimeout(() => {
        router.replace(`/login?reason=${reason}`);
      }, 2600);
    },
    [router]
  );

  // Bind this device once per authenticated session.
  React.useEffect(() => {
    if (!guarded) return;
    const supabase = createClient();
    if (!supabase) return;

    let alive = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!alive) return;
      if (event === "SIGNED_IN") {
        void claimDevice();
      }
      if (event === "SIGNED_OUT") {
        void releaseDevice();
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [guarded]);

  // Heartbeat: poll, plus re-check whenever the tab regains focus.
  React.useEffect(() => {
    if (!guarded) return;

    let alive = true;

    const check = async () => {
      if (!alive || evictingRef.current) return;
      const result = await verifyDevice();
      if (!alive) return;

      if (!result.valid && result.reason === "concurrent_login") {
        void evict("concurrent_login");
      }
    };

    void check();
    const interval = setInterval(check, HEARTBEAT_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      alive = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [guarded, evict]);

  return (
    <>
      {children}
      <AnimatePresence>
        {evicted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-6"
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-sm text-center"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/30">
                <MonitorSmartphone className="h-8 w-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Signed in elsewhere</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Your Ibemhal IAS account was just opened on another device. For content
                security, only one device can be active at a time.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Returning you to sign-in…
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
