/**
 * Deterministic trade levels from live quote + engine score.
 * Never invents a price without a current quote; bands use 52w range when present.
 */

export type RiskTilt = 'conservative' | 'balanced' | 'aggressive'

export type TradeLevels = {
  /** Engine score mapped to 0–100% investment attractiveness. */
  attractivenessPct: number
  targetPrice: number
  stopPrice: number
  /** First take-profit / trim level (between spot and target). */
  sellPrice: number
  targetUpsidePct: number
  stopDownsidePct: number
  sellUpsidePct: number
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** Round KRW to whole won; USD-like to 2 decimals. */
export function roundPrice(price: number, currency: 'KRW' | 'USD' | string): number {
  if (!Number.isFinite(price) || price <= 0) return price
  if (currency === 'KRW') return Math.round(price)
  if (price >= 100) return Math.round(price * 100) / 100
  return Math.round(price * 1000) / 1000
}

export function attractivenessFromScore(score: number): number {
  return Math.round(clamp(score, 0, 100))
}

/**
 * Derive target / stop / 1차 매도 from score, risk, and optional 52-week band.
 */
export function deriveTradeLevels(
  price: number,
  score: number,
  risk: RiskTilt,
  opts?: {
    fiftyTwoHigh?: number | null
    fiftyTwoLow?: number | null
    dayVolAbs?: number | null
    currency?: 'KRW' | 'USD' | string
    leveraged?: boolean
  },
): TradeLevels | null {
  if (!Number.isFinite(price) || price <= 0) return null
  const currency = opts?.currency || 'KRW'
  const attractivenessPct = attractivenessFromScore(score)
  const vol = opts?.dayVolAbs != null && Number.isFinite(opts.dayVolAbs) ? Math.abs(opts.dayVolAbs) : 1.2
  const leveraged = !!opts?.leveraged

  // Stop distance (%): wider for volatile / aggressive / leverage
  let stopPct =
    risk === 'conservative' ? 5.5 : risk === 'aggressive' ? 10.5 : 7.5
  stopPct += clamp(vol - 1, 0, 4) * 0.6
  if (leveraged) stopPct += 4
  if (score < 45) stopPct += 1.5
  stopPct = clamp(stopPct, 4, leveraged ? 18 : 14)

  // Target upside (%): stronger score → larger room; risk tilts size
  let targetPct = 5 + (attractivenessPct - 50) * 0.18
  if (risk === 'conservative') targetPct *= 0.75
  else if (risk === 'aggressive') targetPct *= 1.25
  targetPct = clamp(targetPct, 3.5, risk === 'aggressive' ? 22 : 16)

  const high = opts?.fiftyTwoHigh
  const low = opts?.fiftyTwoLow
  if (high != null && high > price) {
    const roomToHighPct = ((high - price) / price) * 100
    // Blend toward 52w high when it's a realistic near-term band
    if (roomToHighPct > 2 && roomToHighPct < 35) {
      const pull = risk === 'conservative' ? 0.4 : risk === 'aggressive' ? 0.75 : 0.55
      targetPct = clamp(targetPct * (1 - pull) + roomToHighPct * pull, 3.5, 28)
    } else if (roomToHighPct <= 2) {
      // Already near highs — modest extension only
      targetPct = clamp(Math.min(targetPct, 5), 2.5, 6)
    }
  }

  let stopPrice = price * (1 - stopPct / 100)
  if (low != null && low > 0 && low < price) {
    // Prefer not to set stop far below recent structural low without buffer
    const lowStop = low * 0.985
    if (stopPrice < lowStop && (price - lowStop) / price < stopPct / 100 + 0.02) {
      stopPrice = Math.max(stopPrice, lowStop)
    }
  }

  let targetPrice = price * (1 + targetPct / 100)
  if (high != null && high > price) {
    // Cap wild targets: allow slight breakout above 52w high only for aggressive/high score
    const cap = risk === 'aggressive' && attractivenessPct >= 70 ? high * 1.06 : high * 1.02
    targetPrice = Math.min(targetPrice, Math.max(high * 0.92, cap))
    if (targetPrice <= price) targetPrice = price * (1 + Math.max(3, targetPct * 0.5) / 100)
  }

  // 1차 매도: ~55–65% of the way to target (trim zone)
  const sellFrac = risk === 'conservative' ? 0.55 : risk === 'aggressive' ? 0.7 : 0.62
  let sellPrice = price + (targetPrice - price) * sellFrac
  if (sellPrice <= price) sellPrice = price * (1 + targetPct * 0.45 / 100)

  stopPrice = roundPrice(stopPrice, currency)
  targetPrice = roundPrice(targetPrice, currency)
  sellPrice = roundPrice(sellPrice, currency)

  const targetUpsidePct = ((targetPrice - price) / price) * 100
  const stopDownsidePct = ((stopPrice - price) / price) * 100
  const sellUpsidePct = ((sellPrice - price) / price) * 100

  return {
    attractivenessPct,
    targetPrice,
    stopPrice,
    sellPrice,
    targetUpsidePct,
    stopDownsidePct,
    sellUpsidePct,
  }
}

export function formatPctSigned(pct: number, digits = 1): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(digits)}%`
}
