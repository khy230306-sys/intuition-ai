import type { ListedSymbol, MarketDataProvider } from '../marketdata/types.js';
import { quoteToBrokerQuote } from '../marketdata/types.js';
import type { BrokerQuote } from '../brokers/types.js';

export interface ScannerConfig {
  minPrice: number;
  maxPrice: number;
  minVolume: number;
  minValue: number;
  minMarketCap: number;
  maxSpreadPct: number;
  excludeHalted: boolean;
  excludeManaged: boolean;
  excludeNewListing: boolean;
  maxAbsChangePct: number;
  batchSize: number;
  staggerMs: number;
}

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  minPrice: 2000,
  maxPrice: 2_000_000,
  minVolume: 50_000,
  minValue: 500_000_000,
  minMarketCap: 100_000_000_000,
  maxSpreadPct: 1.5,
  excludeHalted: true,
  excludeManaged: true,
  excludeNewListing: false,
  maxAbsChangePct: 25,
  batchSize: 40,
  staggerMs: 50,
};

export interface ScanCandidate {
  symbol: string;
  name: string;
  quote: BrokerQuote;
  marketCap: number;
  spreadPct: number;
}

export class MarketScanner {
  constructor(
    private readonly market: MarketDataProvider,
    private readonly config: ScannerConfig = DEFAULT_SCANNER_CONFIG,
  ) {}

  async scan(
    market: 'KR' | 'US' = 'KR',
    universe?: ListedSymbol[],
  ): Promise<{ scanned: number; candidates: ScanCandidate[]; rejected: Array<{ symbol: string; reason: string }> }> {
    const symbols = universe ?? (await this.market.listSymbols(market));
    const rejected: Array<{ symbol: string; reason: string }> = [];
    const candidates: ScanCandidate[] = [];
    const eligible: ListedSymbol[] = [];

    for (const s of symbols) {
      const reason = this.preFilter(s);
      if (reason) {
        rejected.push({ symbol: s.symbol, reason });
        continue;
      }
      eligible.push(s);
    }

    for (let i = 0; i < eligible.length; i += this.config.batchSize) {
      const batch = eligible.slice(i, i + this.config.batchSize);
      const quotes = await this.market.getQuotes(batch.map((b) => b.symbol));
      const bySym = new Map(quotes.map((q) => [q.symbol, quoteToBrokerQuote(q)]));
      for (const s of batch) {
        const quote = bySym.get(s.symbol);
        if (!quote) {
          rejected.push({ symbol: s.symbol, reason: 'NO_QUOTE' });
          continue;
        }
        const spreadPct = quote.lastPrice > 0 ? ((quote.ask - quote.bid) / quote.lastPrice) * 100 : 99;
        const qReason = this.quoteFilter(quote, spreadPct, s);
        if (qReason) {
          rejected.push({ symbol: s.symbol, reason: qReason });
          continue;
        }
        candidates.push({
          symbol: s.symbol,
          name: s.name,
          quote,
          marketCap: s.marketCap,
          spreadPct,
        });
      }
      if (i + this.config.batchSize < eligible.length && this.config.staggerMs > 0) {
        await new Promise((r) => setTimeout(r, this.config.staggerMs));
      }
    }
    return { scanned: symbols.length, candidates, rejected };
  }

  private preFilter(s: ListedSymbol): string | null {
    if (this.config.excludeHalted && s.halted) return 'HALTED';
    if (this.config.excludeManaged && s.managed) return 'MANAGED';
    if (this.config.excludeNewListing && s.isNewListing) return 'NEW_LISTING';
    if (!s.tradable) return 'NOT_TRADABLE';
    return null;
  }

  private quoteFilter(q: BrokerQuote, spreadPct: number, s: ListedSymbol): string | null {
    if (q.lastPrice < this.config.minPrice || q.lastPrice > this.config.maxPrice) return 'PRICE';
    if (q.volume < this.config.minVolume) return 'LOW_VOLUME';
    if (q.value < this.config.minValue) return 'LOW_VALUE';
    if (s.marketCap > 0 && s.marketCap < this.config.minMarketCap) return 'LOW_MARKET_CAP';
    if (spreadPct > this.config.maxSpreadPct) return 'WIDE_SPREAD';
    if (Math.abs(q.changePct) > this.config.maxAbsChangePct) return 'EXTREME_MOVE';
    return null;
  }
}
