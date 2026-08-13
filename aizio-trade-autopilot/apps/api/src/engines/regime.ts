import type { MarketRegime } from '@aizio/trade-shared';
import type { BrokerQuote } from '../brokers/types.js';

export interface RegimeEngine {
  evaluate(quotes: BrokerQuote[]): { regime: MarketRegime; score: number; notes: string[] };
}

/** Deterministic V1 regime from breadth/momentum of quote changePct + vol proxy. */
export class RuleRegimeEngine implements RegimeEngine {
  evaluate(quotes: BrokerQuote[]) {
    if (!quotes.length) {
      return { regime: 'NEUTRAL' as const, score: 0, notes: ['no-quotes'] };
    }
    const avg = quotes.reduce((s, q) => s + q.changePct, 0) / quotes.length;
    const up = quotes.filter((q) => q.changePct > 0).length / quotes.length;
    const absAvg = Math.abs(avg);
    const notes: string[] = [`avgChange=${avg.toFixed(3)}`, `breadthUp=${(up * 100).toFixed(1)}%`];

    if (absAvg > 1.8) {
      return { regime: 'HIGH_VOLATILITY' as const, score: absAvg, notes };
    }
    if (avg > 1.2 && up > 0.65) return { regime: 'STRONG_BULL' as const, score: avg, notes };
    if (avg > 0.35 && up > 0.55) return { regime: 'BULL' as const, score: avg, notes };
    if (avg < -1.2 && up < 0.35) return { regime: 'STRONG_BEAR' as const, score: avg, notes };
    if (avg < -0.35 && up < 0.45) return { regime: 'BEAR' as const, score: avg, notes };
    return { regime: 'NEUTRAL' as const, score: avg, notes };
  }
}

export const STRATEGY_REGIME_WEIGHTS: Record<MarketRegime, Record<string, number>> = {
  STRONG_BULL: { momentum: 1.4, breakout: 1.3, pullback: 0.8, meanReversion: 0.6, trend: 1.2 },
  BULL: { momentum: 1.2, breakout: 1.2, pullback: 1.0, meanReversion: 0.8, trend: 1.1 },
  NEUTRAL: { momentum: 1.0, breakout: 1.0, pullback: 1.1, meanReversion: 1.2, trend: 1.0 },
  BEAR: { momentum: 0.7, breakout: 0.6, pullback: 1.0, meanReversion: 1.2, trend: 0.8 },
  STRONG_BEAR: { momentum: 0.5, breakout: 0.4, pullback: 0.8, meanReversion: 1.0, trend: 0.6 },
  HIGH_VOLATILITY: { momentum: 0.8, breakout: 0.7, pullback: 0.9, meanReversion: 1.1, trend: 0.8 },
};

export function positionSizeMultiplier(regime: MarketRegime): number {
  if (regime === 'HIGH_VOLATILITY') return 0.5;
  if (regime === 'STRONG_BEAR' || regime === 'BEAR') return 0.6;
  if (regime === 'STRONG_BULL') return 1.1;
  return 1.0;
}
