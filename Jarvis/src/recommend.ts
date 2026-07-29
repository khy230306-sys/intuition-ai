import { fetchQuote, formatMoney } from './finance'
import { loadHoldings, loadProfile, loadWatchlist } from './storage'
import type { QuoteSnapshot } from './types'

export type RecMarket = 'KR' | 'US' | 'ALL'

export interface RecCandidate {
  symbol: string
  name: string
  currency: 'KRW' | 'USD'
  sector: string
  market: 'KR' | 'US'
  kind: 'stock' | 'etf' | 'index'
}

/** Liquid universe only — cold screening, not hype picks. */
export const REC_UNIVERSE: RecCandidate[] = [
  { symbol: '005930.KS', name: '삼성전자', currency: 'KRW', sector: '반도체', market: 'KR', kind: 'stock' },
  { symbol: '000660.KS', name: 'SK하이닉스', currency: 'KRW', sector: '반도체', market: 'KR', kind: 'stock' },
  { symbol: '035420.KS', name: 'NAVER', currency: 'KRW', sector: '플랫폼', market: 'KR', kind: 'stock' },
  { symbol: '035720.KS', name: '카카오', currency: 'KRW', sector: '플랫폼', market: 'KR', kind: 'stock' },
  { symbol: '005380.KS', name: '현대차', currency: 'KRW', sector: '자동차', market: 'KR', kind: 'stock' },
  { symbol: '000270.KS', name: '기아', currency: 'KRW', sector: '자동차', market: 'KR', kind: 'stock' },
  { symbol: '105560.KS', name: 'KB금융', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '055550.KS', name: '신한지주', currency: 'KRW', sector: '금융', market: 'KR', kind: 'stock' },
  { symbol: '005490.KS', name: 'POSCO홀딩스', currency: 'KRW', sector: '소재', market: 'KR', kind: 'stock' },
  { symbol: '068270.KS', name: '셀트리온', currency: 'KRW', sector: '바이오', market: 'KR', kind: 'stock' },
  { symbol: '373220.KS', name: 'LG에너지솔루션', currency: 'KRW', sector: '배터리', market: 'KR', kind: 'stock' },
  { symbol: '012450.KS', name: '한화에어로스페이스', currency: 'KRW', sector: '방산', market: 'KR', kind: 'stock' },
  { symbol: 'AAPL', name: 'Apple', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'AMZN', name: 'Amazon', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'META', name: 'Meta', currency: 'USD', sector: '빅테크', market: 'US', kind: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'TSM', name: 'TSMC', currency: 'USD', sector: '반도체', market: 'US', kind: 'stock' },
  { symbol: 'TSLA', name: 'Tesla', currency: 'USD', sector: '자동차', market: 'US', kind: 'stock' },
  { symbol: 'SPY', name: 'S&P500 ETF', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'QQQ', name: 'Nasdaq100 ETF', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'VOO', name: 'Vanguard S&P500', currency: 'USD', sector: '지수ETF', market: 'US', kind: 'etf' },
  { symbol: 'SCHD', name: 'SCHD', currency: 'USD', sector: '배당ETF', market: 'US', kind: 'etf' },
]

export interface ScoredPick {
  candidate: RecCandidate
  quote: QuoteSnapshot
  score: number
  reasons: string[]
  warnings: string[]
  rangePos: number | null
}

const quoteCache = new Map<string, { at: number; quote: QuoteSnapshot | null }>()
const CACHE_MS = 45_000

async function cachedQuote(symbol: string): Promise<QuoteSnapshot | null> {
  const hit = quoteCache.get(symbol)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.quote
  try {
    const quote = await fetchQuote(symbol)
    quoteCache.set(symbol, { at: Date.now(), quote })
    return quote
  } catch {
    quoteCache.set(symbol, { at: Date.now(), quote: null })
    return null
  }
}

function rangePosition(q: QuoteSnapshot): number | null {
  if (q.fiftyTwoHigh == null || q.fiftyTwoLow == null) return null
  const span = q.fiftyTwoHigh - q.fiftyTwoLow
  if (span <= 0) return null
  return (q.price - q.fiftyTwoLow) / span
}

