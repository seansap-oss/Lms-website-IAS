"use client";

const STORAGE_KEY = "ibemhal.la.session";
const SALT = "IbemhalIAS::LocalAdmin::v1";
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export const LOCAL_ADMIN_PASSCODE = "localadmin@123";
export const LONG_PRESS_MS = 5000;

interface SessionPayload {
  h: string;
  exp: number;
  iat: number;
}

/** FNV-1a → hex. Obfuscation only; the real guard is Supabase RLS + middleware. */
function hash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ ch, 0x85ebca6b) + i) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

function encode(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  let out = "";
  for (let i = 0; i < json.length; i++) {
    out += String.fromCharCode(json.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length));
  }
  return typeof window === "undefined" ? out : window.btoa(out);
}

function decode(raw: string): SessionPayload | null {
  try {
    const xored = window.atob(raw);
    let json = "";
    for (let i = 0; i < xored.length; i++) {
      json += String.fromCharCode(xored.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length));
    }
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export function verifyPasscode(input: string): boolean {
  return hash(input.trim() + SALT) === hash(LOCAL_ADMIN_PASSCODE + SALT);
}

export function createLocalAdminSession(passcode: string): boolean {
  if (!verifyPasscode(passcode)) return false;
  if (typeof window === "undefined") return false;

  const now = Date.now();
  const payload: SessionPayload = {
    h: hash(passcode + SALT + now.toString(36)),
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  window.sessionStorage.setItem(STORAGE_KEY, encode(payload));
  return true;
}

export function hasLocalAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  const payload = decode(raw);
  if (!payload || Date.now() > payload.exp) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return false;
  }
  return true;
}

export function clearLocalAdminSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function sessionExpiresIn(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return 0;
  const payload = decode(raw);
  return payload ? Math.max(0, payload.exp - Date.now()) : 0;
}
