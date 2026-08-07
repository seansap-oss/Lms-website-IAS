"use client";

import * as React from "react";

interface LongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  durationMs?: number;
  moveTolerancePx?: number;
}

interface LongPressState {
  progress: number;
  active: boolean;
}

/**
 * Press-and-hold detector with live progress.
 * Cancels on pointer move beyond tolerance, leave, cancel, or blur.
 */
export function useLongPress({
  onLongPress,
  onClick,
  durationMs = 5000,
  moveTolerancePx = 12,
}: LongPressOptions) {
  const [state, setState] = React.useState<LongPressState>({ progress: 0, active: false });

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const startRef = React.useRef(0);
  const originRef = React.useRef<{ x: number; y: number } | null>(null);
  const firedRef = React.useRef(false);

  const cleanup = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cancel = React.useCallback(
    (allowClick = false) => {
      const wasQuick = Date.now() - startRef.current < 350;
      cleanup();
      originRef.current = null;
      setState({ progress: 0, active: false });

      if (allowClick && !firedRef.current && wasQuick) onClick?.();
      firedRef.current = false;
    },
    [cleanup, onClick]
  );

  const start = React.useCallback(
    (x: number, y: number) => {
      cleanup();
      firedRef.current = false;
      startRef.current = Date.now();
      originRef.current = { x, y };
      setState({ progress: 0, active: true });

      const tick = () => {
        const elapsed = Date.now() - startRef.current;
        const pct = Math.min(100, (elapsed / durationMs) * 100);
        setState({ progress: pct, active: true });
        if (pct < 100) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        cleanup();
        setState({ progress: 100, active: false });
        onLongPress();
        setTimeout(() => setState({ progress: 0, active: false }), 200);
      }, durationMs);
    },
    [cleanup, durationMs, onLongPress]
  );

  React.useEffect(() => cleanup, [cleanup]);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      start(e.clientX, e.clientY);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const origin = originRef.current;
      if (!origin) return;
      const dx = Math.abs(e.clientX - origin.x);
      const dy = Math.abs(e.clientY - origin.y);
      if (dx > moveTolerancePx || dy > moveTolerancePx) cancel(false);
    },
    onPointerUp: () => cancel(true),
    onPointerLeave: () => cancel(false),
    onPointerCancel: () => cancel(false),
    onContextMenu: (e: React.MouseEvent) => {
      if (state.active) e.preventDefault();
    },
  };

  return { handlers, progress: state.progress, isPressing: state.active };
}
