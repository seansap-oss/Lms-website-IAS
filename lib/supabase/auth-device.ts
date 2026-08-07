"use client";

import { createClient } from "./client";
import { isNativePlatform } from "@/lib/native";

const DEVICE_KEY = "ibemhal.device.id";
const LABEL_KEY = "ibemhal.device.label";

export type ClaimStatus = "bound" | "rebound" | "exempt" | "error";
export type VerifyReason =
  | "ok"
  | "exempt"
  | "no_session"
  | "no_profile"
  | "unbound"
  | "concurrent_login"
  | "offline";

export interface DeviceIdentity {
  id: string;
  label: string;
  platform: string;
}

export interface ClaimResult {
  status: ClaimStatus;
  deviceId: string;
  switchCount?: number;
  message: string;
}

export interface VerifyResult {
  valid: boolean;
  reason: VerifyReason;
  boundLabel?: string | null;
}

/* ------------------------------------------------------------------ */
/* Fingerprint                                                         */
/* ------------------------------------------------------------------ */

function hashString(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xc2b2ae35;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

/** Stable browser signature — survives cache clears reasonably well. */
function browserFingerprint(): string {
  if (typeof window === "undefined") return "ssr";

  const nav = window.navigator;
  const scr = window.screen;

  const parts = [
    nav.userAgent,
    nav.language,
    (nav.languages ?? []).join(","),
    String(nav.hardwareConcurrency ?? 0),
    String((nav as Navigator & { deviceMemory?: number }).deviceMemory ?? 0),
    `${scr.width}x${scr.height}x${scr.colorDepth}`,
    String(new Date().getTimezoneOffset()),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    String(nav.maxTouchPoints ?? 0),
  ];

  // Canvas entropy
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, 120, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("Ibemhal-IAS-\u2713", 2, 2);
      parts.push(canvas.toDataURL().slice(-96));
    }
  } catch {
    /* canvas blocked */
  }

  // WebGL renderer
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        parts.push(String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)));
        parts.push(String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)));
      }
    }
  } catch {
    /* webgl blocked */
  }

  return hashString(parts.join("|"));
}

function friendlyLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;

  const os =
    /Windows NT/.test(ua) ? "Windows" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" : "Device";

  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Browser";

  return `${os} · ${browser}`;
}

let cachedIdentity: DeviceIdentity | null = null;

/**
 * Resolves a persistent device identity.
 * Native → @capacitor/device hardware UUID. Web → stored UUID + fingerprint.
 */
export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (cachedIdentity) return cachedIdentity;

  if (typeof window === "undefined") {
    return { id: "ssr-placeholder", label: "Server", platform: "server" };
  }

  let id = "";
  let label = friendlyLabel();
  let platform = "web";

  if (isNativePlatform()) {
    try {
      const { Device } = await import("@capacitor/device");
      const [info, deviceId] = await Promise.all([Device.getInfo(), Device.getId()]);
      const raw = deviceId.identifier;
      if (raw) {
        id = `nat_${hashString(raw)}`;
        platform = info.platform;
        label = `${info.manufacturer ?? ""} ${info.model ?? ""}`.trim() || info.platform;
      }
    } catch {
      /* plugin unavailable — fall through to web path */
    }
  }

  if (!id) {
    let stored = "";
    try {
      stored = window.localStorage.getItem(DEVICE_KEY) ?? "";
    } catch {
      /* storage blocked */
    }

    if (!stored) {
      const uuid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      // Bind the random UUID to the hardware fingerprint so copying
      // localStorage to another machine does not transfer the identity.
      stored = `web_${hashString(uuid)}_${browserFingerprint()}`;
      try {
        window.localStorage.setItem(DEVICE_KEY, stored);
      } catch {
        /* storage blocked — id becomes session-scoped */
      }
    }
    id = stored;
  }

  try {
    window.localStorage.setItem(LABEL_KEY, label);
  } catch {
    /* ignore */
  }

  cachedIdentity = { id, label, platform };
  return cachedIdentity;
}

export function getCachedDeviceId(): string | null {
  if (cachedIdentity) return cachedIdentity.id;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Supabase binding                                                    */
/* ------------------------------------------------------------------ */

/** Call immediately after a successful sign-in. Evicts any other device. */
export async function claimDevice(): Promise<ClaimResult> {
  const identity = await getDeviceIdentity();
  const supabase = createClient();

  if (!supabase) {
    return { status: "exempt", deviceId: identity.id, message: "Offline mode." };
  }

  const { data, error } = await supabase.rpc("claim_device", {
    p_device_id: identity.id,
    p_device_label: identity.label,
    p_platform: identity.platform,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  } as never);

  if (error || !data) {
    return {
      status: "error",
      deviceId: identity.id,
      message: error?.message ?? "Could not verify this device.",
    };
  }

  const payload = data as unknown as {
    status: ClaimStatus;
    deviceId: string;
    switchCount?: number;
    message: string;
  };

  return {
    status: payload.status,
    deviceId: payload.deviceId,
    switchCount: payload.switchCount,
    message: payload.message,
  };
}

/** Heartbeat check — returns valid=false once another device takes over. */
export async function verifyDevice(): Promise<VerifyResult> {
  const identity = await getDeviceIdentity();
  const supabase = createClient();

  if (!supabase) return { valid: true, reason: "exempt" };

  try {
    const { data, error } = await supabase.rpc("verify_device", {
      p_device_id: identity.id,
    } as never);

    if (error) {
      // Network/RPC failure must never lock a paying student out.
      return { valid: true, reason: "offline" };
    }

    const payload = data as unknown as VerifyResult;
    return payload ?? { valid: true, reason: "offline" };
  } catch {
    return { valid: true, reason: "offline" };
  }
}

/** Clears the binding so the next login on any device is clean. */
export async function releaseDevice(): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  try {
    await supabase.rpc("release_device");
  } catch {
    /* best effort */
  }
}

/** Full sign-out: release the binding, then end the Supabase session. */
export async function signOutEverywhere(): Promise<void> {
  await releaseDevice();
  const supabase = createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  cachedIdentity = null;
}
