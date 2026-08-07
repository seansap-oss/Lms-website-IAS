"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { EyeOff, ShieldAlert } from "lucide-react";

/** Surfaces holding paid content. */
const PROTECTED_PREFIXES = ["/learn", "/dashboard"];

type Threat = "capture" | "hidden" | null;

interface ShieldContextValue {
  /** True while content must be visually suppressed. */
  shielded: boolean;
  threat: Threat;
}

const ShieldContext = React.createContext<ShieldContextValue>({
  shielded: false,
  threat: null,
});

export const useScreenShield = () => React.useContext(ShieldContext);

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function ScreenCaptureShield({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const active = isProtected(pathname);

  const [threat, setThreat] = React.useState<Threat>(null);
  const graceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------------- iOS / macOS screen-capture API ---------------- */
  React.useEffect(() => {
    if (!active || typeof window === "undefined") return;

    // Safari 16.4+ / iOS exposes this when the screen is being recorded,
    // mirrored or cast. Chromium ignores it, so other layers cover that.
    const mql =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-capture: environment)")
        : null;

    const nav = navigator as Navigator & {
      mediaDevices?: MediaDevices & { getDisplayMedia?: unknown };
    };

    const evaluate = () => {
      const captured =
        Boolean(mql?.matches) ||
        Boolean(
          (window as unknown as { screenIsCaptured?: boolean }).screenIsCaptured
        );
      setThreat(captured ? "capture" : null);
    };

    evaluate();
    mql?.addEventListener?.("change", evaluate);

    // Detect an in-page getDisplayMedia grab (tab casting / screen share).
    let restore: (() => void) | null = null;
    if (nav.mediaDevices && typeof nav.mediaDevices.getDisplayMedia === "function") {
      const original = nav.mediaDevices.getDisplayMedia.bind(nav.mediaDevices) as (
        c?: DisplayMediaStreamOptions
      ) => Promise<MediaStream>;

      nav.mediaDevices.getDisplayMedia = (async (c?: DisplayMediaStreamOptions) => {
        setThreat("capture");
        const stream = await original(c);
        stream.getTracks().forEach((t) =>
          t.addEventListener("ended", () => setThreat(null))
        );
        return stream;
      }) as MediaDevices["getDisplayMedia"];

      restore = () => {
        nav.mediaDevices!.getDisplayMedia =
          original as MediaDevices["getDisplayMedia"];
      };
    }

    return () => {
      mql?.removeEventListener?.("change", evaluate);
      restore?.();
    };
  }, [active]);

  /* ---------------- Tab hidden / app backgrounded ---------------- */
  React.useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        setThreat((t) => t ?? "hidden");
      } else {
        // Short grace period stops flicker on normal tab switches.
        if (graceRef.current) clearTimeout(graceRef.current);
        graceRef.current = setTimeout(
          () => setThreat((t) => (t === "hidden" ? null : t)),
          120
        );
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onVisibility);
      window.removeEventListener("focus", onVisibility);
      if (graceRef.current) clearTimeout(graceRef.current);
    };
  }, [active]);

  /* ---------------- PrintScreen + print deterrents ---------------- */
  React.useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const onKey = (e: KeyboardEvent) => {
      const key = e.key;
      const printScreen = key === "PrintScreen";
      // macOS screenshot shortcuts
      const macShot = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(key);
      // Windows Snip & Sketch
      const winSnip = e.shiftKey && e.metaKey && key.toLowerCase() === "s";

      if (printScreen || macShot || winSnip) {
        setThreat("capture");
        try {
          navigator.clipboard?.writeText(
            "Ibemhal IAS — protected content. Screen capture is not permitted."
          );
        } catch {
          /* clipboard denied */
        }
        setTimeout(() => setThreat(null), 1800);
      }
    };

    const onBeforePrint = () => setThreat("capture");
    const onAfterPrint = () => setThreat(null);

    document.addEventListener("keyup", onKey);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    return () => {
      document.removeEventListener("keyup", onKey);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [active]);

  /* ---------------- Print stylesheet ---------------- */
  React.useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const style = document.createElement("style");
    style.setAttribute("data-ibemhal-shield", "");
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        body::after {
          content: "Ibemhal IAS — protected course content cannot be printed.";
          visibility: visible !important;
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font: 600 18px system-ui, sans-serif; color: #0f172a; text-align: center;
        }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, [active]);

  const shielded = active && threat !== null;

  return (
    <ShieldContext.Provider value={{ shielded, threat }}>
      <div className={shielded ? "pointer-events-none select-none blur-2xl" : undefined}>
        {children}
      </div>

      <AnimatePresence>
        {shielded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[280] flex items-center justify-center bg-slate-950/97 p-6"
          >
            <div className="max-w-xs text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/30">
                {threat === "capture" ? (
                  <ShieldAlert className="h-8 w-8 text-red-400" />
                ) : (
                  <EyeOff className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <h2 className="text-lg font-bold text-white">
                {threat === "capture" ? "Content protected" : "Content hidden"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {threat === "capture"
                  ? "Screen recording or capture was detected. Ibemhal IAS course material is protected by copyright and cannot be recorded."
                  : "Return to this tab to continue your lesson."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ShieldContext.Provider>
  );
}
