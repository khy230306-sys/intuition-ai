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
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
          volume?: Array<number | null>
        }>
      }
    }>
    error?: { description?: string }
  }
}

type SnapshotFile = {
  fetchedAt: number
  count: number
  quotes: Record<string, QuoteSnapshot>
}

let snapshotCache: SnapshotFile | null | undefined
let snapshotPromise: Promise<SnapshotFile | null> | null = null

async function loadSnapshot(): Promise<SnapshotFile | null> {
  if (snapshotCache !== undefined) return snapshotCache
  if (!snapshotPromise) {
    snapshotPromise = (async () => {
      try {
        const url =
          typeof window !== 'undefined'
            ? new URL('quote-snapshot.json', window.location.href).href
            : './quote-snapshot.json'
        const res = await fetch(url, { cache: 'force-cache' })
        if (!res.ok) return null
        const data = (await res.json()) as SnapshotFile
        snapshotCache = data
        return data
      } catch {
        snapshotCache = null
        return null
      }
    })()
  }
  return snapshotPromise
}

function barsFromResult(
  result: NonNullable<NonNullable<YahooChartResponse['chart']>['result']>[0] | undefined,
): { ret5dPct: number | null; avgVolume5d: number | null } {
  const closes = (result?.indicators?.quote?.[0]?.close || []).filter(
    (x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0,
  )
  const volumes = (result?.indicators?.quote?.[0]?.volume || []).filter(
    (x): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0,
  )
  let ret5dPct: number | null = null
  if (closes.length >= 2) {
    const first = closes[0]
    const last = closes[closes.length - 1]
    if (first > 0) {
      const pct = ((last - first) / first) * 100
      ret5dPct = Number.isFinite(pct) && Math.abs(pct) <= 40 ? pct : null
    }
  }
  let avgVolume5d: number | null = null
  if (volumes.length >= 2) {
    const prior = volumes.slice(0, -1)
    avgVolume5d = prior.reduce((a, b) => a + b, 0) / prior.length
  } else if (volumes.length === 1) {
    avgVolume5d = volumes[0]
  }
  return { ret5dPct, avgVolume5d }
}

function metaToQuote(
  result: NonNullable<NonNullable<YahooChartResponse['chart']>['result']>[0] | undefined,
  fallbackSymbol: string,
  fallbackName: string,
  fallbackCurrency: string,
): QuoteSnapshot | null {
  const meta = result?.meta
  if (!meta?.regularMarketPrice) return null
  const prev = meta.chartPreviousClose ?? meta.previousClose
  let changePct =
    prev && prev !== 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : null
  if (changePct != null && Math.abs(changePct) > 25) changePct = null
  const bars = barsFromResult(result)
  return {
    symbol: meta.symbol || fallbackSymbol,
    name: meta.longName || meta.shortName || fallbackName,
    price: meta.regularMarketPrice,
    currency: meta.currency || fallbackCurrency,
    changePct,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    fiftyTwoHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoLow: meta.fiftyTwoWeekLow ?? null,
    volume: meta.regularMarketVolume ?? null,
    ret5dPct: bars.ret5dPct,
    avgVolume5d: bars.avgVolume5d,
    marketState: meta.marketState,
    fetchedAt: Date.now(),
  }
}

async function fetchJson(url: string, ms: number): Promise<unknown | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function fetchYahooLive(
  symbol: string,
  name: string,
  currency: string,
  timeoutMs: number,
): Promise<QuoteSnapshot | null> {
  const hosts = ['https://query2.finance.yahoo.com', 'https://query1.finance.yahoo.com']
  for (const host of hosts) {
    const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
    const data = (await fetchJson(url, timeoutMs)) as YahooChartResponse | null
    if (!data) continue
    const q = metaToQuote(data.chart?.result?.[0], symbol, name, currency)
    if (q) return q
  }
  return null
}

/** Slow CORS proxy — only for single-symbol lookups, never bulk. */
async function fetchYahooProxied(
  symbol: string,
  name: string,
  currency: string,
  timeoutMs: number,
): Promise<QuoteSnapshot | null> {
  const target = encodeURIComponent(
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`,
  )
  const url = `https://api.allorigins.win/get?url=${target}`
  try {
    const data = (await fetchJson(url, timeoutMs)) as
      | YahooChartResponse
      | { contents?: string }
      | null
    if (!data) return null
    let json: YahooChartResponse | null = null
    if ('contents' in data && typeof data.contents === 'string') {
      json = JSON.parse(data.contents) as YahooChartResponse
    } else {
      json = data as YahooChartResponse
    }
    return metaToQuote(json?.chart?.result?.[0], symbol, name, currency)
  } catch {
    return null
  }
}

async function fetchFromSnapshot(symbol: string): Promise<QuoteSnapshot | null> {
  const snap = await loadSnapshot()
  if (!snap) return null
  const hit = snap.quotes[symbol.toUpperCase()]
  if (!hit) return null
  return { ...hit, fetchedAt: snap.fetchedAt }
}

export type QuoteSource = 'live' | 'proxy' | 'snapshot'

export type FetchQuoteOptions = {
  /** Prefer bundled snapshot (fast). Default false for single quotes, true for screening. */
  preferSnapshot?: boolean
  /** Allow slow CORS proxy. Default true for single, false for bulk. */
  allowProxy?: boolean
  /** Per-attempt timeout ms */
  timeoutMs?: number
}

export async function fetchQuoteDetailed(
  symbolOrName: string,
  opts: FetchQuoteOptions = {},
): Promise<{ quote: QuoteSnapshot; source: QuoteSource } | null> {
  const resolved = resolveTicker(symbolOrName) || extractTickerFromText(symbolOrName)
  if (!resolved) return null
  const timeoutMs = opts.timeoutMs ?? 2500
  const preferSnapshot = opts.preferSnapshot === true
  const allowProxy = opts.allowProxy !== false && !preferSnapshot

  if (preferSnapshot) {
    const snap = await fetchFromSnapshot(resolved.symbol)
    if (snap) return { quote: { ...snap, source: 'snapshot' }, source: 'snapshot' }
  }

  const live = await fetchYahooLive(resolved.symbol, resolved.name, resolved.currency, timeoutMs)
  if (live) return { quote: { ...live, source: 'live' }, source: 'live' }

  if (allowProxy) {
    const proxied = await fetchYahooProxied(
      resolved.symbol,
      resolved.name,
      resolved.currency,
      Math.min(timeoutMs, 3000),
    )
    if (proxied) return { quote: { ...proxied, source: 'proxy' }, source: 'proxy' }
  }

  if (!preferSnapshot) {
    const snap = await fetchFromSnapshot(resolved.symbol)
    if (snap) return { quote: { ...snap, source: 'snapshot' }, source: 'snapshot' }
  }

  return null
}

export async function fetchQuote(
  symbolOrName: string,
  opts?: FetchQuoteOptions,
): Promise<QuoteSnapshot | null> {
  const detailed = await fetchQuoteDetailed(symbolOrName, opts)
  return detailed?.quote ?? null
}

export function formatMoney(amount: number, currency: string): string {
  if (currency === 'KRW' || currency === '원') {
    return `${Math.round(amount).toLocaleString('ko-KR')}원`
  }
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function sanitizeChangePct(pct: number | null | undefined): number | null {
  if (pct == null || !Number.isFinite(pct)) return null
  // Snapshot/meta glitches sometimes yield absurd day moves — hide rather than mislead
  if (Math.abs(pct) > 25) return null
  return pct
}

export function formatQuoteAge(fetchedAt: number, now = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - fetchedAt) / 1000))
  if (sec < 60) return `${sec}초 전`
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`
  if (sec < 86_400) return `${Math.floor(sec / 3600)}시간 전`
  return `${Math.floor(sec / 86_400)}일 전`
}

export function formatQuoteSource(source?: QuoteSource | string): string {
  if (source === 'live') return '실시간'
  if (source === 'proxy') return '중계'
  if (source === 'snapshot') return '스냅샷(오프라인)'
  return '시세'
}

export function formatQuote(q: QuoteSnapshot): string {
  const pct = sanitizeChangePct(q.changePct)
  const ch = pct === null ? '' : ` (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`
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
  const src = formatQuoteSource(q.source)
  const age = q.fetchedAt ? formatQuoteAge(q.fetchedAt) : ''
  lines.push(`출처 ${src}${age ? ` · ${age}` : ''}`)
  return lines.join('\n')
}

function zonedParts(timeZone: string, date = new Date()): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number
} {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday] ?? 0,
  }
}

function minutesUntil(targetMin: number, nowMin: number): number {
  let d = targetMin - nowMin
  if (d < 0) d += 24 * 60
  return d
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h <= 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

function sessionLine(
  name: string,
  openMin: number,
  closeMin: number,
  weekday: number,
  nowMin: number,
  schedule: string,
): string {
  const weekdayOk = weekday >= 1 && weekday <= 5
  const open = weekdayOk && nowMin >= openMin && nowMin < closeMin
  if (open) {
    return `${name}: 개장 중 · 마감까지 ${fmtDuration(closeMin - nowMin)} · ${schedule}`
  }
  if (!weekdayOk) {
    return `${name}: 주말 휴장 · ${schedule}`
  }
  if (nowMin < openMin) {
    return `${name}: 장전 · 개장까지 ${fmtDuration(openMin - nowMin)} · ${schedule}`
  }
  return `${name}: 장후 · 다음 개장까지 약 ${fmtDuration(minutesUntil(openMin, nowMin) + (weekday === 5 ? 2 * 24 * 60 : 0))} · ${schedule}`
}

export function marketSessionNow(now = new Date()): string {
  const seoul = zonedParts('Asia/Seoul', now)
  const ny = zonedParts('America/New_York', now)
  const sMin = seoul.hour * 60 + seoul.minute
  const nMin = ny.hour * 60 + ny.minute
  const krKey = `${seoul.year}-${String(seoul.month).padStart(2, '0')}-${String(seoul.day).padStart(2, '0')}`
  // Light KR holiday check (same calendar as smart.ts 2026 set)
  const krHolidays = new Set([
    '2026-01-01',
    '2026-02-16',
    '2026-02-17',
    '2026-02-18',
    '2026-03-01',
    '2026-05-05',
    '2026-05-24',
    '2026-06-06',
    '2026-08-15',
    '2026-09-24',
    '2026-09-25',
    '2026-09-26',
    '2026-10-03',
    '2026-10-09',
    '2026-12-25',
  ])
  const krHoliday = krHolidays.has(krKey)

  const krLine = krHoliday
    ? `한국(KRX): 공휴일 휴장 가능성 · 평일 09:00–15:30 KST`
    : sessionLine('한국(KRX)', 9 * 60, 15 * 60 + 30, seoul.weekday, sMin, '평일 09:00–15:30 KST')

  const usLine = sessionLine(
    '미국(NYSE/Nasdaq)',
    9 * 60 + 30,
    16 * 60,
    ny.weekday,
    nMin,
    '평일 09:30–16:00 ET',
  )

  return [
    '【장 시간】',
    krLine,
    usLine,
    `서울 ${String(seoul.hour).padStart(2, '0')}:${String(seoul.minute).padStart(2, '0')} · 뉴욕 ${String(ny.hour).padStart(2, '0')}:${String(ny.minute).padStart(2, '0')} ET`,
    '참고: 공휴일·서머타임·조기폐장에 따라 달라질 수 있습니다.',
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
  if (sanitizeChangePct(quote?.changePct ?? null) != null) {
    const pct = sanitizeChangePct(quote!.changePct)!
    lines.push(`당일 ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`)
  }
  if (quote?.source) {
    lines.push(`출처 ${formatQuoteSource(quote.source)} · ${formatQuoteAge(quote.fetchedAt)}`)
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
