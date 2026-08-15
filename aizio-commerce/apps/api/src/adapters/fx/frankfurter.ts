import { requestJson } from "../http.ts";

export interface FxQuote {
  from: string;
  to: string;
  rate: number;
  capturedAt: string;
  source: string;
  freshness: "LIVE";
}

/** Frankfurter — ECB published rates, no API key. */
export async function fetchUsdKrw(): Promise<
  { ok: true; quote: FxQuote } | { ok: false; error: string; freshness: "UNKNOWN" }
> {
  const res = await requestJson<{ rates?: { KRW?: number }; date?: string }>(
    "https://api.frankfurter.app/latest?from=USD&to=KRW",
    { timeoutMs: 8000 },
  );
  const rate = res.data?.rates?.KRW;
  if (!res.ok || !rate || !Number.isFinite(rate)) {
    return { ok: false, error: res.error ?? "환율 조회 실패", freshness: "UNKNOWN" };
  }
  return {
    ok: true,
    quote: {
      from: "USD",
      to: "KRW",
      rate,
      capturedAt: new Date().toISOString(),
      source: `frankfurter.app/${res.data?.date ?? "latest"}`,
      freshness: "LIVE",
    },
  };
}
