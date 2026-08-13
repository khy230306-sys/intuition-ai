import type { BrokerQuote } from '../brokers/types.js';

export interface ListedSymbol {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
  securityType: string;
  halted: boolean;
  managed: boolean;
  isNewListing: boolean;
  basePrice: number;
  marketCap: number;
}

export interface MarketDataProvider {
  readonly name: string;
  readonly status: 'OK' | 'REPLAY' | 'NOT_CONFIGURED' | 'DEGRADED' | 'ERROR';
  listSymbols(market?: 'KR' | 'US'): Promise<ListedSymbol[]>;
  getQuote(symbol: string): Promise<BrokerQuote>;
  getQuotes(symbols: string[]): Promise<BrokerQuote[]>;
}