function scorePick(
  c: RecCandidate,
  q: QuoteSnapshot,
  risk: 'conservative' | 'balanced' | 'aggressive',
  owned: Set<string>,
  watched: Set<string>,
): ScoredPick {
  const reasons: string[] = []
  const warnings: string[] = []
  let score = 50
  const rangePos = rangePosition(q)
  const ch = q.changePct

  if (c.kind === 'etf') {
    score += risk === 'aggressive' ? 4 : 12
    reasons.push('분산 코어(ETF)')
  }

  if (rangePos != null) {
    if (rangePos <= 0.35) {
      const bonus = risk === 'aggressive' ? 6 : 14
      score += bonus
      reasons.push(`52주 하단대 ${(rangePos * 100).toFixed(0)}%`)
    } else if (rangePos >= 0.85) {
      score -= risk === 'conservative' ? 18 : 10
      warnings.push(`52주 고점 근접 ${(rangePos * 100).toFixed(0)}% — 추격 매수 경계`)
    } else {
      score += 2
      reasons.push(`52주 중위 ${(rangePos * 100).toFixed(0)}%`)
    }
  }

  if (ch != null) {
    if (ch <= -3) {
      score += risk === 'conservative' ? 2 : 8
      reasons.push(`당일 급락 ${ch.toFixed(2)}% (냉정 점검 구간)`)
    } else if (ch >= 4) {
      score -= risk === 'conservative' ? 12 : 6
      warnings.push(`당일 급등 ${ch.toFixed(2)}% — FOMO 위험`)
    } else if (ch >= 0 && ch < 1.5) {
      score += 3
      reasons.push(`당일 안정 ${ch.toFixed(2)}%`)
    }
  }

  if (risk === 'conservative') {
    if (['금융', '지수ETF', '배당ETF'].includes(c.sector)) {
      score += 8
      reasons.push('보수 성향 적합 섹터')
    }
    if (['방산', '바이오', '배터리'].includes(c.sector) || c.symbol === 'TSLA' || c.symbol === 'NVDA') {
      score -= 10
      warnings.push('변동성·테마 성격 — 보수 포트에 과비중 비권고')
    }
  } else if (risk === 'aggressive') {
    if (['반도체', '빅테크', '방산', '배터리'].includes(c.sector)) {
      score += 6
      reasons.push('성장·모멘텀 섹터')
    }
    if (c.kind === 'etf') score -= 2
  } else {
    if (['반도체', '빅테크', '금융', '지수ETF'].includes(c.sector)) score += 4
  }

  if (owned.has(c.symbol)) {
    score -= 8
    warnings.push('이미 보유 — 추가 매수 전 비중 점검')
  }
  if (watched.has(c.symbol)) {
    score += 2
    reasons.push('관심종목')
  }

  // Hard cold caps
  if (rangePos != null && rangePos > 0.92) score = Math.min(score, 42)
  if (c.symbol === 'TSLA' && risk !== 'aggressive') score = Math.min(score, 45)

  return { candidate: c, quote: q, score, reasons: reasons.slice(0, 3), warnings: warnings.slice(0, 2), rangePos }
}

function detectMarket(text: string): RecMarket {
  if (/미국|나스닥|미장|달러|us\b/i.test(text)) return 'US'
  if (/한국|국내|코스피|코스닥|한장/i.test(text)) return 'KR'
  return 'ALL'
}

function detectRiskOverride(text: string): 'conservative' | 'balanced' | 'aggressive' | null {
  if (/보수|안전|배당|안정/.test(text)) return 'conservative'
  if (/공격|고위험|성장|테마/.test(text)) return 'aggressive'
  if (/균형|중립/.test(text)) return 'balanced'
  if (/냉정|차갑|팩트|객관/.test(text)) return null // keep profile, tone cold anyway
  return null
}

