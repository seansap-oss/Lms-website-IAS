import { isNativePlatform } from "./native";

const REMOTE_API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://ibemhal-ias-lms.vercel.app";

/**
 * Inside the Capacitor APK the app is served from the local filesystem, so
 * relative /api/* calls have no server. Route those to the deployed Vercel
 * backend. On web (SSR or browser) relative paths are used as normal.
 */
export function apiUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined" && isNativePlatform()) {
    return `${REMOTE_API}${clean}`;
  }
  return clean;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
