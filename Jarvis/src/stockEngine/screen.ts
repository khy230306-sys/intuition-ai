import { fetchQuote, formatMoney, sanitizeChangePct } from '../finance'
import { loadHoldings, loadProfile, loadWatchlist } from '../storage'
import type { QuoteSnapshot } from '../types'
import { factorsFromQuote, type StockFactors } from './factors'
import {
  detectMarket,
  detectSectorFilter,
  filterUniverse,
  type RecCandidate,
  type RecMarket,
  REC_UNIVERSE,
} from './universe'

export type { RecCandidate, RecMarket }
export { REC_UNIVERSE, detectMarket, detectSectorFilter, filterUniverse }

export interface ScoredPick {
  candidate: RecCandidate
  quote: QuoteSnapshot
  factors: StockFactors
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
    const quote = await fetchQuote(symbol, {
      preferSnapshot: true,
      allowProxy: false,
      timeoutMs: 2000,
    })
    quoteCache.set(symbol, { at: Date.now(), quote })
    return quote
  } catch {
    quoteCache.set(symbol, { at: Date.now(), quote: null })
    return null
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return out
}

function detectRiskOverride(text: string): 'conservative' | 'balanced' | 'aggressive' | null {
  if (/보수|안전|배당|안정/.test(text)) return 'conservative'
  if (/공격|고위험|성장|테마/.test(text)) return 'aggressive'
  if (/균형|중립/.test(text)) return 'balanced'
  return null
}

export function scorePick(
  c: RecCandidate,
  q: QuoteSnapshot,
  risk: 'conservative' | 'balanced' | 'aggressive',
  owned: Set<string>,
  watched: Set<string>,
): ScoredPick {
  const reasons: string[] = []
  const warnings: string[] = []
  let score = 50
  const factors = factorsFromQuote(q)
  const { rangePos, changePct: ch, ret5dPct, volumeRatio } = factors

  if (c.kind === 'etf') {
    score += risk === 'aggressive' ? 4 : 14
    reasons.push('분산 코어(ETF)')
  }

  if (rangePos != null) {
    if (rangePos <= 0.35) {
      score += risk === 'aggressive' ? 6 : 14
      reasons.push(`52주 하단대 ${(rangePos * 100).toFixed(0)}%`)
    } else if (rangePos >= 0.85) {
      score -= risk === 'conservative' ? 18 : 10
      warnings.push(`52주 고점 근접 ${(rangePos * 100).toFixed(0)}% — 추격 경계`)
    } else {
      score += 3
      reasons.push(`52주 중위 ${(rangePos * 100).toFixed(0)}%`)
    }
  }

  if (ch != null) {
    if (ch <= -3) {
      score += risk === 'conservative' ? 2 : 8
      reasons.push(`당일 급락 ${ch.toFixed(2)}% (냉정 점검)`)
    } else if (ch >= 4) {
      score -= risk === 'conservative' ? 12 : 6
      warnings.push(`당일 급등 ${ch.toFixed(2)}% — FOMO`)
    } else if (ch >= 0 && ch < 1.5) {
      score += 3
      reasons.push(`당일 안정 ${ch.toFixed(2)}%`)
    }
  }

  if (ret5dPct != null) {
    if (ret5dPct <= -6) {
      score += risk === 'aggressive' ? 7 : 3
      reasons.push(`5일 ${ret5dPct.toFixed(1)}% (조정 구간)`)
    } else if (ret5dPct >= 10) {
      score -= risk === 'conservative' ? 10 : 5
      warnings.push(`5일 급등 ${ret5dPct.toFixed(1)}%`)
    } else if (ret5dPct > -2 && ret5dPct < 4) {
      score += 2
      reasons.push(`5일 흐름 ${ret5dPct >= 0 ? '+' : ''}${ret5dPct.toFixed(1)}%`)
    }
  }

  if (volumeRatio != null) {
    if (volumeRatio >= 1.8 && (ch ?? 0) < 0) {
      score += 4
      reasons.push(`거래량 ${(volumeRatio).toFixed(1)}× (매도 소화 점검)`)
    } else if (volumeRatio >= 2.2 && (ch ?? 0) > 3) {
      score -= 4
      warnings.push(`거래량 급증 + 상승 — 과열 주의`)
    } else if (volumeRatio < 0.45) {
      score -= 2
      warnings.push('거래 한산 — 유동성 낮음')
    }
  }

  if (risk === 'conservative') {
    if (['금융', '지수ETF', '배당ETF', '통신', '헬스케어'].includes(c.sector)) {
      score += 8
      reasons.push('보수 성향 적합 섹터')
    }
    if (['방산', '바이오', '배터리'].includes(c.sector) || c.symbol === 'TSLA' || c.symbol === 'NVDA' || c.symbol === 'QLD') {
      score -= 10
      warnings.push('변동성·테마 — 보수 과비중 비권고')
    }
  } else if (risk === 'aggressive') {
    if (['반도체', '빅테크', '방산', '배터리'].includes(c.sector)) {
      score += 7
      reasons.push('성장·모멘텀 섹터')
    }
    if (c.kind === 'etf' && c.symbol !== 'QLD') score -= 2
  } else if (['반도체', '빅테크', '금융', '지수ETF', '헬스케어'].includes(c.sector)) {
    score += 4
  }

  if (owned.has(c.symbol)) {
    score -= 8
    warnings.push('이미 보유 — 추가 전 비중 점검')
  }
  if (watched.has(c.symbol)) {
    score += 2
    reasons.push('관심종목')
  }

  if (rangePos != null && rangePos > 0.92) score = Math.min(score, 42)
  if (c.symbol === 'TSLA' && risk !== 'aggressive') score = Math.min(score, 45)
  if (c.symbol === 'QLD' && risk === 'conservative') score = Math.min(score, 35)

  return {
    candidate: c,
    quote: q,
    factors,
    score,
    reasons: reasons.slice(0, 4),
    warnings: warnings.slice(0, 2),
    rangePos,
  }
}

