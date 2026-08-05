import type { QuoteSnapshot } from '../types'
import { sanitizeChangePct } from '../finance'

/** Multi-factor inputs derived from quote (+ optional chart bars). */
export type StockFactors = {
  rangePos: number | null
  changePct: number | null
  ret5dPct: number | null
  volumeRatio: number | null
}

export function rangePosition(q: QuoteSnapshot): number | null {
  if (q.fiftyTwoHigh == null || q.fiftyTwoLow == null) return null
  const span = q.fiftyTwoHigh - q.fiftyTwoLow
  if (span <= 0) return null
  return (q.price - q.fiftyTwoLow) / span
}

/** Build factors from a quote that may already carry ret5d / avgVolume. */
export function factorsFromQuote(q: QuoteSnapshot): StockFactors {
  const changePct = sanitizeChangePct(q.changePct)
  const ret5dPct = sanitizeChangePct(q.ret5dPct ?? null)
  let volumeRatio: number | null = null
  if (q.volume != null && q.avgVolume5d != null && q.avgVolume5d > 0) {
    volumeRatio = q.volume / q.avgVolume5d
  }
  return {
    rangePos: rangePosition(q),
    changePct,
    ret5dPct,
    volumeRatio,
  }
}

/** Derive ret5d + avg volume from Yahoo chart close/volume arrays. */
export function factorsFromBars(
  closes: Array<number | null | undefined>,
  volumes: Array<number | null | undefined>,
  quote: QuoteSnapshot,
): StockFactors {
  const base = factorsFromQuote(quote)
  const c = closes.filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0)
  const v = volumes.filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0)
  let ret5dPct = base.ret5dPct
  if (c.length >= 2) {
    const first = c[0]
    const last = c[c.length - 1]
    if (first > 0) ret5dPct = sanitizeChangePct(((last - first) / first) * 100)
  }
  let volumeRatio = base.volumeRatio
  if (v.length >= 2) {
    const today = v[v.length - 1]
    const avg = v.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, v.length - 1)
    if (avg > 0) volumeRatio = today / avg
  }
  return { ...base, ret5dPct, volumeRatio }
}
