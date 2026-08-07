"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { isNativePlatform } from "@/lib/native";

const ROOT_PATHS = new Set(["/", "/dashboard"]);
const EXIT_WINDOW_MS = 2000;

export function NativeAppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [toast, setToast] = React.useState<string | null>(null);

  const pathRef = React.useRef(pathname);
  const lastBackRef = React.useRef(0);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), EXIT_WINDOW_MS);
  }, []);

  React.useEffect(() => {
    if (!isNativePlatform()) return;

    let removeListener: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const { StatusBar, Style } = await import("@capacitor/status-bar").catch(() => ({
          StatusBar: null,
          Style: null,
        })) as { StatusBar: { setStyle: (o: { style: unknown }) => Promise<void>; setBackgroundColor: (o: { color: string }) => Promise<void> } | null; Style: { Dark: unknown } | null };

        if (StatusBar && Style) {
          await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
          await StatusBar.setBackgroundColor({ color: "#0f172a" }).catch(() => {});
        }

        try {
          const { SplashScreen } = await import("@capacitor/splash-screen");
          await SplashScreen.hide().catch(() => {});
        } catch {
          // splash plugin optional
        }

        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          const current = pathRef.current;
          const isRoot = ROOT_PATHS.has(current);
          const historyDepth =
            typeof window !== "undefined" ? window.history.length : 0;

          if (!isRoot && (historyDepth > 1 || canGoBack)) {
            router.back();
            return;
          }

          const now = Date.now();
          if (now - lastBackRef.current < EXIT_WINDOW_MS) {
            App.exitApp();
          } else {
            lastBackRef.current = now;
            showToast("Press back again to exit Ibemhal IAS");
          }
        });

        if (cancelled) {
          handle.remove();
        } else {
          removeListener = () => handle.remove();
        }
      } catch {
        // Capacitor App plugin unavailable (pure web) — no-op
      }
    })();

    return () => {
      cancelled = true;
      removeListener?.();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [router, showToast]);

  return (
    <>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            role="status"
            aria-live="polite"
            className="fixed left-1/2 -translate-x-1/2 z-[200] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] rounded-full bg-gray-900/95 dark:bg-gray-100/95 px-5 py-2.5 text-sm font-medium text-white dark:text-gray-900 shadow-2xl backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
