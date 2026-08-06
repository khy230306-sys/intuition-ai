import type { BetSide, OrbColor, RoundOutcome, RoundPattern } from './types'

const COLORS: OrbColor[] = ['blue', 'gold', 'violet']

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0]! % maxExclusive
  }
  return Math.floor(Math.random() * maxExclusive)
}

export function drawOrb(): OrbColor {
  return COLORS[randomInt(COLORS.length)]!
}

export function drawTrinityRound(): RoundOutcome {
  const draws: [OrbColor, OrbColor, OrbColor] = [drawOrb(), drawOrb(), drawOrb()]
  return evaluateDraws(draws)
}

export function evaluateDraws(draws: [OrbColor, OrbColor, OrbColor]): RoundOutcome {
  const counts: Record<OrbColor, number> = { blue: 0, gold: 0, violet: 0 }
  for (const color of draws) counts[color] += 1

  const unique = COLORS.filter((color) => counts[color] > 0)
  if (unique.length === 3) {
    return {
      draws,
      pattern: 'void',
      winner: 'void',
      majorityColor: null,
    }
  }

  const majorityColor = COLORS.reduce((best, color) =>
    counts[color] > counts[best] ? color : best,
  )
  const pattern: RoundPattern = counts[majorityColor] === 3 ? 'trinity' : 'majority'

  return {
    draws,
    pattern,
    winner: majorityColor,
    majorityColor,
  }
}

/**
 * Demo payout multipliers (stake included in returned amount when > 0).
 * - majority color: x2
 * - trinity color: x5
 * - void: x4
 */
export function settleTrinityPayout(
  side: BetSide,
  amount: number,
  outcome: RoundOutcome,
): number {
  if (amount <= 0) return 0
  if (side !== outcome.winner) return 0
  if (outcome.pattern === 'void') return amount * 4
  if (outcome.pattern === 'trinity') return amount * 5
  return amount * 2
}

export function sideMark(side: BetSide): string {
  if (side === 'blue') return 'B'
  if (side === 'gold') return 'G'
  if (side === 'violet') return 'V'
  return 'Ø'
}
