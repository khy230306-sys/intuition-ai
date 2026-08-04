import { describe, expect, it } from 'vitest'
import {
  buildPrizeTemplate,
  calculatePrizePool,
  percentsToPayouts,
  validatePayouts,
} from '@/utils/payouts'

describe('payouts', () => {
  it('applies guaranteed prize', () => {
    const pool = calculatePrizePool({
      entriesCount: 10,
      buyIn: 100000,
      fee: 10000,
      rebuyRevenue: 0,
      reentryRevenue: 0,
      addonRevenue: 0,
      guaranteedPrize: 2000000,
      operatingFee: 0,
      extraPrize: 0,
    })
    expect(pool.netPrizePool).toBe(2000000)
  })

  it('includes rebuy and addon revenue', () => {
    const pool = calculatePrizePool({
      entriesCount: 20,
      buyIn: 100000,
      fee: 10000,
      rebuyRevenue: 200000,
      reentryRevenue: 100000,
      addonRevenue: 50000,
      guaranteedPrize: 0,
      operatingFee: 0,
      extraPrize: 0,
    })
    expect(pool.netPrizePool).toBe(20 * 90000 + 200000 + 100000 + 50000)
  })

  it('percent payouts sum to total', () => {
    const tpl = buildPrizeTemplate('top3', 36)
    const payouts = percentsToPayouts(3_000_000, tpl.percents)
    const validation = validatePayouts(3_000_000, payouts)
    expect(validation.ok).toBe(true)
    expect(validation.sum).toBe(3_000_000)
  })

  it('rejects mismatched totals', () => {
    const validation = validatePayouts(1000, [
      { place: 1, amount: 600, percent: 60 },
      { place: 2, amount: 300, percent: 40 },
    ])
    expect(validation.ok).toBe(false)
  })
})
