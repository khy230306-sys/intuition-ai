import type { DiscoverySignal, MarketRegime } from '@aizio/trade-shared';
import type { ScanCandidate } from './scanner.js';
import { STRATEGY_REGIME_WEIGHTS } from './regime.js';
import { clamp, round } from '../utils/math.js';

export interface DiscoveryEngine {
  readonly strategyId: string;
  detect(candidates: ScanCandidate[], regime: MarketRegime): DiscoverySignal[];
}

function base(symbol: string, strategyId: string, score: number, confidence: number, evidence: DiscoverySignal['evidence'], invalidation?: string[]): DiscoverySignal {
  return {
    symbol,
    strategyId,
    score: round(clamp(score, 0, 100), 2),
    confidence: round(clamp(confidence, 0, 1), 3),
    detectedAt: new Date().toISOString(),
    evidence,
    invalidation,
  };
}

export class VolumeSurgeEngine implements DiscoveryEngine {
  readonly strategyId = 'volume_surge';
  detect(candidates: ScanCandidate[], regime: MarketRegime) {
    const w = STRATEGY_REGIME_WEIGHTS[regime].momentum ?? 1;
    const med = median(candidates.map((c) => c.quote.volume)) || 1;
    return candidates
      .filter((c) => c.quote.volume > med * 1.8)
      .map((c) =>
        base(
          c.symbol,
          this.strategyId,
          (c.quote.volume / med) * 20 * w,
          clamp(c.quote.volume / med / 5, 0.3, 0.95),
          [{ metric: 'volume_vs_median', value: round(c.quote.volume / med, 2), reason: '거래량 급증' }],
          ['volume_fade'],
        ),
      );
  }
}

export class ValueSurgeEngine implements DiscoveryEngine {
  readonly strategyId = 'value_surge';
  detect(candidates: ScanCandidate[], regime: MarketRegime) {
    const med = median(candidates.map((c) => c.quote.value)) || 1;
    return candidates
      .filter((c) => c.quote.value > med * 1.6)
      .map((c) =>
        base(
          c.symbol,
          this.strategyId,
          (c.quote.value / med) * 18,
          clamp(c.quote.value / med / 4, 0.3, 0.9),
          [{ metric: 'value_vs_median', value: round(c.quote.value / med, 2), reason: '거래대금 급증' }],
        ),
      );
  }
}

export class BreakoutEngine implements DiscoveryEngine {
  readonly strategyId = 'breakout';
  detect(candidates: ScanCandidate[], regime: MarketRegime) {
    const w = STRATEGY_REGIME_WEIGHTS[regime].breakout ?? 1;
    return candidates
      .filter((c) => c.quote.changePct >= 1.5)
      .map((c) =>
        base(
          c.symbol,
          this.strategyId,
          c.quote.changePct * 12 * w,
          clamp(c.quote.changePct / 5, 0.35, 0.9),
          [{ metric: 'changePct', value: c.quote.changePct, reason: '상승 돌파' }],
          ['failed_breakout'],
        ),
      );
  }
}

export class MomentumEngine implements DiscoveryEngine {
  readonly strategyId = 'momentum';
  detect(candidates: ScanCandidate[], regime: MarketRegime) {
    const w = STRATEGY_REGIME_WEIGHTS[regime].momentum ?? 1;
    return candidates
      .filter((c) => c.quote.changePct > 0.6 && c.quote.volume > 100_000)
      .map((c) =>
        base(
          c.symbol,
          this.strategyId,
          (c.quote.changePct * 10 + Math.log10(c.quote.volume) * 2) * w,
          clamp(c.quote.changePct / 4, 0.3, 0.92),
          [{ metric: 'momentum', value: c.quote.changePct, reason: '모멘텀' }],
        ),
      );
  }
}

export class PullbackEngine implements DiscoveryEngine {
  readonly strategyId = 'pullback';
  detect(candidates: ScanCandidate[], regime: MarketRegime) {
    const w = STRATEGY_REGIME_WEIGHTS[regime].pullback ?? 1;
    return candidates
      .filter((c) => c.quote.changePct < -0.8 && c.quote.changePct > -4)
      .map((c) =>
        base(
          c.symbol,
          this.strategyId,
          (3 + c.quote.changePct) * 10 * w,
          0.45,
          [{ metric: 'pullback', value: c.quote.changePct, reason: '조정 후 관심' }],
        ),
      );
  }
}

