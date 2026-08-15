import type { FxStatus } from "../../shared/types.ts";
import { fetchUsdKrw } from "./frankfurter.ts";

export interface CurrencyQuote {
  from: string;
  to: string;
  rate: number;
  source: string;
  capturedAt: string;
  freshness: "LIVE" | "MANUAL";
  status: Exclude<FxStatus, "FX_RATE_NOT_CONFIGURED">;
}

export interface CurrencyService {
  resolveUsdKrw(): Promise<
    { ok: true; quote: CurrencyQuote } | { ok: false; status: "FX_RATE_NOT_CONFIGURED"; error: string }
  >;
}

export function createCurrencyService(opts: {
  provider: "none" | "manual" | "frankfurter";
  manualUsdKrw: number | null;
}): CurrencyService {
  return {
    async resolveUsdKrw() {
      if (opts.provider === "manual") {
        if (opts.manualUsdKrw === null || !Number.isFinite(opts.manualUsdKrw) || opts.manualUsdKrw <= 0) {
          return { ok: false, status: "FX_RATE_NOT_CONFIGURED", error: "수동 환율이 비어 있습니다." };
        }
        return {
          ok: true,
          quote: {
            from: "USD",
            to: "KRW",
            rate: opts.manualUsdKrw,
            source: "SETTINGS_MANUAL_RATE",
            capturedAt: new Date().toISOString(),
            freshness: "MANUAL",
            status: "MANUAL_RATE",
          },
        };
      }
      if (opts.provider === "frankfurter") {
        const live = await fetchUsdKrw();
        if (!live.ok) {
          return { ok: false, status: "FX_RATE_NOT_CONFIGURED", error: live.error };
        }
        return {
          ok: true,
          quote: {
            from: live.quote.from,
            to: live.quote.to,
            rate: live.quote.rate,
            source: live.quote.source,
            capturedAt: live.quote.capturedAt,
            freshness: "LIVE",
            status: "LIVE",
          },
        };
      }
      return {
        ok: false,
        status: "FX_RATE_NOT_CONFIGURED",
        error: "환율 Provider가 설정되지 않았습니다.",
      };
    },
  };
}
