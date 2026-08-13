import type { BrokerQuote } from '../brokers/types.js';
import { hash01, clamp, round } from '../utils/math.js';
import { kstParts } from '../utils/time.js';
import type { ListedSymbol, MarketDataProvider } from './types.js';

/** Deterministic replay universe for PAPER without Toss credentials.
 * Not random fill success — quotes evolve from seeded formulas so bid/ask/spread/slippage are reproducible.
 */
const UNIVERSE: Array<Omit<ListedSymbol, 'halted' | 'managed' | 'isNewListing'> & { halted?: boolean; managed?: boolean }> = [
  { symbol: '005930', name: '삼성전자', market: 'KR', securityType: 'STOCK', basePrice: 72000, marketCap: 430_000_000_000_000 },
  { symbol: '000660', name: 'SK하이닉스', market: 'KR', securityType: 'STOCK', basePrice: 198000, marketCap: 144_000_000_000_000 },
  { symbol: '035420', name: 'NAVER', market: 'KR', securityType: 'STOCK', basePrice: 215000, marketCap: 35_000_000_000_000 },
  { symbol: '035720', name: '카카오', market: 'KR', securityType: 'STOCK', basePrice: 43000, marketCap: 19_000_000_000_000 },
  { symbol: '051910', name: 'LG화학', market: 'KR', securityType: 'STOCK', basePrice: 310000, marketCap: 22_000_000_000_000 },
  { symbol: '006400', name: '삼성SDI', market: 'KR', securityType: 'STOCK', basePrice: 285000, marketCap: 19_000_000_000_000 },
  { symbol: '105560', name: 'KB금융', market: 'KR', securityType: 'STOCK', basePrice: 82000, marketCap: 32_000_000_000_000 },
  { symbol: '055550', name: '신한지주', market: 'KR', securityType: 'STOCK', basePrice: 51000, marketCap: 26_000_000_000_000 },
  { symbol: '012330', name: '현대모비스', market: 'KR', securityType: 'STOCK', basePrice: 250000, marketCap: 23_000_000_000_000 },
  { symbol: '207940', name: '삼성바이오로직스', market: 'KR', securityType: 'STOCK', basePrice: 980000, marketCap: 70_000_000_000_000 },
  { symbol: '068270', name: '셀트리온', market: 'KR', securityType: 'STOCK', basePrice: 185000, marketCap: 40_000_000_000_000 },
  { symbol: '028260', name: '삼성물산', market: 'KR', securityType: 'STOCK', basePrice: 145000, marketCap: 26_000_000_000_000 },
  { symbol: '003550', name: 'LG', market: 'KR', securityType: 'STOCK', basePrice: 82000, marketCap: 12_000_000_000_000 },
  { symbol: '066570', name: 'LG전자', market: 'KR', securityType: 'STOCK', basePrice: 96000, marketCap: 16_000_000_000_000 },
  { symbol: '032830', name: '삼성생명', market: 'KR', securityType: 'STOCK', basePrice: 110000, marketCap: 22_000_000_000_000 },
  { symbol: '086790', name: '하나금융지주', market: 'KR', securityType: 'STOCK', basePrice: 68000, marketCap: 19_000_000_000_000 },
  { symbol: '000270', name: '기아', market: 'KR', securityType: 'STOCK', basePrice: 98000, marketCap: 39_000_000_000_000 },
  { symbol: '005380', name: '현대차', market: 'KR', securityType: 'STOCK', basePrice: 210000, marketCap: 45_000_000_000_000 },
  { symbol: '009150', name: '삼성전기', market: 'KR', securityType: 'STOCK', basePrice: 145000, marketCap: 11_000_000_000_000 },
  { symbol: '034730', name: 'SK', market: 'KR', securityType: 'STOCK', basePrice: 165000, marketCap: 12_000_000_000_000 },
  { symbol: '018260', name: '삼성에스디에스', market: 'KR', securityType: 'STOCK', basePrice: 155000, marketCap: 12_000_000_000_000 },
  { symbol: '003490', name: '대한항공', market: 'KR', securityType: 'STOCK', basePrice: 24000, marketCap: 8_000_000_000_000 },
  { symbol: '010950', name: 'S-Oil', market: 'KR', securityType: 'STOCK', basePrice: 68000, marketCap: 7_000_000_000_000 },
  { symbol: '096770', name: 'SK이노베이션', market: 'KR', securityType: 'STOCK', basePrice: 120000, marketCap: 10_000_000_000_000 },
  { symbol: '030200', name: 'KT', market: 'KR', securityType: 'STOCK', basePrice: 45000, marketCap: 11_000_000_000_000 },
  // thin liquidity / halt / managed samples for scanner filters
  { symbol: '900001', name: '저유동테스트', market: 'KR', securityType: 'STOCK', basePrice: 1200, marketCap: 5_000_000_000 },
  { symbol: '900002', name: '거래정지테스트', market: 'KR', securityType: 'STOCK', basePrice: 5000, marketCap: 50_000_000_000, halted: true },
  { symbol: '900003', name: '관리종목테스트', market: 'KR', securityType: 'STOCK', basePrice: 2200, marketCap: 30_000_000_000, managed: true },
];

