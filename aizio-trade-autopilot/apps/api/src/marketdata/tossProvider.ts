import type { MarketStatus, Quote } from '@aizio/trade-shared';
import { getTossConnection } from '../brokers/tossConnection.js';
import { getKrVenueSessions, getKrVenueSessionsAsync } from '../engines/marketSession.js';
import { tossConfigured } from '../config/env.js';
import type { ListedSymbol, MarketDataProvider } from './types.js';
import { emitEvent } from '../services/events.js';

export class TossMarketDataProvider implements MarketDataProvider {
  readonly name = 'toss';
  private _status: 'LIVE' | 'NOT_CONFIGURED' | 'DEGRADED' | 'ERROR' = 'NOT_CONFIGURED';
  private quoteCache = new Map<string, { quote: Quote; at: number }>();
  private cacheTtlMs = 2_000;

  get status() {
    if (!tossConfigured()) return 'NOT_CONFIGURED' as const;
    return this._status;
  }

  async listSymbols(market: 'KR' | 'US' = 'KR'): Promise<ListedSymbol[]> {
    const conn = getTossConnection();
    if (!conn.isConfigured()) {
      this._status = 'NOT_CONFIGURED';
      throw new Error('TOSS_NOT_CONFIGURED');
    }
    const markets = market === 'KR' ? (['KOSPI', 'KOSDAQ'] as const) : (['NYSE', 'NASDAQ', 'AMEX'] as const);
    const out: ListedSymbol[] = [];
    const now = new Date().toISOString();
    for (const mkt of markets) {
      const data = await conn.api<{ result?: { stocks?: Array<Record<string, unknown>> }; stocks?: Array<Record<string, unknown>> }>(
        'GET',
        `/api/v1/stocks/all?market=${mkt}&status=ACTIVE`,
        'STOCK_ALL',
        false,
      );
      const stocks = data.result?.stocks ?? data.stocks ?? [];
      // Response may be bare array
      const list = Array.isArray(data) ? data : Array.isArray((data as { result?: unknown }).result)
        ? ((data as { result: unknown[] }).result as Array<Record<string, unknown>>)
        : stocks;
      for (const s of list as Array<Record<string, unknown>>) {
        out.push({
          symbol: String(s.symbol),
          name: String(s.name ?? s.symbol),
          market,
          exchange: mkt,
          securityType: String(s.securityType ?? 'STOCK'),
          tradable: true,
          status: 'ACTIVE',
          halted: false,
          managed: false,
          isNewListing: false,
          isCommonShare: Boolean(s.isCommonShare ?? true),
          basePrice: 0,
          marketCap: 0,
          updatedAt: now,
        });
      }
    }
    this._status = 'LIVE';
    return out;
  }

  async getQuote(symbol: string): Promise<Quote> {
    const cached = this.quoteCache.get(symbol);
    if (cached && Date.now() - cached.at < this.cacheTtlMs) return cached.quote;
    const quotes = await this.getQuotes([symbol]);
    if (!quotes[0]) throw new Error(`QUOTE_NOT_FOUND:${symbol}`);
    return quotes[0];
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const conn = getTossConnection();
    if (!conn.isConfigured()) {
      this._status = 'NOT_CONFIGURED';
      throw new Error('TOSS_NOT_CONFIGURED');
    }
    try {
      const out: Quote[] = [];
      // Official: max 200 symbols per /api/v1/prices call
      for (let i = 0; i < symbols.length; i += 200) {
        const chunk = symbols.slice(i, i + 200);
        const priceRes = await conn.api<unknown>(
          'GET',
          `/api/v1/prices?symbols=${encodeURIComponent(chunk.join(','))}`,
          'MARKET_DATA',
          false,
        );
        const prices = unwrapList(priceRes, 'prices');
        const receivedAt = new Date();
        for (const p of prices) {
          const symbol = String(p.symbol);
          let bid = Number(p.lastPrice);
          let ask = Number(p.lastPrice);
          try {
            const bookRes = await conn.api<unknown>(
              'GET',
              `/api/v1/orderbook?symbol=${encodeURIComponent(symbol)}`,
              'MARKET_DATA',
              false,
            );
            const book = unwrapObj(bookRes);
            bid = Number((book.bids as Array<{ price: string }>)?.[0]?.price ?? bid);
            ask = Number((book.asks as Array<{ price: string }>)?.[0]?.price ?? ask);
          } catch {
            // price-only fallback still LIVE; spread unknown
          }
          const marketTs = p.timestamp ? new Date(String(p.timestamp)) : receivedAt;
          const quote: Quote = {
            symbol,
            price: Number(p.lastPrice),
            bid,
            ask,
            volume: 0,
            tradingValue: 0,
            changePct: 0,
            marketTimestamp: marketTs.toISOString(),
            receivedAt: receivedAt.toISOString(),
            source: 'TOSS',
            ageMs: receivedAt.getTime() - marketTs.getTime(),
            currency: String(p.currency ?? 'KRW'),
          };
          this.quoteCache.set(symbol, { quote, at: Date.now() });
          out.push(quote);
        }
        // stagger between batches
        if (i + 200 < symbols.length) await new Promise((r) => setTimeout(r, 100));
      }
      this._status = 'LIVE';
      return out;
    } catch (e) {
      this._status = 'DEGRADED';
      await emitEvent('MARKET_DATA_STALE', `Toss quote failure: ${e instanceof Error ? e.message : 'error'}`, 'error');
      throw e;
    }
  }

  async getMarketStatus(): Promise<MarketStatus> {
    try {
      const venues = await getKrVenueSessionsAsync({ preferTossCalendar: true });
      if (tossConfigured()) this._status = 'LIVE';
      else this._status = 'NOT_CONFIGURED';
      return {
        market: 'KR',
        venues,
        provider: this.name,
        degraded: false,
      };
    } catch (e) {
      this._status = 'DEGRADED';
      const venues = getKrVenueSessions();
      return {
        market: 'KR',
        venues,
        provider: this.name,
        degraded: true,
        reason: e instanceof Error ? e.message : 'market-status-failed',
      };
    }
  }
}

function unwrapList(data: unknown, key: string): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  const obj = data as { result?: unknown };
  const r = obj.result;
  if (Array.isArray(r)) return r as Array<Record<string, unknown>>;
  if (r && typeof r === 'object' && Array.isArray((r as Record<string, unknown>)[key])) {
    return (r as Record<string, unknown>)[key] as Array<Record<string, unknown>>;
  }
  if (r && typeof r === 'object' && 'symbol' in (r as object)) return [r as Record<string, unknown>];
  return [];
}

function unwrapObj(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && 'result' in (data as object)) {
    return (data as { result: Record<string, unknown> }).result ?? {};
  }
  return (data as Record<string, unknown>) ?? {};
}