export class RelativeStrengthEngine implements DiscoveryEngine {
  readonly strategyId = 'relative_strength';
  detect(candidates: ScanCandidate[]) {
    const avg = candidates.reduce((s, c) => s + c.quote.changePct, 0) / (candidates.length || 1);
    return candidates
      .filter((c) => c.quote.changePct > avg + 0.8)
      .map((c) =>
        base(
          c.symbol,
          this.strategyId,
          (c.quote.changePct - avg) * 15,
          0.5,
          [{ metric: 'rs_vs_market', value: round(c.quote.changePct - avg, 3), reason: '상대강도' }],
        ),
      );
  }
}

export class TrendEngine implements DiscoveryEngine {
  readonly strategyId = 'trend';
  detect(candidates: ScanCandidate[], regime: MarketRegime) {
    const w = STRATEGY_REGIME_WEIGHTS[regime].trend ?? 1;
    return candidates
      .filter((c) => c.quote.changePct > 0.3 && c.spreadPct < 0.5)
      .map((c) =>
        base(
          c.symbol,
          this.strategyId,
          (c.quote.changePct * 8 + (0.5 - c.spreadPct) * 20) * w,
          0.48,
          [{ metric: 'trend_quality', value: c.quote.changePct, reason: '추세+타이트스프레드' }],
        ),
      );
  }
}

export class VolatilityExpansionEngine implements DiscoveryEngine {
  readonly strategyId = 'volatility_expansion';
  detect(candidates: ScanCandidate[]) {
    return candidates
      .filter((c) => Math.abs(c.quote.changePct) > 1.2)
      .map((c) =>
        base(
          c.symbol,
          this.strategyId,
          Math.abs(c.quote.changePct) * 10,
          0.4,
          [{ metric: 'abs_change', value: Math.abs(c.quote.changePct), reason: '변동성 확장' }],
        ),
      );
  }
}

export class MeanReversionEngine implements DiscoveryEngine {
  readonly strategyId = 'mean_reversion';
  detect(candidates: ScanCandidate[], regime: MarketRegime) {
    const w = STRATEGY_REGIME_WEIGHTS[regime].meanReversion ?? 1;
    return candidates
      .filter((c) => c.quote.changePct <= -1.5)
      .map((c) =>
        base(
          c.symbol,
          this.strategyId,
          Math.abs(c.quote.changePct) * 9 * w,
          0.42,
          [{ metric: 'oversold_move', value: c.quote.changePct, reason: '과매도 반전 후보' }],
        ),
      );
  }
}

export class EventNewsEngine implements DiscoveryEngine {
  readonly strategyId = 'event_news';
  /** V1 structure only — Tier4 alone never triggers live entry. */
  detect(candidates: ScanCandidate[]) {
    return candidates.slice(0, 0).map((c) =>
      base(c.symbol, this.strategyId, 0, 0, [{ metric: 'news', value: 'TODO_PROVIDER_IMPLEMENTATION', reason: '뉴스/공시 수집 구조 예약' }]),
    );
  }
}

export const ALL_DISCOVERY_ENGINES: DiscoveryEngine[] = [
  new VolumeSurgeEngine(),
  new ValueSurgeEngine(),
  new BreakoutEngine(),
  new MomentumEngine(),
  new PullbackEngine(),
  new RelativeStrengthEngine(),
  new TrendEngine(),
  new VolatilityExpansionEngine(),
  new MeanReversionEngine(),
  new EventNewsEngine(),
];

export function runDiscovery(candidates: ScanCandidate[], regime: MarketRegime): DiscoverySignal[] {
  const signals: DiscoverySignal[] = [];
  for (const eng of ALL_DISCOVERY_ENGINES) {
    signals.push(...eng.detect(candidates, regime));
  }
  return signals.sort((a, b) => b.score - a.score);
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
