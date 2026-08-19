import { env, tossConfigured } from '../config/env.js';
import { ReplayMarketDataProvider } from './replayProvider.js';
import type { MarketDataProvider } from './types.js';

let cached: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (cached) return cached;
  if (env.MARKET_DATA_PROVIDER === 'toss' && tossConfigured()) {
    // Toss-backed market data is provided via TossBrokerAdapter quotes when LIVE/connected.
    // Until credentials exist, fall back to replay with explicit status.
    cached = new ReplayMarketDataProvider();
    return cached;
  }
  cached = new ReplayMarketDataProvider();
  return cached;
}

export * from './types.js';
export { ReplayMarketDataProvider } from './replayProvider.js';
