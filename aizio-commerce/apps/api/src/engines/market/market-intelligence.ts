import type { MarketSnapshot } from "../../shared/types.ts";
import { median } from "../../shared/money.ts";
import { nowIso } from "../../shared/ids.ts";

export interface MarketObservation {
  channel: string;
  prices: number[];
  competitorCount: number | null;
  source: string;
  capturedAt?: string;
}

/**
 * Only uses caller-supplied observed prices from connected APIs.
 * Never fabricates market numbers.
 */
export function buildMarketSnapshot(productId: string, observations: MarketObservation[]): MarketSnapshot {
  if (observations.length === 0) {
    return {
      productId,
      channel: "NONE",
      observedPrices: [],
      medianPrice: null,
      minPrice: null,
      maxPrice: null,
      competitorCount: null,
      demandSignals: [],
      confidence: 0,
      capturedAt: nowIso(),
      source: "NONE",
      freshness: "UNKNOWN",
    };
  }
  const prices = observations.flatMap((o) => o.prices.filter((p) => Number.isFinite(p) && p > 0));
  const competitorCount = observations.reduce<number | null>((acc, o) => {
    if (o.competitorCount === null) return acc;
    return (acc ?? 0) + o.competitorCount;
  }, null);
  return {
    productId,
    channel: observations.map((o) => o.channel).join(","),
    observedPrices: prices,
    medianPrice: median(prices),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    competitorCount,
    demandSignals: [],
    confidence: prices.length >= 3 ? 0.7 : prices.length > 0 ? 0.4 : 0,
    capturedAt: nowIso(),
    source: observations.map((o) => o.source).join(","),
    freshness: prices.length ? "LIVE" : "UNKNOWN",
  };
}
