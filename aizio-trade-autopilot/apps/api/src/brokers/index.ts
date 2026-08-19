import { env } from '../config/env.js';
import { getMarketDataProvider } from '../marketdata/index.js';
import { PaperBrokerAdapter } from './paperBroker.js';
import { TossBrokerAdapter, createTossBroker } from './tossBroker.js';
import type { BrokerAdapter } from './types.js';

let paper: PaperBrokerAdapter | null = null;
let toss: TossBrokerAdapter | null = null;

export function getPaperBroker(capital?: number): PaperBrokerAdapter {
  if (!paper) {
    paper = new PaperBrokerAdapter(getMarketDataProvider(), capital ?? env.DEFAULT_CAPITAL);
  }
  return paper;
}

export function getTossBroker(): TossBrokerAdapter {
  if (!toss) toss = createTossBroker();
  return toss;
}

export function getActiveBroker(mode: 'PAPER' | 'LIVE'): BrokerAdapter {
  return mode === 'LIVE' ? getTossBroker() : getPaperBroker();
}

export * from './types.js';
export { PaperBrokerAdapter } from './paperBroker.js';
export { TossBrokerAdapter } from './tossBroker.js';
