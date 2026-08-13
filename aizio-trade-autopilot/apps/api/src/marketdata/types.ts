import type { MarketStatus, Quote } from '@aizio/trade-shared';

export interface ListedSymbol {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
  exchange: string; // KOSPI | KOSDAQ | ...
  securityType: string;
  tradable: boolean;
  status: string; // ACTIVE | ...
  halted: boolean;
  managed: boolean;
  isNewListing: boolean;
  isCommonShare: boolean;
  nxtSupported?: boolean;
  basePrice: number;
  marketCap: number;
  updatedAt: string;
}

export interface MarketDataProvider {
  readonly name: string;
  readonly status: 'LIVE' | 'REPLAY' | 'NOT_CONFIGURED' | 'DEGRADED' | 'ERROR';
  listSymbols(market?: 'KR' | 'US'): Promise<ListedSymbol[]>;
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getMarketStatus(): Promise<MarketStatus>;
}

/** Adapter from Quote → legacy BrokerQuote shape used by engines */
export function quoteToBrokerQuote(q: Quote) {
  return {
    symbol: q.symbol,
    lastPrice: q.price,
    bid: q.bid,
    ask: q.ask,
    volume: q.volume,
    value: q.tradingValue,
    changePct: q.changePct,
    timestamp: new Date(q.marketTimestamp),
    source: q.source,
    freshnessMs: q.ageMs,
  };
}
