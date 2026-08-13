import { DEFAULT_QUANT_WEIGHTS, type MarketRegime } from '@aizio/trade-shared';
import type { DiscoverySignal } from '@aizio/trade-shared';
import type { ScanCandidate } from './scanner.js';
import { clamp, round } from '../utils/math.js';

export type QuantWeights = typeof DEFAULT_QUANT_WEIGHTS;

export interface QuantResult {
  symbol: string;
  total: number;
  parts: Record<string, number>;
}

export function scoreCandidate(
  candidate: ScanCandidate,
  signals: DiscoverySignal[],
  regime: MarketRegime,
  weights: QuantWeights = DEFAULT_QUANT_WEIGHTS,
): QuantResult {
  const symSignals = signals.filter((s) => s.symbol === candidate.symbol);
  const has = (id: string) => symSignals.find((s) => s.strategyId === id);

  const liquidity = clamp((Math.log10(candidate.quote.value + 1) / 12) * weights.liquidity, 0, weights.liquidity);
  const volumeSurge = has('volume_surge') ? weights.volumeSurge * (has('volume_surge')!.confidence) : 0;
  const tradingValue = has('value_surge') ? weights.tradingValue * (has('value_surge')!.confidence) : clamp((candidate.quote.value / 5e9) * weights.tradingValue, 0, weights.tradingValue);
  const momentum = has('momentum') ? weights.momentum * has('momentum')!.confidence : clamp((candidate.quote.changePct / 3) * weights.momentum, 0, weights.momentum);
  const trend = has('trend') ? weights.trend * has('trend')!.confidence : 0;
  const relativeStrength = has('relative_strength') ? weights.relativeStrength * has('relative_strength')!.confidence : 0;
  const breakoutQuality = has('breakout') ? weights.breakoutQuality * has('breakout')!.confidence : 0;
  const volatility = clamp((1.2 - Math.min(Math.abs(candidate.quote.changePct), 1.2)) * weights.volatility, 0, weights.volatility);
  const marketAlignment =
    regime.includes('BULL') && candidate.quote.changePct > 0
      ? weights.marketAlignment
      : regime.includes('BEAR') && candidate.quote.changePct < 0
        ? weights.marketAlignment * 0.3
        : weights.marketAlignment * 0.5;

  const parts = {
    liquidity: round(liquidity, 2),
    volumeSurge: round(volumeSurge, 2),
    tradingValue: round(tradingValue, 2),
    momentum: round(momentum, 2),
    trend: round(trend, 2),
    relativeStrength: round(relativeStrength, 2),
    breakoutQuality: round(breakoutQuality, 2),
    volatility: round(volatility, 2),
    marketAlignment: round(marketAlignment, 2),
  };
  const total = round(Object.values(parts).reduce((a, b) => a + b, 0), 2);
  return { symbol: candidate.symbol, total, parts };
}
