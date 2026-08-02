/** Live FX conversion with offline fallback rates (USD base). */

export type FxCode = 'USD' | 'KRW' | 'JPY' | 'EUR' | 'CNY' | 'GBP'

type RateTable = Record<FxCode, number>

/** Approximate fallback when network/API fails (USD = 1). */
export const FALLBACK_RATES: RateTable = {
  USD: 1,
  KRW: 1450,
  JPY: 164,
  EUR: 0.88,
  CNY: 7.2,
  GBP: 0.75,
}

const ALIASES: Array<{ code: FxCode; re: RegExp; label: string }> = [
  { code: 'USD', re: /달러|불|usd|\$|달러화/i, label: '달러(USD)' },
  { code: 'KRW', re: /원|원화|krw|₩/i, label: '원(KRW)' },
  { code: 'JPY', re: /엔화|엔|jpy|¥|엔화/i, label: '엔(JPY)' },
  { code: 'EUR', re: /유로|eur|€/i, label: '유로(EUR)' },
  { code: 'CNY', re: /위안|위안화|cny|rmb/i, label: '위안(CNY)' },
  { code: 'GBP', re: /파운드|gbp|£/i, label: '파운드(GBP)' },
]

let cached: { at: number; rates: RateTable; source: string } | null = null
const CACHE_MS = 30 * 60_000

async function fetchJson(url: string, ms: number): Promise<unknown | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function pickRates(raw: Record<string, number> | undefined): RateTable | null {
  if (!raw) return null
  const out: RateTable = { ...FALLBACK_RATES }
  out.USD = 1
  for (const code of Object.keys(FALLBACK_RATES) as FxCode[]) {
    if (typeof raw[code] === 'number' && raw[code] > 0) out[code] = raw[code]
  }
  // Need at least KRW to be useful
  if (!(out.KRW > 0)) return null
  return out
}

export async function loadFxRates(timeoutMs = 3500): Promise<{ rates: RateTable; source: string; stale: boolean }> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return { rates: cached.rates, source: cached.source, stale: false }
  }

  const er = (await fetchJson('https://open.er-api.com/v6/latest/USD', timeoutMs)) as {
    result?: string
    rates?: Record<string, number>
  } | null
  if (er?.result === 'success' && er.rates) {
    const rates = pickRates(er.rates)
    if (rates) {
      cached = { at: Date.now(), rates, source: 'open.er-api' }
      return { rates, source: 'open.er-api', stale: false }
    }
  }

  const frank = (await fetchJson(
    'https://api.frankfurter.app/latest?from=USD&to=KRW,JPY,EUR,CNY,GBP',
    timeoutMs,
  )) as { rates?: Record<string, number> } | null
  if (frank?.rates) {
    const merged = { USD: 1, ...frank.rates }
    const rates = pickRates(merged)
    if (rates) {
      cached = { at: Date.now(), rates, source: 'frankfurter' }
      return { rates, source: 'frankfurter', stale: false }
    }
  }

  if (cached) return { rates: cached.rates, source: cached.source + '(캐시)', stale: true }
  return { rates: { ...FALLBACK_RATES }, source: '오프라인 가정환율', stale: true }
}

export function convertAmount(amount: number, from: FxCode, to: FxCode, rates: RateTable): number {
  if (from === to) return amount
  const usd = amount / rates[from]
  return usd * rates[to]
}

export function detectCurrency(text: string): FxCode | null {
  for (const a of ALIASES) {
    if (a.re.test(text)) return a.code
  }
  return null
}

export function currencyLabel(code: FxCode): string {
  return ALIASES.find((a) => a.code === code)?.label || code
}