function structuralFallback(
  universe: RecCandidate[],
  risk: 'conservative' | 'balanced' | 'aggressive',
  owned: Set<string>,
): string {
  const rank = (c: RecCandidate): number => {
    let s = 50
    if (c.kind === 'etf') s += risk === 'aggressive' ? 4 : 16
    if (risk === 'conservative') {
      if (['금융', '지수ETF', '배당ETF', '통신'].includes(c.sector)) s += 12
      if (['방산', '바이오', '배터리'].includes(c.sector) || c.symbol === 'TSLA' || c.symbol === 'NVDA') s -= 14
    } else if (risk === 'aggressive') {
      if (['반도체', '빅테크', '방산', '배터리'].includes(c.sector)) s += 10
    } else if (['반도체', '빅테크', '금융', '지수ETF'].includes(c.sector)) s += 6
    if (owned.has(c.symbol)) s -= 10
    return s
  }
  const sorted = [...universe].sort((a, b) => rank(b) - rank(a)).slice(0, 5)
  const riskLabel = risk === 'conservative' ? '보수' : risk === 'aggressive' ? '공격' : '균형'
  const lines = [
    '【AIZIO 주식엔진 · 구조 스크리닝】 시세 연결 실패 → 섹터·성향 기준',
    `성향: ${riskLabel} · 유니버스 ${universe.length}종`,
    '',
    '— 참고 후보 (가격 없이 구조만) —',
  ]
  sorted.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.name} (${c.symbol}) · ${c.sector}${c.kind === 'etf' ? ' · ETF' : ''}`)
  })
  lines.push('')
  lines.push('팁: 잠시 후 "종목 추천" 또는 "삼성전자 시세"를 다시 시도해 보세요.')
  lines.push('면책: 투자 권유가 아니며 시세 미연결 상태의 참고용입니다.')
  return lines.join('\n')
}

export function wantsStockRecommend(text: string): boolean {
  const t = text.trim()
  if (
    /음악|노래|뮤직|플레이리스트|playlist|맛집|카페|커피|여행|관광|휴가|호텔|숙소|펜션|영화|드라마|넷플릭스|책\b|독서|선물|데이트|운동|헬스|홈트|코디|패션|옷\s*추천|뭐\s*먹|어디\s*먹|어디\s*가|어디가\s*좋|국내\s*여행|해외\s*여행|music\b|restaurant|travel/i.test(
      t,
    ) &&
    !/주식|종목|코인|비트|환율|매수|매도|포트폴리오|투자\s*종목|etf|nasdaq|kospi|kosdaq|stock|crypto/i.test(t)
  ) {
    return false
  }
  return (
    /종목\s*추천|추천\s*종목|주식\s*추천|뭐\s*살까|매수\s*추천|추천주|픽\s*좀|포트\s*추천|투자\s*추천|어디에\s*넣|스크리닝|유니버스|냉정\s*스크리닝|주식\s*엔진/.test(
      t,
    ) ||
    /(?:냉정|차갑|팩트|객관).{0,12}추천/.test(t) ||
    /(?:미국|한국).{0,10}(?:보수|공격|균형|주식|종목|반도체|배당)?.{0,8}추천/.test(t) ||
    /(?:보수|공격|균형|반도체|배당).{0,8}(?:미국|한국|주식|종목)?.{0,8}추천/.test(t) ||
    (/(?:주식|종목|코인|etf|nasdaq|kospi|kosdaq|포트폴리오)/i.test(t) &&
      /추천|골라|스크리닝|뭐\s*살/.test(t))
  )
}

export async function buildColdRecommendations(text: string): Promise<string> {
  const profile = loadProfile()
  const risk = detectRiskOverride(text) || profile.riskTolerance || 'balanced'
  const market = detectMarket(text)
  const sector = detectSectorFilter(text)
  const owned = new Set(loadHoldings().map((h) => h.symbol.toUpperCase()))
  const watched = new Set(loadWatchlist().map((w) => w.symbol.toUpperCase()))

  let universe = filterUniverse(market, sector)
  if (universe.length < 5 && sector) {
    universe = filterUniverse(market, null)
  }

  const quotes = await mapPool(universe, 8, async (c) => ({ c, q: await cachedQuote(c.symbol) }))
  const scored = quotes
    .filter((x): x is { c: RecCandidate; q: QuoteSnapshot } => Boolean(x.q))
    .map(({ c, q }) => scorePick(c, q, risk, owned, watched))
    .sort((a, b) => b.score - a.score)

  if (!scored.length) {
    return structuralFallback(universe, risk, owned)
  }

  const top = scored.slice(0, 5)
  const avoid = scored
    .filter((s) => s.score < 40 || (s.rangePos != null && s.rangePos > 0.9))
    .slice(-3)
    .reverse()

  const marketLabel = market === 'KR' ? '한국' : market === 'US' ? '미국' : '한·미'
  const riskLabel = risk === 'conservative' ? '보수' : risk === 'aggressive' ? '공격' : '균형'
  const sectorLabel = sector ? ` · 섹터 ${sector}` : ''

  const stale = scored.filter((s) => Date.now() - s.quote.fetchedAt > 6 * 60 * 60 * 1000).length
  const with5d = scored.filter((s) => s.factors.ret5dPct != null).length
  const sourceNote =
    stale > scored.length / 2
      ? '시세 출처: 배포 스냅샷/캐시 (지연 가능)'
      : `시세 ${scored.length}/${universe.length}종 · 5일모멘텀 ${with5d}종`

  const lines: string[] = [
    '【AIZIO 주식엔진 v2】 멀티팩터 · 감정 배제',
    `범위: ${marketLabel}${sectorLabel} · 성향: ${riskLabel} · 유니버스 ${universe.length}종`,
    sourceNote,
    '팩터: 52주위치 · 당일변동 · 5일모멘텀 · 상대거래량 · 섹터·보유적합',
    '',
    '— 상위 후보 (매수 강요가 아님) —',
  ]

  top.forEach((p, i) => {
    const pct = sanitizeChangePct(p.quote.changePct)
    const ch = pct == null ? '' : ` ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
    const m5 =
      p.factors.ret5dPct == null
        ? ''
        : ` · 5일 ${p.factors.ret5dPct >= 0 ? '+' : ''}${p.factors.ret5dPct.toFixed(1)}%`
    lines.push(`${i + 1}. ${p.candidate.name} (${p.candidate.symbol}) 점수 ${p.score.toFixed(0)}`)
    lines.push(
      `   ${formatMoney(p.quote.price, p.quote.currency)}${ch}${m5} · ${p.candidate.sector}`,
    )
    if (p.reasons.length) lines.push(`   근거: ${p.reasons.join(' / ')}`)
    if (p.warnings.length) lines.push(`   경고: ${p.warnings.join(' / ')}`)
  })

  const etf = scored.find((s) => s.candidate.kind === 'etf' && s.candidate.symbol !== 'QLD')
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
  lines.push('운용 규칙: 단일 종목 ≤10~15% · 손절 사전 기입 · 추격 매수 금지')
  lines.push('다음: "삼성전자 종목분석" / "반도체 종목 추천" / "포트폴리오" / "관심종목 엔비디아 추가"')
  lines.push('면책: 투자 권유가 아닙니다. 엔진 스크리닝 참고용이며 손실 책임은 본인에게 있습니다.')

  return lines.join('\n')
}
