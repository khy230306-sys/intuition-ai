import type { TradingMode } from '@aizio/trade-shared';
import { env } from '../config/env.js';
import { getReplayProvider, resolveMarketDataProvider } from '../marketdata/index.js';
import { PaperBrokerAdapter } from './paperBroker.js';
import { TossBrokerAdapter, createTossBroker } from './tossBroker.js';
import type { BrokerAdapter } from './types.js';

let paper: PaperBrokerAdapter | null = null;
let toss: TossBrokerAdapter | null = null;

export function getPaperBroker(capital?: number): PaperBrokerAdapter {
  if (!paper) {
    // Paper execution can use replay or live quotes depending on mode; default construct with replay.
    paper = new PaperBrokerAdapter(getReplayProvider(), capital ?? env.DEFAULT_CAPITAL);
  }
  return paper;
}

/** Bind paper broker to a specific market data provider (SHADOW uses live quotes). */
export function rebindPaperMarketData(mode: TradingMode) {
  const broker = getPaperBroker();
  try {
    const provider = resolveMarketDataProvider(mode === 'SHADOW' ? 'SHADOW' : 'PAPER_REPLAY');
    broker.setMarketProvider(provider);
  } catch {
    broker.setMarketProvider(getReplayProvider());
  }
  return broker;
}

export function getTossBroker(): TossBrokerAdapter {
  if (!toss) toss = createTossBroker();
  return toss;
}

export function getActiveBroker(mode: TradingMode): BrokerAdapter {
  if (mode === 'LIVE') return getTossBroker();
  // LIVE_OBSERVE uses toss for reads but must not place orders via strategy path
  if (mode === 'LIVE_OBSERVE') return getTossBroker();
  // PAPER / PAPER_REPLAY / SHADOW execute via paper
  return getPaperBroker();
}

export function executionMode(mode: TradingMode): 'PAPER' | 'LIVE' {
  return mode === 'LIVE' ? 'LIVE' : 'PAPER';
}

export * from './types.js';
export { PaperBrokerAdapter } from './paperBroker.js';
export { TossBrokerAdapter } from './tossBroker.js';
export { getTossConnection, TossConnectionManager } from './tossConnection.js';