export function wantsStockRecommend(text: string): boolean {
  return (
    /종목\s*추천|추천\s*종목|주식\s*추천|뭐\s*살까|매수\s*추천|추천주|픽\s*좀|포트\s*추천|투자\s*추천|어디에\s*넣|스크리닝|유니버스/.test(
      text,
    ) ||
    /(?:냉정|차갑|팩트|객관|보수|공격|미국|한국|국내).{0,8}추천/.test(text) ||
    /추천(?:해|해줘|좀)|^(추천)$/.test(text.trim())
  )
}

export async function buildColdRecommendations(text: string): Promise<string> {
  const profile = loadProfile()
  const risk = detectRiskOverride(text) || profile.riskTolerance || 'balanced'
  const market = detectMarket(text)
  const owned = new Set(loadHoldings().map((h) => h.symbol.toUpperCase()))
  const watched = new Set(loadWatchlist().map((w) => w.symbol.toUpperCase()))

  const universe = REC_UNIVERSE.filter((c) => {
    if (c.kind === 'index') return false
    if (market === 'KR') return c.market === 'KR'
    if (market === 'US') return c.market === 'US'
    return true
  })

  const quotes = await Promise.all(universe.map(async (c) => ({ c, q: await cachedQuote(c.symbol) })))
  const scored = quotes
    .filter((x): x is { c: RecCandidate; q: QuoteSnapshot } => Boolean(x.q))
    .map(({ c, q }) => scorePick(c, q, risk, owned, watched))
    .sort((a, b) => b.score - a.score)

  if (!scored.length) {
    return '시세를 가져오지 못했습니다. 네트워크를 확인한 뒤 다시 "종목 추천"을 입력해 주세요.'
  }

  const top = scored.slice(0, 5)
  const avoid = scored.filter((s) => s.score < 40 || (s.rangePos != null && s.rangePos > 0.9)).slice(-3).reverse()

  const marketLabel = market === 'KR' ? '한국' : market === 'US' ? '미국' : '한·미'
  const riskLabel =
    risk === 'conservative' ? '보수' : risk === 'aggressive' ? '공격' : '균형'

  const lines: string[] = [
    '【냉정 스크리닝】 감정 배제 · 시세 기반',
    `범위: ${marketLabel} · 성향: ${riskLabel} · 유니버스 ${universe.length}종`,
    '',
    '— 상위 후보 (매수 강요가 아님) —',
  ]

  top.forEach((p, i) => {
    const ch =
      p.quote.changePct == null
        ? ''
        : ` ${p.quote.changePct >= 0 ? '+' : ''}${p.quote.changePct.toFixed(2)}%`
    lines.push(
      `${i + 1}. ${p.candidate.name} (${p.candidate.symbol}) 점수 ${p.score.toFixed(0)}`,
    )
    lines.push(
      `   ${formatMoney(p.quote.price, p.quote.currency)}${ch} · ${p.candidate.sector}`,
    )
    if (p.reasons.length) lines.push(`   근거: ${p.reasons.join(' / ')}`)
    if (p.warnings.length) lines.push(`   경고: ${p.warnings.join(' / ')}`)
  })

  // Always force a core ETF mention for cold advice
  const etf = scored.find((s) => s.candidate.kind === 'etf')
  if (etf && !top.some((t) => t.candidate.symbol === etf.candidate.symbol)) {
    lines.push('')
    lines.push(
      `코어 대안: ${etf.candidate.name} — 개별주 확신이 없으면 ETF가 더 냉정한 선택입니다.`,
    )
  }

  if (avoid.length) {
    lines.push('')
    lines.push('— 지금은 거리 두기 —')
    for (const p of avoid.slice(0, 2)) {
      lines.push(
        `· ${p.candidate.name}: 점수 ${p.score.toFixed(0)}${p.warnings[0] ? ` · ${p.warnings[0]}` : ''}`,
      )
    }
  }

  lines.push('')
  lines.push('운용 규칙(냉정): 단일 종목 ≤10~15% · 손절 기준 사전 기입 · 추격 매수 금지')
  lines.push('면책: 투자 권유가 아닙니다. 스크리닝 참고용이며 손실 책임은 본인에게 있습니다.')
  lines.push('다음: "삼성전자 시세" / "삼성전자 투자체크" / "관심종목 엔비디아 추가"')

  return lines.join('\n')
}
