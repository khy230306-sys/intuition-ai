import type { MarketStatus, Quote } from '@aizio/trade-shared';
import { getTossConnection } from '../brokers/tossConnection.js';
import { getKrVenueSessions, getKrVenueSessionsAsync } from '../engines/marketSession.js';
import { tossConfigured } from '../config/env.js';
import type { ListedSymbol, MarketDataProvider } from './types.js';
import { emitEvent } from '../services/events.js';

interface RankingStats {
  volume: number;
  tradingValue: number;
  changePct: number;
  lastPrice?: number;
}

/**
 * Toss /prices only returns lastPrice+timestamp. Enrich volume/value/change
 * from /rankings (top 100 × several types). Without this, scanner filters kill all names.
 */
export class TossMarketDataProvider implements MarketDataProvider {
  readonly name = 'toss';
  private _status: 'LIVE' | 'NOT_CONFIGURED' | 'DEGRADED' | 'ERROR' = 'NOT_CONFIGURED';
  private quoteCache = new Map<string, { quote: Quote; at: number }>();
  private cacheTtlMs = 2_000;
  private rankingCache = new Map<string, RankingStats>();
  private rankingFetchedAt = 0;
  private rankingTtlMs = 60_000;

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
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as { result?: unknown }).result)
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

  /** Liquid universe for scanner (rankings), not the full 2400×orderbook path. */
  async listLiquidSymbols(limit = 200): Promise<string[]> {
    await this.refreshRankings(true);
    const ranked = [...this.rankingCache.entries()]
      .sort((a, b) => b[1].tradingValue - a[1].tradingValue || b[1].volume - a[1].volume)
      .slice(0, limit)
      .map(([sym]) => sym);
    return ranked;
  }

  async getQuote(symbol: string): Promise<Quote> {
    const cached = this.quoteCache.get(symbol);
    if (cached && Date.now() - cached.at < this.cacheTtlMs) return cached.quote;
    const quotes = await this.getQuotes([symbol], { withOrderbook: true });
    if (!quotes[0]) throw new Error(`QUOTE_NOT_FOUND:${symbol}`);
    return quotes[0];
  }

  async getQuotes(
    symbols: string[],
    opts?: { withOrderbook?: boolean },
  ): Promise<Quote[]> {
    const conn = getTossConnection();
    if (!conn.isConfigured()) {
      this._status = 'NOT_CONFIGURED';
      throw new Error('TOSS_NOT_CONFIGURED');
    }
    await this.refreshRankings(false);
    try {
      const out: Quote[] = [];
      const withBook = Boolean(opts?.withOrderbook) && symbols.length <= 5;
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
          const last = Number(p.lastPrice);
          let bid = last;
          let ask = last;
          if (withBook) {
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
              /* price-only */
            }
          } else if (last > 0) {
            // Synthetic tight spread for batch scans (orderbook reserved for finalists)
            bid = last;
            ask = last;
          }
          const stats = this.rankingCache.get(symbol);
          const marketTs = p.timestamp ? new Date(String(p.timestamp)) : receivedAt;
          const quote: Quote = {
            symbol,
            price: last,
            bid,
            ask,
            volume: stats?.volume ?? 0,
            tradingValue: stats?.tradingValue ?? 0,
            changePct: stats?.changePct ?? 0,
            marketTimestamp: marketTs.toISOString(),
            receivedAt: receivedAt.toISOString(),
            source: 'TOSS',
            ageMs: Math.max(0, receivedAt.getTime() - marketTs.getTime()),
            currency: String(p.currency ?? 'KRW'),
          };
          this.quoteCache.set(symbol, { quote, at: Date.now() });
          out.push(quote);
        }
        if (i + 200 < symbols.length) await new Promise((r) => setTimeout(r, 80));
      }
      this._status = 'LIVE';
      return out;
    } catch (e) {
      this._status = 'DEGRADED';
      await emitEvent('MARKET_DATA_STALE', `Toss quote failure: ${e instanceof Error ? e.message : 'error'}`, 'error');
      throw e;
    }
  }

  async refreshRankings(force: boolean): Promise<void> {
    if (!force && this.rankingCache.size && Date.now() - this.rankingFetchedAt < this.rankingTtlMs) {
      return;
    }
    const conn = getTossConnection();
    if (!conn.isConfigured()) return;

    const types = [
      'MARKET_TRADING_AMOUNT',
      'MARKET_TRADING_VOLUME',
      'TOP_GAINERS',
      'TOP_LOSERS',
    ] as const;
    // Prefer 1d so closed-market / after-hours still yields liquidity stats
    const durations = ['realtime', '1d'] as const;
    const map = new Map<string, RankingStats>();

    for (const type of types) {
      for (const duration of durations) {
        if ((type === 'TOP_GAINERS' || type === 'TOP_LOSERS') && duration === 'realtime') continue;
        try {
          const data = await conn.api<unknown>(
            'GET',
            `/api/v1/rankings?type=${type}&marketCountry=KR&duration=${duration}&count=100`,
            'RANKING',
            false,
          );
          const rows = unwrapRankings(data);
          for (const row of rows) {
            const symbol = String(row.symbol);
            const price = (row.price as Record<string, unknown> | undefined) ?? {};
            const prev = map.get(symbol) ?? { volume: 0, tradingValue: 0, changePct: 0 };
            const vol = Number(row.tradingVolume ?? 0);
            const amt = Number(row.tradingAmount ?? 0);
            const chg = Number(price.changeRate ?? 0) * 100; // API fraction → pct
            map.set(symbol, {
              volume: Math.max(prev.volume, vol),
              tradingValue: Math.max(prev.tradingValue, amt),
              changePct: chg || prev.changePct,
              lastPrice: Number(price.lastPrice ?? prev.lastPrice ?? 0) || undefined,
            });
          }
          if (rows.length) break; // got data for this type
        } catch {
          /* try next duration */
        }
      }
    }

    if (map.size) {
      this.rankingCache = map;
      this.rankingFetchedAt = Date.now();
      await emitEvent('RANKING_REFRESH', `ranking symbols=${map.size}`, 'info');
    }
  }

  getRankingStats(symbol: string): RankingStats | undefined {
    return this.rankingCache.get(symbol);
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

function unwrapRankings(data: unknown): Array<Record<string, unknown>> {
  const obj = data as { result?: { rankings?: unknown[] } | unknown[] };
  if (Array.isArray(obj.result)) return obj.result as Array<Record<string, unknown>>;
  if (obj.result && typeof obj.result === 'object' && Array.isArray((obj.result as { rankings?: unknown[] }).rankings)) {
    return (obj.result as { rankings: Array<Record<string, unknown>> }).rankings;
  }
  return unwrapList(data, 'rankings');
}

function unwrapObj(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && 'result' in (data as object)) {
    return (data as { result: Record<string, unknown> }).result ?? {};
  }
  return (data as Record<string, unknown>) ?? {};
}
