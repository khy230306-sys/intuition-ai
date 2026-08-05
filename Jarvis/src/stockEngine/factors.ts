import type { QuoteSnapshot } from '../types'
import { sanitizeChangePct } from '../finance'

/**
 * Multi-factor inputs — methodologies common in retail AI/algo screeners:
 * momentum (CTA), mean-reversion (RSI/z), volume confirmation, range position.
 */
export type StockFactors = {
  rangePos: number | null
  changePct: number | null
  ret5dPct: number | null
  volumeRatio: number | null
  /** 0–100 style oscillator from 5d return (proxy; not true Wilder RSI). */
  rsiProxy: number | null
  /** |day change| as short-term vol proxy. */
  dayVolAbs: number | null
  /** −1..+1 trend/momentum composite. */
  momentumScore: number | null
  /** 0..1 mean-reversion entry attractiveness (oversold + volume). */
  meanRevScore: number | null
}

export function rangePosition(q: QuoteSnapshot): number | null {
  if (q.fiftyTwoHigh == null || q.fiftyTwoLow == null) return null
  const span = q.fiftyTwoHigh - q.fiftyTwoLow
  if (span <= 0) return null
  return (q.price - q.fiftyTwoLow) / span
}

/** Map ~5d % return into a 0–100 RSI-like band (logistic squash). */
export function rsiProxyFromRet5d(ret5dPct: number | null): number | null {
  if (ret5dPct == null || !Number.isFinite(ret5dPct)) return null
  // ~±12% → near 20/80 bands
  const x = ret5dPct / 6
  const sigmoid = 1 / (1 + Math.exp(-x))
  return Math.max(5, Math.min(95, sigmoid * 100))
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function computeMomentumScore(
  changePct: number | null,
  ret5dPct: number | null,
  rangePos: number | null,
): number | null {
  if (changePct == null && ret5dPct == null) return null
  const d = (changePct ?? 0) / 5
  const w = (ret5dPct ?? 0) / 10
  const trend =
    rangePos == null ? 0 : rangePos > 0.55 ? 0.15 : rangePos < 0.35 ? -0.1 : 0
  return clamp(d * 0.35 + w * 0.55 + trend, -1, 1)
}

export function computeMeanRevScore(
  changePct: number | null,
  ret5dPct: number | null,
  rsiProxy: number | null,
  volumeRatio: number | null,
  rangePos: number | null,
): number | null {
  if (changePct == null && ret5dPct == null && rsiProxy == null) return null
  let s = 0.35
  if (rsiProxy != null) {
    if (rsiProxy <= 30) s += 0.35
    else if (rsiProxy <= 40) s += 0.2
    else if (rsiProxy >= 75) s -= 0.25
    else if (rsiProxy >= 65) s -= 0.12
  }
  if (ret5dPct != null && ret5dPct <= -7) s += 0.2
  if (changePct != null && changePct <= -3) s += 0.12
  if (volumeRatio != null && volumeRatio >= 1.6 && (changePct ?? 0) < 0) s += 0.1
  if (rangePos != null && rangePos <= 0.3) s += 0.1
  if (rangePos != null && rangePos >= 0.9) s -= 0.2
  return clamp(s, 0, 1)
}

/** Build factors from a quote that may already carry ret5d / avgVolume. */
export function factorsFromQuote(q: QuoteSnapshot): StockFactors {
  const changePct = sanitizeChangePct(q.changePct)
  const ret5dPct = sanitizeChangePct(q.ret5dPct ?? null)
  let volumeRatio: number | null = null
  if (q.volume != null && q.avgVolume5d != null && q.avgVolume5d > 0) {
    volumeRatio = q.volume / q.avgVolume5d
  }
  const rangePos = rangePosition(q)
  const rsiProxy = rsiProxyFromRet5d(ret5dPct)
  const dayVolAbs = changePct == null ? null : Math.abs(changePct)
  const momentumScore = computeMomentumScore(changePct, ret5dPct, rangePos)
  const meanRevScore = computeMeanRevScore(changePct, ret5dPct, rsiProxy, volumeRatio, rangePos)
  return {
    rangePos,
    changePct,
    ret5dPct,
    volumeRatio,
    rsiProxy,
    dayVolAbs,
    momentumScore,
    meanRevScore,
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
  const rangePos = base.rangePos
  const changePct = base.changePct
  const rsiProxy = rsiProxyFromRet5d(ret5dPct)
  return {
    rangePos,
    changePct,
    ret5dPct,
    volumeRatio,
    rsiProxy,
    dayVolAbs: changePct == null ? null : Math.abs(changePct),
    momentumScore: computeMomentumScore(changePct, ret5dPct, rangePos),
    meanRevScore: computeMeanRevScore(changePct, ret5dPct, rsiProxy, volumeRatio, rangePos),
  }
}
