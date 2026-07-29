import { extractTickerFromText, resolveTicker } from './tickers'
import type { Holding, QuoteSnapshot } from './types'

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string
        symbol?: string
        regularMarketPrice?: number
        chartPreviousClose?: number
        previousClose?: number
        regularMarketDayHigh?: number
        regularMarketDayLow?: number
        fiftyTwoWeekHigh?: number
        fiftyTwoWeekLow?: number
        regularMarketVolume?: number
        longName?: string
        shortName?: string
        marketState?: string
      }
    }>
    error?: { description?: string }
  }
}

export async function fetchQuote(symbolOrName: string): Promise<QuoteSnapshot | null> {
  const resolved = resolveTicker(symbolOrName) || extractTickerFromText(symbolOrName)
  if (!resolved) return null
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolved.symbol)}?range=1d&interval=1d`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as YahooChartResponse
  const meta = data.chart?.result?.[0]?.meta
  if (!meta?.regularMarketPrice) return null
  const prev = meta.chartPreviousClose ?? meta.previousClose
  const changePct =
    prev && prev !== 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : null
  return {
    symbol: meta.symbol || resolved.symbol,
    name: meta.longName || meta.shortName || resolved.name,
    price: meta.regularMarketPrice,
    currency: meta.currency || resolved.currency,
    changePct,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    fiftyTwoHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoLow: meta.fiftyTwoWeekLow ?? null,
    volume: meta.regularMarketVolume ?? null,
    marketState: meta.marketState,
    fetchedAt: Date.now(),
  }
}

export function formatMoney(amount: number, currency: string): string {
  if (currency === 'KRW' || currency === '원') {
    return `${Math.round(amount).toLocaleString('ko-KR')}원`
  }
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function formatQuote(q: QuoteSnapshot): string {
  const ch =
    q.changePct === null ? '' : ` (${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%)`
  const lines = [
    `${q.name} (${q.symbol})`,
    `현재가 ${formatMoney(q.price, q.currency)}${ch}`,
  ]
  if (q.dayLow != null && q.dayHigh != null) {
    lines.push(`당일 ${formatMoney(q.dayLow, q.currency)} ~ ${formatMoney(q.dayHigh, q.currency)}`)
  }
  if (q.fiftyTwoLow != null && q.fiftyTwoHigh != null) {
    lines.push(`52주 ${formatMoney(q.fiftyTwoLow, q.currency)} ~ ${formatMoney(q.fiftyTwoHigh, q.currency)}`)
  }
  if (q.volume != null) lines.push(`거래량 ${q.volume.toLocaleString('ko-KR')}`)
  return lines.join('\n')
}

export function marketSessionNow(): string {
  const now = new Date()
  const seoul = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const sDay = seoul.getDay()
  const nDay = ny.getDay()
  const sMin = seoul.getHours() * 60 + seoul.getMinutes()
  const nMin = ny.getHours() * 60 + ny.getMinutes()
  const krOpen = sDay >= 1 && sDay <= 5 && sMin >= 9 * 60 && sMin < 15 * 60 + 30
  const usOpen = nDay >= 1 && nDay <= 5 && nMin >= 9 * 60 + 30 && nMin < 16 * 60
  return [
    `한국(KRX): ${krOpen ? '개장 중' : '휴장/장외'} · 평일 09:00–15:30`,
    `미국(NYSE/Nasdaq): ${usOpen ? '개장 중' : '휴장/장외'} · 평일 09:30–16:00 ET`,
    `참고: 공휴일·서머타임에 따라 달라질 수 있습니다.`,
  ].join('\n')
}

/** Risk-based position size: riskAmount / stop distance. */
export function positionSize(params: {
  capital: number
  riskPct: number
  entry: number
  stop: number
}): { shares: number; riskAmount: number; positionValue: number; advice: string } {
  const { capital, riskPct, entry, stop } = params
  const riskAmount = capital * (riskPct / 100)
  const perShareRisk = Math.abs(entry - stop)
  if (perShareRisk <= 0) {
    return { shares: 0, riskAmount, positionValue: 0, advice: '손절가가 진입가와 같으면 계산할 수 없습니다.' }
  }
  const shares = Math.floor(riskAmount / perShareRisk)
  const positionValue = shares * entry
  const advice =
    riskPct > 2
      ? '리스크 비율이 2%를 넘습니다. 보수적으로 1~2%를 권장합니다.'
      : '단일 포지션 리스크가 적정 구간에 가깝습니다.'
  return { shares, riskAmount, positionValue, advice }
}

export function dcaPlan(monthly: number, months: number, annualReturnPct: number): string {
  const r = annualReturnPct / 100 / 12
  let total = 0
  let contrib = 0
  for (let i = 0; i < months; i++) {
    total = (total + monthly) * (1 + r)
    contrib += monthly
  }
  const gain = total - contrib
  return [
    `매월 ${monthly.toLocaleString('ko-KR')}원 × ${months}개월 (연 ${annualReturnPct}% 가정)`,
    `원금 ${contrib.toLocaleString('ko-KR')}원`,
    `예상 평가액 ${Math.round(total).toLocaleString('ko-KR')}원`,
    `예상 수익 ${Math.round(gain).toLocaleString('ko-KR')}원`,
    `※ 수익률은 가정이므로 실제와 다를 수 있습니다.`,
  ].join('\n')
}

export function compound(principal: number, annualPct: number, years: number, monthlyAdd = 0): string {
  const r = annualPct / 100 / 12
  const months = years * 12
  let total = principal
  for (let i = 0; i < months; i++) {
    total = (total + monthlyAdd) * (1 + r)
  }
  const contrib = principal + monthlyAdd * months
  return [
    `원금 ${principal.toLocaleString('ko-KR')}원 + 월 ${monthlyAdd.toLocaleString('ko-KR')}원`,
    `${years}년 · 연 ${annualPct}% 복리 가정`,
    `예상 ${Math.round(total).toLocaleString('ko-KR')}원 (납입 ${contrib.toLocaleString('ko-KR')}원)`,
  ].join('\n')
}

export function analyzeHolding(h: Holding, quote?: QuoteSnapshot | null): string {
  const price = quote?.price ?? h.avgPrice
  const value = price * h.shares
  const cost = h.avgPrice * h.shares
  const pnl = value - cost
  const pnlPct = cost === 0 ? 0 : (pnl / cost) * 100
  const lines = [
    `${h.name} (${h.symbol})`,
    `보유 ${h.shares}주 · 평단 ${formatMoney(h.avgPrice, h.currency)}`,
    `현재가 ${formatMoney(price, h.currency)} · 평가 ${formatMoney(value, h.currency)}`,
    `손익 ${pnl >= 0 ? '+' : ''}${formatMoney(pnl, h.currency)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`,
  ]
  if (quote?.changePct != null) {
    lines.push(`당일 ${quote.changePct >= 0 ? '+' : ''}${quote.changePct.toFixed(2)}%`)
  }
  if (pnlPct <= -8) lines.push('가이드: -8% 이상 손실이면 손절/리밸런싱 기준을 점검하세요.')
  else if (pnlPct >= 20) lines.push('가이드: +20% 이상이면 일부 익절·목표가 재설정을 검토하세요.')
  return lines.join('\n')
}

export function investChecklist(symbol: string): string {
  return [
    `${symbol} 투자 체크리스트`,
    '1. 이 사업을 한 문장으로 설명할 수 있는가?',
    '2. 경쟁 우위(해자)는 무엇인가?',
    '3. 실적·현금흐름은 우상향인가?',
    '4. 밸류에이션(PER/PBR/PSR)은 역사·동종 대비 어떤가?',
    '5. 최악의 시나리오에서 감수할 손실은?',
    '6. 포트폴리오 비중이 과도하지 않은가? (단일 종목 권장 ≤10~15%)',
    '7. 매수 이유와 손절/익절 규칙을 적어 두었는가?',
    '',
    '명령 예: "삼성전자 매수아이디어 반도체 회복"',
    '면책: 투자 조언이 아니며, 결정은 본인 책임입니다.',
  ].join('\n')
}

export function riskProfileAdvice(level: string): string {
  if (level === 'conservative') {
    return '보수형: 지수 ETF·배당주 비중↑, 개별 성장주 ≤20%, 현금 버퍼 유지, 레버리지 지양.'
  }
  if (level === 'aggressive') {
    return '공격형: 성장주 가능하나 포지션 사이징·손절 규칙을 더 엄격히. 단일 종목 ≤10% 권장.'
  }
  return '균형형: 코어(지수 ETF) 60~70% + 위성(개별/테마) 30~40%, 분기 1회 리밸런싱.'
}

export function financeLinks(symbol: string): { naver?: string; yahoo: string; tradingView: string } {
  const code = symbol.replace(/\.(KS|KQ)$/i, '')
  const isKr = /\.(KS|KQ)$/i.test(symbol) || /^\d{6}$/.test(symbol)
  return {
    naver: isKr ? `https://finance.naver.com/item/main.naver?code=${code}` : undefined,
    yahoo: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
    tradingView: `https://www.tradingview.com/symbols/${encodeURIComponent(symbol.replace('.', ''))}/`,
  }
}

export function openFinance(symbol: string, where: 'naver' | 'yahoo' | 'tradingview' = 'naver'): void {
  const links = financeLinks(symbol)
  const url =
    where === 'yahoo' ? links.yahoo : where === 'tradingview' ? links.tradingView : links.naver || links.yahoo
  window.open(url, '_blank')
}

export function parseKrwNumber(text: string): number | null {
  const t = text.replace(/,/g, '').trim()
  const eok = t.match(/([\d.]+)\s*억/)
  const man = t.match(/([\d.]+)\s*만/)
  if (eok) return Math.round(parseFloat(eok[1]) * 100_000_000)
  if (man) return Math.round(parseFloat(man[1]) * 10_000)
  const n = t.match(/([\d.]+)/)
  return n ? parseFloat(n[1]) : null
}
