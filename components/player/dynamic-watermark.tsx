"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface DynamicWatermarkProps {
  studentName?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Reposition interval in milliseconds. */
  intervalMs?: number;
  /** 0-1. Deliberately low so it does not spoil viewing. */
  opacity?: number;
  /** Renders a faint full-surface tiled layer that survives cropping. */
  tiled?: boolean;
}

/** 9 anchor zones — avoids the centre so the lecturer stays visible. */
const ANCHORS = [
  { top: "4%", left: "4%" },
  { top: "4%", left: "50%" },
  { top: "4%", left: "auto", right: "4%" },
  { top: "46%", left: "4%" },
  { top: "46%", left: "auto", right: "4%" },
  { top: "78%", left: "4%" },
  { top: "78%", left: "50%" },
  { top: "78%", left: "auto", right: "4%" },
  { top: "24%", left: "auto", right: "18%" },
] as const;

function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return digits;
  return `${digits.slice(0, 2)}••••${digits.slice(-4)}`;
}

function maskEmail(email?: string | null): string {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const shown = user.slice(0, Math.min(3, user.length));
  return `${shown}${user.length > 3 ? "•••" : ""}@${domain}`;
}

export function DynamicWatermark({
  studentName,
  phone,
  email,
  intervalMs = 12_000,
  opacity = 0.28,
  tiled = true,
}: DynamicWatermarkProps) {
  const [index, setIndex] = React.useState(0);
  const [jitter, setJitter] = React.useState({ x: 0, y: 0 });
  const [clock, setClock] = React.useState("");

  // Rotate anchor + apply sub-zone jitter so the path is unpredictable.
  React.useEffect(() => {
    const move = () => {
      setIndex((i) => {
        let next = Math.floor(Math.random() * ANCHORS.length);
        if (next === i) next = (next + 1 + Math.floor(Math.random() * 3)) % ANCHORS.length;
        return next;
      });
      setJitter({
        x: Math.round((Math.random() - 0.5) * 60),
        y: Math.round((Math.random() - 0.5) * 40),
      });
    };

    move();
    const id = setInterval(move, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  // Live timestamp makes any leaked recording traceable to the minute.
  React.useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const name = studentName?.trim() || "Ibemhal Student";
  const contact = maskPhone(phone) || maskEmail(email);
  const anchor = ANCHORS[index];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
      style={{ userSelect: "none" }}
    >
      {/* Faint tiled layer — survives cropping and re-encoding */}
      {tiled && (
        <div
          className="absolute inset-0"
          style={{
            opacity: opacity * 0.32,
            backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="180">
                 <text x="0" y="90" transform="rotate(-24 0 90)"
                       font-family="system-ui,sans-serif" font-size="15" font-weight="600"
                       fill="white" fill-opacity="0.5">${name} · ${contact}</text>
               </svg>`
            )}")`,
            backgroundRepeat: "repeat",
          }}
        />
      )}

      {/* Roaming badge */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity, scale: 1, x: jitter.x, y: jitter.y }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
          className="absolute"
          style={{
            top: anchor.top,
            left: anchor.left === "auto" ? undefined : anchor.left,
            right: "right" in anchor ? anchor.right : undefined,
            transform: anchor.left === "50%" ? "translateX(-50%)" : undefined,
          }}
        >
          <div className="rounded-md bg-black/35 px-2.5 py-1.5 backdrop-blur-[2px] ring-1 ring-white/15">
            <p className="text-[11px] font-semibold leading-tight text-white drop-shadow">
              {name}
            </p>
            {contact && (
              <p className="text-[10px] leading-tight text-white/85 drop-shadow">
                {contact}
              </p>
            )}
            <p className="text-[9px] leading-tight text-white/65">
              Ibemhal IAS · {clock}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Fixed corner attribution */}
      <div
        className="absolute bottom-2 right-2 rounded bg-black/25 px-1.5 py-0.5"
        style={{ opacity: opacity * 0.8 }}
      >
        <p className="text-[9px] font-medium tracking-wide text-white/80">
          © Ibemhal IAS — Do not share
        </p>
      </div>
    </div>
  );
}
