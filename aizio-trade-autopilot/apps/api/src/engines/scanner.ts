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

export interface FunnelStage {
  name: string;
  count: number;
  ms: number;
}

export interface ScanFunnel {
  stages: FunnelStage[];
  /** e.g. 2400 → 1180 → 143 → 38 → 11 → 4 — never hardcoded */
  chain: number[];
}

export class MarketScanner {
  constructor(
    private readonly market: MarketDataProvider,
    private readonly config: ScannerConfig = DEFAULT_SCANNER_CONFIG,
  ) {}

  async scan(
    market: 'KR' | 'US' = 'KR',
    universe?: ListedSymbol[],
  ): Promise<{
    scanned: number;
    candidates: ScanCandidate[];
    rejected: Array<{ symbol: string; reason: string }>;
    funnel: ScanFunnel;
  }> {
    const tAll = Date.now();
    const symbols = universe ?? (await this.market.listSymbols(market));
    const rejected: Array<{ symbol: string; reason: string }> = [];
    const candidates: ScanCandidate[] = [];
    const eligible: ListedSymbol[] = [];

    const t0 = Date.now();
    for (const s of symbols) {
      const reason = this.preFilter(s);
      if (reason) {
        rejected.push({ symbol: s.symbol, reason });
        continue;
      }
      eligible.push(s);
    }
    const liquidityMs = Date.now() - t0;

    let afterVolumeValue = 0;
    let afterMomentum = 0;
    const tQuote = Date.now();

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

        const liqFail = this.liquidityQuoteFilter(quote, spreadPct, s);
        if (liqFail) {
          rejected.push({ symbol: s.symbol, reason: liqFail });
          continue;
        }

        const vvFail = this.volumeValueFilter(quote);
        if (vvFail) {
          rejected.push({ symbol: s.symbol, reason: vvFail });
          continue;
        }
        afterVolumeValue += 1;

        const momFail = this.momentumFilter(quote);
        if (momFail) {
          rejected.push({ symbol: s.symbol, reason: momFail });
          continue;
        }
        afterMomentum += 1;

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
    const quoteMs = Date.now() - tQuote;

    const funnel: ScanFunnel = {
      stages: [
        { name: 'universe', count: symbols.length, ms: 0 },
        { name: 'liquidity', count: eligible.length, ms: liquidityMs },
        { name: 'volume_value', count: afterVolumeValue, ms: quoteMs },
        { name: 'momentum', count: afterMomentum, ms: 0 },
        { name: 'discovery_input', count: candidates.length, ms: Date.now() - tAll },
      ],
      chain: [symbols.length, eligible.length, afterVolumeValue, afterMomentum, candidates.length],
    };

    return { scanned: symbols.length, candidates, rejected, funnel };
  }

  private preFilter(s: ListedSymbol): string | null {
    if (this.config.excludeHalted && s.halted) return 'HALTED';
    if (this.config.excludeManaged && s.managed) return 'MANAGED';
    if (this.config.excludeNewListing && s.isNewListing) return 'NEW_LISTING';
    if (!s.tradable) return 'NOT_TRADABLE';
    return null;
  }

  private liquidityQuoteFilter(q: BrokerQuote, spreadPct: number, s: ListedSymbol): string | null {
    if (q.lastPrice < this.config.minPrice || q.lastPrice > this.config.maxPrice) return 'PRICE';
    if (s.marketCap > 0 && s.marketCap < this.config.minMarketCap) return 'LOW_MARKET_CAP';
    if (spreadPct > this.config.maxSpreadPct) return 'WIDE_SPREAD';
    return null;
  }

  private volumeValueFilter(q: BrokerQuote): string | null {
    if (q.volume < this.config.minVolume) return 'LOW_VOLUME';
    if (q.value < this.config.minValue) return 'LOW_VALUE';
    return null;
  }

  private momentumFilter(q: BrokerQuote): string | null {
    if (Math.abs(q.changePct) > this.config.maxAbsChangePct) return 'EXTREME_MOVE';
    // Keep names with some absolute move for discovery; zero-move still passes to discovery engines
    if (Number.isNaN(q.changePct)) return 'BAD_MOMENTUM';
    return null;
  }
}
