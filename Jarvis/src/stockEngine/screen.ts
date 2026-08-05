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

export type RecAction = '엔진추천' | '관심' | '관망' | '회피'

export interface ScoredPick {
  candidate: RecCandidate
  quote: QuoteSnapshot
  factors: StockFactors
  score: number
  reasons: string[]
  warnings: string[]
  rangePos: number | null
  /** Cross-sectional relative strength percentile 0–100 (after enrich). */
  rsPctile: number | null
  action: RecAction
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

export function actionFromScore(score: number): RecAction {
  if (score >= 68) return '엔진추천'
  if (score >= 55) return '관심'
  if (score >= 42) return '관망'
  return '회피'
}

const LEVERAGED = new Set(['QLD', 'TQQQ'])
const HIGH_BETA = new Set(['TSLA', 'NVDA', 'AMD', 'MU', 'INTC'])

/**
 * AI-quant style multi-factor score (deterministic).
 * Blends: momentum · mean-reversion · range · volume · sector-risk · holdings.
 */
export function scorePick(
  c: RecCandidate,
  q: QuoteSnapshot,
  risk: 'conservative' | 'balanced' | 'aggressive',
  owned: Set<string>,
  watched: Set<string>,
): ScoredPick {
  const reasons: string[] = []
  const warnings: string[] = []
  let score = 48
  const factors = factorsFromQuote(q)
  const { rangePos, changePct: ch, ret5dPct, volumeRatio, rsiProxy, momentumScore, meanRevScore } =
    factors

  // ——— Core ETF tilt (many algo portfolios keep beta core) ———
  if (c.kind === 'etf' && !LEVERAGED.has(c.symbol)) {
    score += risk === 'aggressive' ? 5 : 12
    reasons.push('분산 코어(ETF)')
  }
  if (LEVERAGED.has(c.symbol)) {
    score -= risk === 'conservative' ? 22 : risk === 'balanced' ? 12 : 4
    warnings.push('레버리지 ETF — 단기·고위험 전용')
  }

  // ——— Range position (value / chase filter) ———
  if (rangePos != null) {
    if (rangePos <= 0.32) {
      score += risk === 'aggressive' ? 5 : 13
      reasons.push(`52주 하단 ${(rangePos * 100).toFixed(0)}%`)
    } else if (rangePos >= 0.88) {
      score -= risk === 'conservative' ? 16 : 9
      warnings.push(`52주 고점 ${(rangePos * 100).toFixed(0)}% — 추격 경계`)
    } else if (rangePos >= 0.45 && rangePos <= 0.7) {
      score += 4
      reasons.push(`52주 중위 ${(rangePos * 100).toFixed(0)}%`)
    }
  }

  // ——— Momentum factor (CTA / trend bots) ———
  if (momentumScore != null) {
    if (risk === 'aggressive') {
      if (momentumScore >= 0.35) {
        score += 10
        reasons.push(`모멘텀 강세 ${(momentumScore * 100).toFixed(0)}`)
      } else if (momentumScore <= -0.45) {
        score -= 6
        warnings.push('모멘텀 약세')
      }
    } else if (risk === 'conservative') {
      if (momentumScore >= 0.55) {
        score -= 8
        warnings.push('단기 과열 모멘텀')
      } else if (momentumScore > -0.2 && momentumScore < 0.35) {
        score += 4
        reasons.push('모멘텀 안정')
      }
    } else {
      if (momentumScore >= 0.2 && momentumScore < 0.55) {
        score += 6
        reasons.push('모멘텀 양호')
      } else if (momentumScore >= 0.7) {
        score -= 3
        warnings.push('모멘텀 과열 가능')
      }
    }
  }

  // ——— Mean-reversion factor (RSI / MR bots) ———
  if (meanRevScore != null && risk !== 'aggressive') {
    if (meanRevScore >= 0.65) {
      score += risk === 'conservative' ? 10 : 7
      reasons.push(`평균회귀 매력 ${(meanRevScore * 100).toFixed(0)}`)
    } else if (meanRevScore <= 0.25) {
      score -= 5
    }
  }
  if (rsiProxy != null) {
    if (rsiProxy <= 28) {
      score += risk === 'aggressive' ? 3 : 6
      reasons.push(`RSI프록시 ${rsiProxy.toFixed(0)} (과매도대)`)
    } else if (rsiProxy >= 78) {
      score -= risk === 'conservative' ? 10 : 6
      warnings.push(`RSI프록시 ${rsiProxy.toFixed(0)} (과매수대)`)
    }
  }

  // ——— Day shock ———
  if (ch != null) {
    if (ch <= -3.5) {
      score += risk === 'conservative' ? 2 : 7
      reasons.push(`당일 급락 ${ch.toFixed(2)}%`)
    } else if (ch >= 4.5) {
      score -= risk === 'conservative' ? 11 : 5
      warnings.push(`당일 급등 ${ch.toFixed(2)}% — FOMO`)
    } else if (ch >= -0.5 && ch < 1.2) {
      score += 2
    }
  }

  // ——— 5d path ———
  if (ret5dPct != null) {
    if (ret5dPct <= -7) {
      score += risk === 'aggressive' ? 6 : 3
      reasons.push(`5일 ${ret5dPct.toFixed(1)}% 조정`)
    } else if (ret5dPct >= 12) {
      score -= risk === 'conservative' ? 11 : 5
      warnings.push(`5일 급등 ${ret5dPct.toFixed(1)}%`)
    } else if (ret5dPct > -1.5 && ret5dPct < 5) {
      score += 2
      reasons.push(`5일 ${ret5dPct >= 0 ? '+' : ''}${ret5dPct.toFixed(1)}%`)
    }
  }

  // ——— Volume confirmation ———
  if (volumeRatio != null) {
    if (volumeRatio >= 1.7 && (ch ?? 0) < 0) {
      score += 5
      reasons.push(`거래량 ${volumeRatio.toFixed(1)}× (매도 소화)`)
    } else if (volumeRatio >= 2.3 && (ch ?? 0) > 3) {
      score -= 5
      warnings.push('거래량 급증 + 상승 — 과열')
    } else if (volumeRatio < 0.4) {
      score -= 3
      warnings.push('유동성 낮음')
    } else if (volumeRatio >= 1.1 && volumeRatio < 1.8 && (ch ?? 0) > 0) {
      score += 2
      reasons.push('거래량 동반 상승')
    }
  }

  // ——— Risk / sector fit ———
  if (risk === 'conservative') {
    if (['금융', '지수ETF', '배당ETF', '통신', '헬스케어', '소비'].includes(c.sector)) {
      score += 7
      reasons.push('보수 적합 섹터')
    }
    if (
      ['방산', '바이오', '배터리'].includes(c.sector) ||
      HIGH_BETA.has(c.symbol) ||
      LEVERAGED.has(c.symbol)
    ) {
      score -= 11
      warnings.push('변동성·테마 — 보수 과비중 비권고')
    }
  } else if (risk === 'aggressive') {
    if (['반도체', '빅테크', '방산', '배터리', '소프트웨어'].includes(c.sector)) {
      score += 8
      reasons.push('성장·모멘텀 섹터')
    }
    if (c.kind === 'etf' && !LEVERAGED.has(c.symbol) && c.sector === '지수ETF') score -= 1
  } else if (['반도체', '빅테크', '금융', '지수ETF', '헬스케어', '소프트웨어'].includes(c.sector)) {
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

  // Hard caps (regime / chase guards used by many bots)
  if (rangePos != null && rangePos > 0.93) score = Math.min(score, 40)
  if (c.symbol === 'TSLA' && risk !== 'aggressive') score = Math.min(score, 46)
  if (LEVERAGED.has(c.symbol) && risk === 'conservative') score = Math.min(score, 28)
  if (LEVERAGED.has(c.symbol) && risk === 'balanced') score = Math.min(score, 48)

  score = Math.max(5, Math.min(96, score))

  return {
    candidate: c,
    quote: q,
    factors,
    score,
    reasons: reasons.slice(0, 4),
    warnings: warnings.slice(0, 2),
    rangePos,
    rsPctile: null,
    action: actionFromScore(score),
  }
}

/** Cross-sectional relative strength vs screened universe (common in AI screeners). */
export function enrichWithRelativeStrength(picks: ScoredPick[]): ScoredPick[] {
  if (picks.length < 3) {
    return picks.map((p) => ({ ...p, action: actionFromScore(p.score) }))
  }
  const withRet = picks
    .map((p, i) => ({ i, r: p.factors.ret5dPct }))
    .filter((x): x is { i: number; r: number } => x.r != null)
  withRet.sort((a, b) => a.r - b.r)
  const pctile = new Map<number, number>()
  withRet.forEach((x, rank) => {
    pctile.set(x.i, (rank / Math.max(1, withRet.length - 1)) * 100)
  })

  return picks.map((p, i) => {
    const rs = pctile.get(i) ?? null
    let score = p.score
    const reasons = [...p.reasons]
    const warnings = [...p.warnings]
    if (rs != null) {
      if (rs >= 75) {
        score += 5
        if (reasons.length < 4) reasons.push(`상대강도 상위 ${rs.toFixed(0)}%ile`)
      } else if (rs <= 20) {
        score -= 3
        if (warnings.length < 2) warnings.push(`상대강도 하위 ${rs.toFixed(0)}%ile`)
      }
    }
    score = Math.max(5, Math.min(96, score))
    return {
      ...p,
      score,
      reasons: reasons.slice(0, 4),
      warnings: warnings.slice(0, 2),
      rsPctile: rs,
      action: actionFromScore(score),
    }
  })
}

function structuralFallback(
  universe: RecCandidate[],
  risk: 'conservative' | 'balanced' | 'aggressive',
  owned: Set<string>,
): string {
  const rank = (c: RecCandidate): number => {
    let s = 50
    if (c.kind === 'etf' && !LEVERAGED.has(c.symbol)) s += risk === 'aggressive' ? 4 : 16
    if (risk === 'conservative') {
      if (['금융', '지수ETF', '배당ETF', '통신'].includes(c.sector)) s += 12
      if (['방산', '바이오', '배터리'].includes(c.sector) || HIGH_BETA.has(c.symbol)) s -= 14
    } else if (risk === 'aggressive') {
      if (['반도체', '빅테크', '방산', '배터리', '소프트웨어'].includes(c.sector)) s += 10
    } else if (['반도체', '빅테크', '금융', '지수ETF'].includes(c.sector)) s += 6
    if (owned.has(c.symbol)) s -= 10
    if (LEVERAGED.has(c.symbol)) s -= 15
    return s
  }
  const sorted = [...universe].sort((a, b) => rank(b) - rank(a)).slice(0, 7)
  const riskLabel = risk === 'conservative' ? '보수' : risk === 'aggressive' ? '공격' : '균형'
  const lines = [
    '【AIZIO 주식엔진 · 구조 스크리닝】 시세 연결 실패 → 섹터·성향 기준 추천',
    `성향: ${riskLabel} · 유니버스 ${universe.length}종`,
    '',
    '— 엔진 구조 추천 (가격 없이 섹터 적합도) —',
  ]
  sorted.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.name} (${c.symbol}) · ${c.sector}${c.kind === 'etf' ? ' · ETF' : ''}`)
  })
  lines.push('')
  lines.push('팁: 잠시 후 「종목 추천」 또는 「삼성전자 시세」를 다시 시도하세요.')
  lines.push('최종 결정·손실 책임은 본인에게 있습니다. (시세 미연결 참고)')
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
    /종목\s*추천|추천\s*종목|주식\s*추천|뭐\s*살까|매수\s*추천|추천주|픽\s*좀|포트\s*추천|투자\s*추천|어디에\s*넣|스크리닝|유니버스|냉정\s*스크리닝|주식\s*엔진|엔진\s*추천|자동\s*매매|퀀트\s*추천/.test(
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

  const quotes = await mapPool(universe, 10, async (c) => ({ c, q: await cachedQuote(c.symbol) }))
  let scored = quotes
    .filter((x): x is { c: RecCandidate; q: QuoteSnapshot } => Boolean(x.q))
    .map(({ c, q }) => scorePick(c, q, risk, owned, watched))

  scored = enrichWithRelativeStrength(scored).sort((a, b) => b.score - a.score)

  if (!scored.length) {
    return structuralFallback(universe, risk, owned)
  }

  const enginePicks = scored.filter((s) => s.action === '엔진추천').slice(0, 5)
  const top = (enginePicks.length >= 3 ? enginePicks : scored.slice(0, 5)).slice(0, 5)
  const watch = scored.filter((s) => s.action === '관심' && !top.includes(s)).slice(0, 3)
  const avoid = scored
    .filter((s) => s.action === '회피' || (s.rangePos != null && s.rangePos > 0.92))
    .slice(-3)
    .reverse()

  const marketLabel = market === 'KR' ? '한국' : market === 'US' ? '미국' : '한·미'
  const riskLabel = risk === 'conservative' ? '보수' : risk === 'aggressive' ? '공격' : '균형'
  const sectorLabel = sector ? ` · 섹터 ${sector}` : ''

  const stale = scored.filter((s) => Date.now() - s.quote.fetchedAt > 6 * 60 * 60 * 1000).length
  const with5d = scored.filter((s) => s.factors.ret5dPct != null).length
  const sourceNote =
    stale > scored.length / 2
      ? '시세: 배포 스냅샷/캐시 (지연 가능)'
      : `시세 ${scored.length}/${universe.length}종 · 5일모멘텀 ${with5d}종`

  const lines: string[] = [
    '【AIZIO 주식엔진 v2.1 · AI퀀트 스크리닝】',
    `범위: ${marketLabel}${sectorLabel} · 성향: ${riskLabel} · 유니버스 ${universe.length}종`,
    sourceNote,
    '모델: 모멘텀·평균회귀·상대강도·52주·거래량·섹터적합 (시세 기반 냉정 점수)',
    '',
    '— 엔진 추천 TOP —',
  ]

  top.forEach((p, i) => {
    const pct = sanitizeChangePct(p.quote.changePct)
    const ch = pct == null ? '' : ` ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
    const m5 =
      p.factors.ret5dPct == null
        ? ''
        : ` · 5일 ${p.factors.ret5dPct >= 0 ? '+' : ''}${p.factors.ret5dPct.toFixed(1)}%`
    const rs =
      p.rsPctile == null ? '' : ` · RS ${p.rsPctile.toFixed(0)}%ile`
    lines.push(
      `${i + 1}. 【${p.action}】 ${p.candidate.name} (${p.candidate.symbol}) 점수 ${p.score.toFixed(0)}`,
    )
    lines.push(
      `   ${formatMoney(p.quote.price, p.quote.currency)}${ch}${m5}${rs} · ${p.candidate.sector}`,
    )
    if (p.reasons.length) lines.push(`   근거: ${p.reasons.join(' / ')}`)
    if (p.warnings.length) lines.push(`   주의: ${p.warnings.join(' / ')}`)
  })

  if (watch.length) {
    lines.push('')
    lines.push('— 관심 (2순위) —')
    for (const p of watch) {
      lines.push(
        `· ${p.candidate.name} (${p.candidate.symbol}) 점수 ${p.score.toFixed(0)} · ${p.candidate.sector}`,
      )
    }
  }

  const etf = scored.find(
    (s) => s.candidate.kind === 'etf' && !LEVERAGED.has(s.candidate.symbol) && s.score >= 55,
  )
  if (etf && !top.some((t) => t.candidate.symbol === etf.candidate.symbol)) {
    lines.push('')
    lines.push(
      `코어 대안: ${etf.candidate.name} (${etf.candidate.symbol}) 점수 ${etf.score.toFixed(0)} — 개별주 확신이 약할 때 엔진이 우선하는 분산축`,
    )
  }

  if (avoid.length) {
    lines.push('')
    lines.push('— 지금은 회피 —')
    for (const p of avoid.slice(0, 2)) {
      lines.push(
        `· ${p.candidate.name}: 점수 ${p.score.toFixed(0)}${p.warnings[0] ? ` · ${p.warnings[0]}` : ''}`,
      )
    }
  }

  lines.push('')
  lines.push('운용: 단일 종목 ≤10~15% · 손절 사전 기입 · 레버리지·추격은 성향과 맞춰 축소')
  lines.push('다음: 「삼성전자 종목분석」 · 「반도체 종목 추천」 · 「포트폴리오」')
  lines.push('투자 여부는 본인 선택입니다. 엔진은 시세 팩터로 자신 있게 순위를 제시하며, 손실 책임은 본인에게 있습니다.')

  return lines.join('\n')
}
