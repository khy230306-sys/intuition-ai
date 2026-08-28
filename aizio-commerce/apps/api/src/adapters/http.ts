import type { ConnectionStatus, ProviderStatus } from "../shared/types.ts";

export interface HttpResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  rawText: string;
  error: string | null;
  timedOut: boolean;
}

export class AdapterError extends Error {
  constructor(
    message: string,
    readonly status: ConnectionStatus | ProviderStatus,
    readonly httpStatus?: number,
  ) {
    super(message);
  }
}

export function mapHttpToProvider(status: number, timedOut: boolean): ProviderStatus {
  if (timedOut) return "UNAVAILABLE";
  if (status === 401 || status === 403) return "AUTH_FAILED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "DEGRADED";
  if (status >= 400) return "UNAVAILABLE";
  return "READY";
}

export function mapHttpToConnection(status: number, timedOut: boolean): ConnectionStatus {
  if (timedOut) return "UNAVAILABLE";
  if (status === 401 || status === 403) return "AUTH_FAILED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "DEGRADED";
  if (status >= 400) return "UNAVAILABLE";
  return "READY";
}

export async function requestJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<HttpResult<T>> {
  const timeoutMs = init.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const rawText = await res.text();
    let data: T | null = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText) as T;
      } catch {
        return {
          ok: false,
          status: res.status,
          data: null,
          rawText,
          error: "malformed_json",
          timedOut: false,
        };
      }
    }
    return {
      ok: res.ok,
      status: res.status,
      data,
      rawText,
      error: res.ok ? null : `http_${res.status}`,
      timedOut: false,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: 0,
      data: null,
      rawText: "",
      error: timedOut ? "timeout" : err instanceof Error ? err.message : "network_error",
      timedOut,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase();
    if (key.includes("authorization") || key.includes("token") || key.includes("key") || key.includes("secret")) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = v;
    }
  }
  return out;
}
