import type { PrizePayout, Tournament } from '@/types'

export type PrizeTemplateKey =
  | 'top1'
  | 'top2'
  | 'top3'
  | 'top10pct'
  | 'top15pct'
  | 'top20pct'

export const PRIZE_TEMPLATE_LABELS: Record<PrizeTemplateKey, string> = {
  top1: '1명 지급',
  top2: '상위 2명',
  top3: '상위 3명',
  top10pct: '상위 10%',
  top15pct: '상위 15%',
  top20pct: '상위 20%',
}

export function calculatePrizePool(input: {
  entriesCount: number
  buyIn: number
  fee: number
  rebuyRevenue: number
  reentryRevenue: number
  addonRevenue: number
  guaranteedPrize: number
  operatingFee: number
  extraPrize: number
  bountyTotal?: number
}): { gross: number; netPrizePool: number; feeTotal: number } {
  const entryGross = input.entriesCount * input.buyIn
  const feeTotal = input.entriesCount * input.fee
  const gross =
    entryGross +
    input.rebuyRevenue +
    input.reentryRevenue +
    input.addonRevenue +
    input.extraPrize
  const prizeFromEntries = Math.max(0, entryGross - feeTotal)
  const net =
    prizeFromEntries +
    input.rebuyRevenue +
    input.reentryRevenue +
    input.addonRevenue +
    input.extraPrize -
    input.operatingFee
  const netPrizePool = Math.max(net, input.guaranteedPrize)
  return { gross, netPrizePool, feeTotal }
}

function distributePercents(places: number, weights?: number[]): number[] {
  if (weights && weights.length === places) {
    const sum = weights.reduce((a, b) => a + b, 0)
    return weights.map((w) => (w / sum) * 100)
  }
  // Default declining curve
  const raw = Array.from({ length: places }, (_, i) => Math.pow(0.55, i))
  const sum = raw.reduce((a, b) => a + b, 0)
  return raw.map((v) => (v / sum) * 100)
}

export function buildPrizeTemplate(
  key: PrizeTemplateKey,
  playersRemainingOrEntries: number,
): { percents: number[]; places: number } {
  switch (key) {
    case 'top1':
      return { places: 1, percents: [100] }
    case 'top2':
      return { places: 2, percents: [65, 35] }
    case 'top3':
      return { places: 3, percents: [50, 30, 20] }
    case 'top10pct': {
      const places = Math.max(1, Math.floor(playersRemainingOrEntries * 0.1))
      return { places, percents: distributePercents(places) }
    }
    case 'top15pct': {
      const places = Math.max(1, Math.floor(playersRemainingOrEntries * 0.15))
      return { places, percents: distributePercents(places) }
    }
    case 'top20pct': {
      const places = Math.max(1, Math.floor(playersRemainingOrEntries * 0.2))
      return { places, percents: distributePercents(places) }
    }
    default:
      return { places: 3, percents: [50, 30, 20] }
  }
}

export function percentsToPayouts(total: number, percents: number[]): PrizePayout[] {
  const raw = percents.map((p, i) => ({
    place: i + 1,
    percent: p,
    amount: Math.floor((total * p) / 100 / 1000) * 1000,
  }))
  const sum = raw.reduce((s, r) => s + r.amount, 0)
  const diff = total - sum
  if (raw[0]) raw[0].amount += diff
  return raw
}

export function validatePayouts(
  total: number,
  payouts: PrizePayout[],
): { ok: boolean; sum: number; diff: number; message?: string } {
  const sum = payouts.reduce((s, p) => s + p.amount, 0)
  const diff = sum - total
  if (diff !== 0) {
    return {
      ok: false,
      sum,
      diff,
      message: `상금 합계(${sum.toLocaleString()}원)가 총 상금(${total.toLocaleString()}원)과 일치하지 않습니다. 차이: ${diff.toLocaleString()}원`,
    }
  }
  const percentSum = payouts.reduce((s, p) => s + (p.percent ?? 0), 0)
  if (payouts.some((p) => p.percent != null) && Math.abs(percentSum - 100) > 0.05) {
    return {
      ok: false,
      sum,
      diff,
      message: `퍼센트 합계가 100%가 아닙니다 (${percentSum.toFixed(2)}%).`,
    }
  }
  return { ok: true, sum, diff: 0 }
}

export function defaultPrizeForTournament(
  tournament: Tournament,
  entriesCount: number,
  rebuyRevenue: number,
  reentryRevenue: number,
  addonRevenue: number,
): { pool: number; payouts: PrizePayout[] } {
  const { netPrizePool } = calculatePrizePool({
    entriesCount,
    buyIn: tournament.buyIn,
    fee: tournament.fee,
    rebuyRevenue,
    reentryRevenue,
    addonRevenue,
    guaranteedPrize: tournament.guaranteedPrize,
    operatingFee: 0,
    extraPrize: 0,
  })
  const tpl = buildPrizeTemplate('top3', entriesCount)
  return { pool: netPrizePool, payouts: percentsToPayouts(netPrizePool, tpl.percents) }
}
