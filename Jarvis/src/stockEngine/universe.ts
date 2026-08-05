/** Liquid KR/US screening universe for AIZIO Stock Engine (AI-quant screen). */

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
  | '소프트웨어'
  | '산업'
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

/**
 * Broad liquid universe for cold multi-factor screening.
 * Inspired by retail AI/algo screeners: liquid large/mid caps + core ETFs.
 */
export const REC_UNIVERSE: RecCandidate[] = [
  // ——— Korea ———
  { symbol: '005930.KS', name: '삼성전자', currency: 'KRW', sector: '반도체', market: 'KR', kind: 'stock' },
  { symbol: '000660.KS', name: 'SK하이닉스', currency: 'KRW', sector: '반도체', market: 'KR', kind: 'stock' },
  { symbol: '042700.KS', name: '한미반도체', currency: 'KRW', sector: '반도체', market: 'KR', kind: 'stock' },
  { symbol: '009150.KS', name: '삼성전기', currency: 'KRW', sector: '반도체', market: 'KR', kind: 'stock' },
  { symbol: '035420.KS', name: 'NAVER', currency: 'KRW', sector: '플랫폼', market: 'KR', kind: 'stock' },
  { symbol: '035720.KS', name: '카카오', currency: 'KRW', sector: '플랫폼', market: 'KR', kind: 'stock' },
  { symbol: '036570.KS', name: '엔씨소프트', currency: 'KRW', sector: '소비', market: 'KR', kind: 'stock' },
  { symbol: '259960.KS', name: '크래프톤', currency: 'KRW', sector: '소비', market: 'KR', kind: 'stock' },
  { symbol: '352820.KS', name: '하이브', currency: 'KRW', sector: '소비', market: 'KR', kind: 'stock' },
  { symbol: '251270.KS', name: '넷마블', currency: 'KRW', sector: '소비', market: 'KR', kind: 'stock' },
  { symbol: '005380.KS', name: '현대차', currency: 'KRW', sector: '자동차', market: 'KR', kind: 'stock' },
  { symbol: '000270.KS', name: '기아', currency: 'KRW', sector: '자동차', market: 'KR', kind: 'stock' },
  { symbol: '012330.KS', name: '현대모비스', currency: 'KRW', sector: '자동차', market: 'KR', kind: 'stock' },
  { symbol: '105560.KS', name: 'KB금융', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '055550.KS', name: '신한지주', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '086790.KS', name: '하나금융지주', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '316140.KS', name: '우리금융지주', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '024110.KS', name: '기업은행', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '032830.KS', name: '삼성생명', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '000810.KS', name: '삼성화재', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '005490.KS', name: 'POSCO홀딩스', currency: 'KRW', sector: '소재', market: 'KR', kind: 'stock' },
  { symbol: '051910.KS', name: 'LG화학', currency: 'KRW', sector: '소재', market: 'KR', kind: 'stock' },
  { symbol: '003670.KS', name: '포스코퓨처엠', currency: 'KRW', sector: '배터리', market: 'KR', kind: 'stock' },
  { symbol: '006400.KS', name: '삼성SDI', currency: 'KRW', sector: '배터리', market: 'KR', kind: 'stock' },
  { symbol: '373220.KS', name: 'LG에너지솔루션', currency: 'KRW', sector: '배터리', market: 'KR', kind: 'stock' },
  { symbol: '096770.KS', name: 'SK이노베이션', currency: 'KRW', sector: '에너지', market: 'KR', kind: 'stock' },
  { symbol: '068270.KS', name: '셀트리온', currency: 'KRW', sector: '바이오', market: 'KR', kind: 'stock' },
  { symbol: '207940.KS', name: '삼성바이오로직스', currency: 'KRW', sector: '바이오', market: 'KR', kind: 'stock' },
  { symbol: '326030.KS', name: 'SK바이오팜', currency: 'KRW', sector: '바이오', market: 'KR', kind: 'stock' },
  { symbol: '012450.KS', name: '한화에어로스페이스', currency: 'KRW', sector: '방산', market: 'KR', kind: 'stock' },
  { symbol: '047810.KS', name: '한국항공우주', currency: 'KRW', sector: '방산', market: 'KR', kind: 'stock' },
  { symbol: '079550.KS', name: 'LIG넥스원', currency: 'KRW', sector: '방산', market: 'KR', kind: 'stock' },
  { symbol: '064350.KS', name: '현대로템', currency: 'KRW', sector: '방산', market: 'KR', kind: 'stock' },
  { symbol: '034020.KS', name: '두산에너빌리티', currency: 'KRW', sector: '에너지', market: 'KR', kind: 'stock' },
  { symbol: '015760.KS', name: '한국전력', currency: 'KRW', sector: '에너지', market: 'KR', kind: 'stock' },
  { symbol: '267250.KS', name: 'HD현대중공업', currency: 'KRW', sector: '산업', market: 'KR', kind: 'stock' },
  { symbol: '011200.KS', name: 'HMM', currency: 'KRW', sector: '산업', market: 'KR', kind: 'stock' },
  { symbol: '010130.KS', name: '고려아연', currency: 'KRW', sector: '소재', market: 'KR', kind: 'stock' },
  { symbol: '066570.KS', name: 'LG전자', currency: 'KRW', sector: '소비', market: 'KR', kind: 'stock' },
  { symbol: '018260.KS', name: '삼성에스디에스', currency: 'KRW', sector: '소프트웨어', market: 'KR', kind: 'stock' },
  { symbol: '030200.KS', name: 'KT', currency: 'KRW', sector: '통신', market: 'KR', kind: 'stock' },
  { symbol: '017670.KS', name: 'SK텔레콤', currency: 'KRW', sector: '통신', market: 'KR', kind: 'stock' },
  { symbol: '033780.KS', name: 'KT&G', currency: 'KRW', sector: '소비', market: 'KR', kind: 'stock' },
  { symbol: '090430.KS', name: '아모레퍼시픽', currency: 'KRW', sector: '소비', market: 'KR', kind: 'stock' },
  { symbol: '028260.KS', name: '삼성물산', currency: 'KRW', sector: '산업', market: 'KR', kind: 'stock' },
  { symbol: '000100.KS', name: '유한양행', currency: 'KRW', sector: '바이오', market: 'KR', kind: 'stock' },
  { symbol: '128940.KS', name: '한미약품', currency: 'KRW', sector: '바이오', market: 'KR', kind: 'stock' },
  { symbol: '196170.KS', name: '알테오젠', currency: 'KRW', sector: '바이오', market: 'KR', kind: 'stock' },
  { symbol: '247540.KS', name: '에코프로비엠', currency: 'KRW', sector: '배터리', market: 'KR', kind: 'stock' },
  { symbol: '086520.KS', name: '에코프로', currency: 'KRW', sector: '배터리', market: 'KR', kind: 'stock' },
  { symbol: '009540.KS', name: 'HD한국조선해양', currency: 'KRW', sector: '산업', market: 'KR', kind: 'stock' },
  { symbol: '042660.KS', name: '한화오션', currency: 'KRW', sector: '산업', market: 'KR', kind: 'stock' },
  { symbol: '010140.KS', name: '삼성중공업', currency: 'KRW', sector: '산업', market: 'KR', kind: 'stock' },
  { symbol: '003550.KS', name: 'LG', currency: 'KRW', sector: '산업', market: 'KR', kind: 'stock' },
  { symbol: '034730.KS', name: 'SK', currency: 'KRW', sector: '산업', market: 'KR', kind: 'stock' },
  { symbol: '138040.KS', name: '메리츠금융', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '323410.KS', name: '카카오뱅크', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '263750.KS', name: '펄어비스', currency: 'KRW', sector: '소비', market: 'KR', kind: 'stock' },
  // Korea index ETFs (KOSPI / KOSDAQ proxies)
  { symbol: '069500.KS', name: 'KODEX 200', currency: 'KRW', sector: '지수ETF', market: 'KR', kind: 'etf' },
  { symbol: '229200.KS', name: 'KODEX 코스닥150', currency: 'KRW', sector: '지수ETF', market: 'KR', kind: 'etf' },
  { symbol: '102110.KS', name: 'TIGER 200', currency: 'KRW', sector: '지수ETF', market: 'KR', kind: 'etf' },
  // ——— US (only when user asks 미국/해외) ———
  { symbol: 'AAPL', name: 'Apple', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'AMZN', name: 'Amazon', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'META', name: 'Meta', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'AMD', name: 'AMD', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'AVGO', name: 'Broadcom', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'TSM', name: 'TSMC', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'QCOM', name: 'Qualcomm', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'MU', name: 'Micron', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'AMAT', name: 'Applied Materials', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'ASML', name: 'ASML', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'INTC', name: 'Intel', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'ORCL', name: 'Oracle', currency: 'USD', sector: '소프트웨어', market: 'US', kind: 'stock' },
  { symbol: 'CRM', name: 'Salesforce', currency: 'USD', sector: '소프트웨어', market: 'US', kind: 'stock' },
  { symbol: 'ADBE', name: 'Adobe', currency: 'USD', sector: '소프트웨어', market: 'US', kind: 'stock' },
  { symbol: 'NOW', name: 'ServiceNow', currency: 'USD', sector: '소프트웨어', market: 'US', kind: 'stock' },
  { symbol: 'TSLA', name: 'Tesla', currency: 'USD', sector: '자동차', market: 'US', kind: 'stock' },
  { symbol: 'JPM', name: 'JPMorgan', currency: 'USD', sector: '금융', market: 'US', kind: 'stock' },
  { symbol: 'BAC', name: 'Bank of America', currency: 'USD', sector: '금융', market: 'US', kind: 'stock' },
  { symbol: 'V', name: 'Visa', currency: 'USD', sector: '금융', market: 'US', kind: 'stock' },
  { symbol: 'MA', name: 'Mastercard', currency: 'USD', sector: '금융', market: 'US', kind: 'stock' },
  { symbol: 'BRK-B', name: 'Berkshire B', currency: 'USD', sector: '금융', market: 'US', kind: 'stock' },
  { symbol: 'XOM', name: 'Exxon', currency: 'USD', sector: '에너지', market: 'US', kind: 'stock' },
  { symbol: 'CVX', name: 'Chevron', currency: 'USD', sector: '에너지', market: 'US', kind: 'stock' },
  { symbol: 'UNH', name: 'UnitedHealth', currency: 'USD', sector: '헬스케어', market: 'US', kind: 'stock' },
  { symbol: 'LLY', name: 'Eli Lilly', currency: 'USD', sector: '헬스케어', market: 'US', kind: 'stock' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', currency: 'USD', sector: '헬스케어', market: 'US', kind: 'stock' },
  { symbol: 'ABBV', name: 'AbbVie', currency: 'USD', sector: '헬스케어', market: 'US', kind: 'stock' },
  { symbol: 'NFLX', name: 'Netflix', currency: 'USD', sector: '소비', market: 'US', kind: 'stock' },
  { symbol: 'COST', name: 'Costco', currency: 'USD', sector: '소비', market: 'US', kind: 'stock' },
  { symbol: 'WMT', name: 'Walmart', currency: 'USD', sector: '소비', market: 'US', kind: 'stock' },
  { symbol: 'HD', name: 'Home Depot', currency: 'USD', sector: '소비', market: 'US', kind: 'stock' },
  { symbol: 'DIS', name: 'Disney', currency: 'USD', sector: '소비', market: 'US', kind: 'stock' },
  { symbol: 'KO', name: 'Coca-Cola', currency: 'USD', sector: '소비', market: 'US', kind: 'stock' },
  { symbol: 'MCD', name: 'McDonald\'s', currency: 'USD', sector: '소비', market: 'US', kind: 'stock' },
  { symbol: 'BA', name: 'Boeing', currency: 'USD', sector: '산업', market: 'US', kind: 'stock' },
  { symbol: 'CAT', name: 'Caterpillar', currency: 'USD', sector: '산업', market: 'US', kind: 'stock' },
  { symbol: 'GE', name: 'GE Aerospace', currency: 'USD', sector: '산업', market: 'US', kind: 'stock' },
  // ——— ETFs (core / satellite — common in algo portfolios) ———
  { symbol: 'SPY', name: 'S&P500 ETF', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'QQQ', name: 'Nasdaq100 ETF', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'VOO', name: 'Vanguard S&P500', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'VTI', name: 'Vanguard Total Market', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'IWM', name: 'Russell2000 ETF', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'DIA', name: 'Dow Jones ETF', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'SCHD', name: 'SCHD', currency: 'USD', sector: '배당ETF', market: 'US', kind: 'etf' },
  { symbol: 'VYM', name: 'Vanguard High Dividend', currency: 'USD', sector: '배당ETF', market: 'US', kind: 'etf' },
  { symbol: 'SMH', name: 'VanEck Semiconductor', currency: 'USD', sector: '반도체', market: 'US', kind: 'etf' },
  { symbol: 'SOXX', name: 'iShares Semiconductor', currency: 'USD', sector: '반도체', market: 'US', kind: 'etf' },
  { symbol: 'QLD', name: 'ProShares Ultra QQQ', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
]

/**
 * Market scope for screening.
 * Default = KR (KOSPI/KOSDAQ first). US/ALL only when the user asks.
 */
export function detectMarket(text: string): RecMarket {
  if (/한·?\s*미|한미\b|전체|글로벌|해외\s*포함/i.test(text)) return 'ALL'
  if (/미국|나스닥|미장|달러|해외|us\b|nasdaq|s&p|nyse/i.test(text)) return 'US'
  if (/한국|국내|코스피|코스닥|한장/i.test(text)) return 'KR'
  // 「주식 종목 추천」 등 기본 → 국내 우선
  return 'KR'
}

export function detectSectorFilter(text: string): StockSector | null {
  if (/반도체|칩|chip|ai\s*반도체/i.test(text)) return '반도체'
  if (/빅테크|테크|빅\s*테크/i.test(text)) return '빅테크'
  if (/소프트웨어|saas|클라우드\s*소프트웨어/i.test(text)) return '소프트웨어'
  if (/배당/i.test(text)) return '배당ETF'
  if (/etf|지수/i.test(text) && !/배당/.test(text)) return '지수ETF'
  if (/바이오|제약/i.test(text)) return '바이오'
  if (/배터리|2차\s*전지/i.test(text)) return '배터리'
  if (/방산|항공/i.test(text)) return '방산'
  if (/금융|은행/i.test(text)) return '금융'
  if (/자동차|전기차/i.test(text)) return '자동차'
  if (/에너지|전력|원전/i.test(text)) return '에너지'
  if (/헬스케어|의료/i.test(text)) return '헬스케어'
  if (/산업|중공업|조선/i.test(text)) return '산업'
  if (/플랫폼|인터넷/i.test(text)) return '플랫폼'
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
      if (sector === '배당ETF' && (c.sector === '배당ETF' || c.sector === '금융')) return true
      if (sector === '반도체' && (c.symbol === 'SMH' || c.symbol === 'SOXX')) return true
      return false
    }
    return true
  })
}
