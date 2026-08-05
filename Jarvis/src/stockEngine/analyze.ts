import {
  analyzeHolding,
  fetchQuote,
  formatMoney,
  formatQuote,
  investChecklist,
  sanitizeChangePct,
} from '../finance'
import { loadHoldings, loadWatchlist } from '../storage'
import { extractTickerFromText } from '../tickers'
import { factorsFromQuote } from './factors'
import { REC_UNIVERSE } from './universe'

export function wantsStockAnalysis(text: string): boolean {
  return /종목\s*분석|깊게\s*분석|심층\s*분석|엔진\s*분석|분석\s*리포트|stock\s*analysis/i.test(text)
}

/** Deep single-name report using quote factors + portfolio context. */
export async function buildStockAnalysis(text: string): Promise<string | null> {
  const ticker = extractTickerFromText(text)
  if (!ticker) {
    return '분석할 종목을 말해 주세요. 예: 「삼성전자 종목분석」, 「NVDA 종목분석」'
  }

  const q = await fetchQuote(ticker.symbol, { allowProxy: true, timeoutMs: 3500 })
  if (!q) {
    return `${ticker.name} 시세를 가져오지 못했습니다. 네트워크 후 다시 시도하거나 「${ticker.name} 차트」로 확인하세요.`
  }

  const factors = factorsFromQuote(q)
  const uni = REC_UNIVERSE.find((c) => c.symbol.toUpperCase() === q.symbol.toUpperCase())
  const holding = loadHoldings().find((h) => h.symbol.toUpperCase() === q.symbol.toUpperCase())
  const watch = loadWatchlist().find((w) => w.symbol.toUpperCase() === q.symbol.toUpperCase())

  const lines: string[] = [
    `【AIZIO 주식엔진 · 종목분석】 ${q.name}`,
    formatQuote(q),
    '',
    '— 팩터 요약 —',
  ]

  if (factors.rangePos != null) {
    const pct = (factors.rangePos * 100).toFixed(0)
    let band = '중위'
    if (factors.rangePos <= 0.35) band = '하단(상대 저가대)'
    else if (factors.rangePos >= 0.85) band = '고점 근접(추격 경계)'
    lines.push(`52주 위치: ${pct}% · ${band}`)
  } else {
    lines.push('52주 위치: 데이터 부족')
  }

  const day = sanitizeChangePct(factors.changePct)
  lines.push(day == null ? '당일: —' : `당일: ${day >= 0 ? '+' : ''}${day.toFixed(2)}%`)

  if (factors.ret5dPct != null) {
    lines.push(`5일 모멘텀: ${factors.ret5dPct >= 0 ? '+' : ''}${factors.ret5dPct.toFixed(1)}%`)
  } else {
    lines.push('5일 모멘텀: 스냅샷에 없음(라이브 재조회 시 보강)')
  }

  if (factors.volumeRatio != null) {
    lines.push(`상대 거래량: ${factors.volumeRatio.toFixed(2)}× (최근 평균 대비)`)
  }

  if (uni) {
    lines.push(`섹터: ${uni.sector} · ${uni.market === 'KR' ? '한국' : '미국'} · ${uni.kind}`)
  }

  lines.push('')
  lines.push('— 냉정 코멘트 —')
  if (factors.rangePos != null && factors.rangePos >= 0.9) {
    lines.push('· 52주 고점 근처입니다. 추격보다 분할·비중 한도를 먼저 정하세요.')
  } else if (factors.rangePos != null && factors.rangePos <= 0.3) {
    lines.push('· 상대 저가대입니다. “싸다”와 “더 싸질 수 있다”를 구분하세요.')
  } else {
    lines.push('· 중위 밴드입니다. 테마 확신이 없으면 코어 ETF와 비교해 보세요.')
  }
  if (factors.ret5dPct != null && factors.ret5dPct >= 12) {
    lines.push('· 단기 급등 구간 — FOMO 매수보다 목표가·손절을 먼저.')
  }
  if (factors.volumeRatio != null && factors.volumeRatio >= 2) {
    lines.push('· 거래량 급증 — 이벤트/수급 이슈 여부를 뉴스에서 확인하세요.')
  }

  if (watch?.targetPrice) {
    const diff = ((watch.targetPrice - q.price) / q.price) * 100
    lines.push('')
    lines.push(
      `관심 목표가 ${formatMoney(watch.targetPrice, q.currency)} (현재 대비 ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%)`,
    )
  }

  if (holding) {
    lines.push('')
    lines.push(analyzeHolding(holding, q))
  }

  lines.push('')
  lines.push(investChecklist(q.name))
  lines.push('')
  lines.push('더보기: 차트 / 뉴스 / 투자체크 · 면책: 교육·참고용이며 매수·매도 권유가 아닙니다.')

  return lines.join('\n')
}
