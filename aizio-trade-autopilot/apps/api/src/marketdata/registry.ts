import type { TradingMode } from '@aizio/trade-shared';
import { env, tossConfigured } from '../config/env.js';
import { ReplayMarketDataProvider } from './replayProvider.js';
import { TossMarketDataProvider } from './tossProvider.js';
import type { MarketDataProvider } from './types.js';

export class MarketDataNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketDataNotAvailableError';
  }
}

const replay = new ReplayMarketDataProvider();
const toss = new TossMarketDataProvider();

export function modeNeedsLiveData(mode: TradingMode): boolean {
  return mode === 'SHADOW' || mode === 'LIVE_OBSERVE' || mode === 'LIVE';
}

export function modeAllowsReplay(mode: TradingMode): boolean {
  return mode === 'PAPER' || mode === 'PAPER_REPLAY';
}

/**
 * Resolve provider. Critical rule:
 * If LIVE/SHADOW/LIVE_OBSERVE requested, NEVER silently fall back to REPLAY.
 */
export function resolveMarketDataProvider(mode: TradingMode): MarketDataProvider {
  const explicit = env.MARKET_DATA_PROVIDER;

  if (explicit === 'replay') {
    if (modeNeedsLiveData(mode)) {
      throw new MarketDataNotAvailableError(
        'REPLAY_FALLBACK_PROHIBITED: live/shadow/observe mode cannot use replay',
      );
    }
    return replay;
  }

  if (explicit === 'toss' || modeNeedsLiveData(mode)) {
    if (!tossConfigured()) {
      throw new MarketDataNotAvailableError('TOSS_NOT_CONFIGURED: live market data required');
    }
    return toss;
  }

  // auto + paper modes
  if (modeAllowsReplay(mode)) return replay;
  if (tossConfigured()) return toss;
  throw new MarketDataNotAvailableError('NO_MARKET_DATA_PROVIDER');
}

export function getReplayProvider(): ReplayMarketDataProvider {
  return replay;
}

export function getTossMarketDataProvider(): TossMarketDataProvider {
  return toss;
}

/** Backward-compatible helper used by older call sites (paper default). */
export function getMarketDataProvider(): MarketDataProvider {
  try {
    return resolveMarketDataProvider(env.DEFAULT_MODE as TradingMode);
  } catch {
    return replay;
  }
}
