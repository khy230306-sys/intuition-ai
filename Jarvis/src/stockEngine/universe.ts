/** Liquid KR/US screening universe for AIZIO Stock Engine. */

export type RecMarket = 'KR' | 'US' | 'ALL'

export type StockSector =
  | '반도체'
  | '빅테크'
  | '플랫폼'
  | '자동차'
  | '금융'
  | '소재'
  | '바이오'
  | '배터리'
  | '방산'
  | '에너지'
  | '소비'
  | '통신'
  | '지수ETF'
  | '배당ETF'
  | '헬스케어'

export interface RecCandidate {
  symbol: string
  name: string
  currency: 'KRW' | 'USD'
  sector: StockSector
  market: 'KR' | 'US'
  kind: 'stock' | 'etf' | 'index'
}

/** Curated liquid names — cold multi-factor screening, not hype. */
export const REC_UNIVERSE: RecCandidate[] = [
  // Korea
  { symbol: '005930.KS', name: '삼성전자', currency: 'KRW', sector: '반도체', market: 'KR', kind: 'stock' },
  { symbol: '000660.KS', name: 'SK하이닉스', currency: 'KRW', sector: '반도체', market: 'KR', kind: 'stock' },
  { symbol: '035420.KS', name: 'NAVER', currency: 'KRW', sector: '플랫폼', market: 'KR', kind: 'stock' },
  { symbol: '035720.KS', name: '카카오', currency: 'KRW', sector: '플랫폼', market: 'KR', kind: 'stock' },
  { symbol: '005380.KS', name: '현대차', currency: 'KRW', sector: '자동차', market: 'KR', kind: 'stock' },
  { symbol: '000270.KS', name: '기아', currency: 'KRW', sector: '자동차', market: 'KR', kind: 'stock' },
  { symbol: '105560.KS', name: 'KB금융', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '055550.KS', name: '신한지주', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '086790.KS', name: '하나금융지주', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '005490.KS', name: 'POSCO홀딩스', currency: 'KRW', sector: '소재', market: 'KR', kind: 'stock' },
  { symbol: '051910.KS', name: 'LG화학', currency: 'KRW', sector: '소재', market: 'KR', kind: 'stock' },
  { symbol: '006400.KS', name: '삼성SDI', currency: 'KRW', sector: '배터리', market: 'KR', kind: 'stock' },
  { symbol: '373220.KS', name: 'LG에너지솔루션', currency: 'KRW', sector: '배터리', market: 'KR', kind: 'stock' },
  { symbol: '068270.KS', name: '셀트리온', currency: 'KRW', sector: '바이오', market: 'KR', kind: 'stock' },
  { symbol: '207940.KS', name: '삼성바이오로직스', currency: 'KRW', sector: '바이오', market: 'KR', kind: 'stock' },
  { symbol: '012450.KS', name: '한화에어로스페이스', currency: 'KRW', sector: '방산', market: 'KR', kind: 'stock' },
  { symbol: '047810.KS', name: '한국항공우주', currency: 'KRW', sector: '방산', market: 'KR', kind: 'stock' },
  { symbol: '034020.KS', name: '두산에너빌리티', currency: 'KRW', sector: '에너지', market: 'KR', kind: 'stock' },
  { symbol: '015760.KS', name: '한국전력', currency: 'KRW', sector: '에너지', market: 'KR', kind: 'stock' },
  { symbol: '030200.KS', name: 'KT', currency: 'KRW', sector: '통신', market: 'KR', kind: 'stock' },
  { symbol: '017670.KS', name: 'SK텔레콤', currency: 'KRW', sector: '통신', market: 'KR', kind: 'stock' },
  { symbol: '259960.KS', name: '크래프톤', currency: 'KRW', sector: '소비', market: 'KR', kind: 'stock' },
  { symbol: '352820.KS', name: '하이브', currency: 'KRW', sector: '소비', market: 'KR', kind: 'stock' },
  { symbol: '042700.KS', name: '한미반도체', currency: 'KRW', sector: '반도체', market: 'KR', kind: 'stock' },
  // US
  { symbol: 'AAPL', name: 'Apple', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'AMZN', name: 'Amazon', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'META', name: 'Meta', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'AMD', name: 'AMD', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'AVGO', name: 'Broadcom', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'TSM', name: 'TSMC', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'TSLA', name: 'Tesla', currency: 'USD', sector: '자동차', market: 'US', kind: 'stock' },
  { symbol: 'JPM', name: 'JPMorgan', currency: 'USD', sector: '금융', market: 'US', kind: 'stock' },
  { symbol: 'XOM', name: 'Exxon', currency: 'USD', sector: '에너지', market: 'US', kind: 'stock' },
  { symbol: 'UNH', name: 'UnitedHealth', currency: 'USD', sector: '헬스케어', market: 'US', kind: 'stock' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', currency: 'USD', sector: '헬스케어', market: 'US', kind: 'stock' },
  { symbol: 'NFLX', name: 'Netflix', currency: 'USD', sector: '소비', market: 'US', kind: 'stock' },
  { symbol: 'COST', name: 'Costco', currency: 'USD', sector: '소비', market: 'US', kind: 'stock' },
  // ETFs
  { symbol: 'SPY', name: 'S&P500 ETF', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'QQQ', name: 'Nasdaq100 ETF', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'VOO', name: 'Vanguard S&P500', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'SCHD', name: 'SCHD', currency: 'USD', sector: '배당ETF', market: 'US', kind: 'etf' },
  { symbol: 'QLD', name: 'ProShares Ultra QQQ', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
]

export function detectMarket(text: string): RecMarket {
  if (/미국|나스닥|미장|달러|us\b|nasdaq|s&p/i.test(text)) return 'US'
  if (/한국|국내|코스피|코스닥|한장/i.test(text)) return 'KR'
  return 'ALL'
}

export function detectSectorFilter(text: string): StockSector | null {
  if (/반도체|칩|chip|ai\s*반도체/i.test(text)) return '반도체'
  if (/빅테크|테크|빅\s*테크/i.test(text)) return '빅테크'
  if (/배당/i.test(text)) return '배당ETF'
  if (/etf|지수/i.test(text) && !/배당/.test(text)) return '지수ETF'
  if (/바이오|제약/i.test(text)) return '바이오'
  if (/배터리|2차\s*전지/i.test(text)) return '배터리'
  if (/방산|항공/i.test(text)) return '방산'
  if (/금융|은행/i.test(text)) return '금융'
  if (/자동차|전기차/i.test(text)) return '자동차'
  if (/에너지|전력|원전/i.test(text)) return '에너지'
  if (/헬스케어|의료/i.test(text)) return '헬스케어'
  return null
}

export function filterUniverse(
  market: RecMarket,
  sector: StockSector | null,
): RecCandidate[] {
  return REC_UNIVERSE.filter((c) => {
    if (c.kind === 'index') return false
    if (market === 'KR' && c.market !== 'KR') return false
    if (market === 'US' && c.market !== 'US') return false
    if (sector && c.sector !== sector) {
      // 배당 filter: include 배당ETF + 금융 for conservative yield proxy
      if (sector === '배당ETF' && (c.sector === '배당ETF' || c.sector === '금융')) return true
      return false
    }
    return true
  })
}