export class ReplayMarketDataProvider implements MarketDataProvider {
  readonly name = 'replay';
  readonly status = 'REPLAY' as const;

  async listSymbols(market: 'KR' | 'US' = 'KR'): Promise<ListedSymbol[]> {
    return UNIVERSE.filter((u) => u.market === market).map((u) => ({
      symbol: u.symbol,
      name: u.name,
      market: u.market,
      securityType: u.securityType,
      halted: Boolean(u.halted),
      managed: Boolean(u.managed),
      isNewListing: false,
      basePrice: u.basePrice,
      marketCap: u.marketCap,
    }));
  }

  private quoteFor(symbol: string, at = new Date()): BrokerQuote {
    const meta = UNIVERSE.find((u) => u.symbol === symbol);
    const base = meta?.basePrice ?? 10000;
    const k = kstParts(at);
    const minuteOfDay = k.hh * 60 + k.mm;
    const seed = hash01(`${symbol}:${k.dateStr}`);
    const wave = Math.sin((minuteOfDay / 390) * Math.PI * 2 + seed * 10);
    const drift = (seed - 0.5) * 0.04;
    const last = round(base * (1 + drift + wave * 0.015), 0);
    const spreadPct = symbol.startsWith('900') ? 2.5 : 0.08 + seed * 0.12;
    const half = last * (spreadPct / 100) * 0.5;
    const bid = round(last - half, 0);
    const ask = round(last + half, 0);
    const volume = symbol.startsWith('900001')
      ? 1_000 + seed * 2_000
      : 200_000 + seed * 2_000_000 + Math.abs(wave) * 500_000;
    const value = volume * last;
    const prev = base * (1 + drift);
    const changePct = round(((last - prev) / prev) * 100, 3);
    return {
      symbol,
      lastPrice: last,
      bid,
      ask,
      volume: round(volume, 0),
      value: round(value, 0),
      changePct,
      timestamp: at,
      source: 'REPLAY',
      freshnessMs: 0,
    };
  }

  async getQuote(symbol: string): Promise<BrokerQuote> {
    const q = this.quoteFor(symbol);
    q.freshnessMs = Date.now() - q.timestamp.getTime();
    return q;
  }

  async getQuotes(symbols: string[]): Promise<BrokerQuote[]> {
    return Promise.all(symbols.map((s) => this.getQuote(s)));
  }

  /** Force stale quote for risk tests */
  staleQuote(symbol: string, staleMs: number): BrokerQuote {
    const q = this.quoteFor(symbol, new Date(Date.now() - staleMs));
    q.freshnessMs = staleMs;
    return q;
  }

  volatility(symbol: string): number {
    return clamp(0.8 + hash01(symbol) * 3.5, 0.5, 6);
  }
}
