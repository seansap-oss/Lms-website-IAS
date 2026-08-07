import { PROVIDERS, type AIProvider } from "./providers";

export const REQUEST_TIMEOUT_MS = 10_000;

export interface FallbackEvent {
  tier: number;
  provider: string;
  status: "success" | "skipped_no_key" | "rate_limited" | "timeout" | "error";
  httpStatus?: number;
  reason?: string;
  latencyMs: number;
}

export interface RouterResult {
  text: string;
  servedBy: string | null;
  servedByTier: number | null;
  trace: FallbackEvent[];
  degraded: boolean;
}

const RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);

async function callProvider(
  provider: AIProvider,
  system: string,
  user: string,
  jsonMode: boolean
): Promise<{ text: string; httpStatus: number }> {
  const apiKey = process.env[provider.envKey] as string;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: provider.buildHeaders(apiKey),
      body: JSON.stringify(provider.buildBody(system, user, jsonMode)),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      const err = new Error(
        `HTTP ${response.status}: ${errorBody.slice(0, 200)}`
      ) as Error & { httpStatus: number };
      err.httpStatus = response.status;
      throw err;
    }

    const data = await response.json();
    const text = provider.parseResponse(data);

    if (!text || !text.trim()) {
      const err = new Error("Empty completion returned") as Error & {
        httpStatus: number;
      };
      err.httpStatus = 502;
      throw err;
    }

    return { text, httpStatus: response.status };
  } finally {
    clearTimeout(timer);
  }
}

function classify(error: unknown): {
  status: FallbackEvent["status"];
  httpStatus?: number;
  reason: string;
} {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return { status: "timeout", reason: `Timed out after ${REQUEST_TIMEOUT_MS}ms` };
    }
    const httpStatus = (error as Error & { httpStatus?: number }).httpStatus;
    if (httpStatus === 429) {
      return { status: "rate_limited", httpStatus, reason: "Rate limited / quota exhausted" };
    }
    if (httpStatus === 401 || httpStatus === 403) {
      return { status: "error", httpStatus, reason: "Invalid or expired API key" };
    }
    if (httpStatus === 402) {
      return { status: "error", httpStatus, reason: "Out of credits" };
    }
    return { status: "error", httpStatus, reason: error.message };
  }
  return { status: "error", reason: "Unknown error" };
}

export async function runWithFallback(
  system: string,
  user: string,
  options: { jsonMode?: boolean; startTier?: number } = {}
): Promise<RouterResult> {
  const { jsonMode = false, startTier = 1 } = options;
  const trace: FallbackEvent[] = [];

  const chain = PROVIDERS.filter((p) => p.tier >= startTier).sort(
    (a, b) => a.tier - b.tier
  );

  for (const provider of chain) {
    const started = Date.now();

    if (!process.env[provider.envKey]) {
      trace.push({
        tier: provider.tier,
        provider: provider.name,
        status: "skipped_no_key",
        reason: `${provider.envKey} not set`,
        latencyMs: 0,
      });
      continue;
    }

    try {
      const { text, httpStatus } = await callProvider(provider, system, user, jsonMode);
      trace.push({
        tier: provider.tier,
        provider: provider.name,
        status: "success",
        httpStatus,
        latencyMs: Date.now() - started,
      });
      return {
        text,
        servedBy: provider.name,
        servedByTier: provider.tier,
        trace,
        degraded: false,
      };
    } catch (error) {
      const classified = classify(error);
      trace.push({
        tier: provider.tier,
        provider: provider.name,
        ...classified,
        latencyMs: Date.now() - started,
      });

      const isRetryable =
        classified.status === "timeout" ||
        classified.status === "rate_limited" ||
        !classified.httpStatus ||
        RETRYABLE_STATUSES.has(classified.httpStatus) ||
        classified.httpStatus === 401 ||
        classified.httpStatus === 402 ||
        classified.httpStatus === 403;

      if (!isRetryable) {
        continue;
      }
    }
  }

  return {
    text: "",
    servedBy: null,
    servedByTier: null,
    trace,
    degraded: true,
  };
}

export function extractJson<T>(raw: string): T | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf("{");
    const firstArr = cleaned.indexOf("[");
    const start =
      first === -1 ? firstArr : firstArr === -1 ? first : Math.min(first, firstArr);
    const lastObj = cleaned.lastIndexOf("}");
    const lastArr = cleaned.lastIndexOf("]");
    const end = Math.max(lastObj, lastArr);
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}