export function formatFxAmount(amount: number, code: FxCode): string {
  if (code === 'KRW' || code === 'JPY') {
    return `${Math.round(amount).toLocaleString('ko-KR')}${code === 'KRW' ? '원' : '엔'}`
  }
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${code}`
}

export type FxQuery =
  | { kind: 'convert'; amount: number; from: FxCode; to: FxCode }
  | { kind: 'rate'; from: FxCode; to: FxCode }
  | { kind: 'board' }

/** Parse natural FX phrases in Korean. */
export function parseFxQuery(text: string): FxQuery | null {
  const t = text.replace(/,/g, '').trim()
  if (!/환율|환전|달러|엔화|엔\b|유로|위안|파운드|usd|jpy|eur|cny|gbp|\$|₩|€/i.test(t)) {
    return null
  }
  // Avoid eating expense / market phrases
  if (/지출|썼어|결제|장\s*시간|개장|시세|주가/.test(t)) return null

  if (/^(환율|환전|환율\s*표|달러\s*환율|엔\s*환율)$/i.test(t) || /환율\s*(알려|보여|어때|얼마)/.test(t)) {
    return { kind: 'board' }
  }

  const amountMatch =
    t.match(/([\d.]+)\s*(달러|불|\$|엔|엔화|유로|위안|파운드|원|usd|jpy|eur|cny|gbp|krw)/i) ||
    t.match(/(달러|엔|유로|위안|파운드)\s*([\d.]+)/i)

  let amount: number | null = null
  let fromHint: string | null = null
  if (amountMatch) {
    if (/^\d/.test(amountMatch[1])) {
      amount = parseFloat(amountMatch[1])
      fromHint = amountMatch[2]
    } else {
      fromHint = amountMatch[1]
      amount = parseFloat(amountMatch[2])
    }
  }

  const from = fromHint ? detectCurrency(fromHint) : detectCurrency(t)
  let to: FxCode | null = null
  // Prefer explicit target: "원으로", "엔화로", "to KRW"
  const toExplicit = t.match(
    /(?:을|를)?\s*(원|원화|달러|엔|엔화|유로|위안|파운드|krw|usd|jpy|eur|cny|gbp)\s*(?:으로|로)\b/i,
  )
  if (toExplicit) to = detectCurrency(toExplicit[1])
  if (!to && /원|원화|krw|₩/i.test(t) && from && from !== 'KRW') to = 'KRW'
  if (!to && from === 'KRW' && /달러|usd|\$/i.test(t)) to = 'USD'
  if (!to && from) to = from === 'KRW' ? 'USD' : 'KRW'

  if (amount != null && from && to) return { kind: 'convert', amount, from, to }
  if (from && to && from !== to) return { kind: 'rate', from, to }
  if (/환율/.test(t)) return { kind: 'board' }
  return null
}

export async function answerFx(text: string): Promise<string | null> {
  const q = parseFxQuery(text)
  if (!q) return null
  const { rates, source, stale } = await loadFxRates()
  const note = stale ? `※ ${source}` : `출처: ${source}`

  if (q.kind === 'board') {
    const usdKrw = rates.KRW
    const lines = [
      '【환율】 (1 USD 기준)',
      `USD → KRW ${usdKrw.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`,
      `USD → JPY ${rates.JPY.toLocaleString('en-US', { maximumFractionDigits: 2 })}엔`,
      `USD → EUR ${rates.EUR.toLocaleString('en-US', { maximumFractionDigits: 4 })}`,
      `USD → CNY ${rates.CNY.toLocaleString('en-US', { maximumFractionDigits: 3 })}`,
      `USD → GBP ${rates.GBP.toLocaleString('en-US', { maximumFractionDigits: 4 })}`,
      '',
      `예: "100달러 환율" · "엔화 10000엔" · "유로 50 원으로"`,
      note,
      '면책: 참고용이며 실제 환전과 다를 수 있습니다.',
    ]
    return lines.join('\n')
  }

  if (q.kind === 'rate') {
    const one = convertAmount(1, q.from, q.to, rates)
    return [
      `1 ${currencyLabel(q.from)} ≈ ${formatFxAmount(one, q.to)}`,
      note,
      '면책: 참고용 환율입니다.',
    ].join('\n')
  }

  const converted = convertAmount(q.amount, q.from, q.to, rates)
  const per = convertAmount(1, q.from, q.to, rates)
  return [
    `${formatFxAmount(q.amount, q.from)} ≈ ${formatFxAmount(converted, q.to)}`,
    `적용 환율 1 ${q.from} ≈ ${formatFxAmount(per, q.to)}`,
    note,
    '면책: 참고용이며 실제 환전·수수료와 다를 수 있습니다.',
  ].join('\n')
}

/** Test helper */
export function resetFxCache(): void {
  cached = null
}
