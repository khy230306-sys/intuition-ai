import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import { clamp01, mean, normalizeMap } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'

export const repeatEngine: AnalysisEngine = {
  id: 'repeat',
  name: 'Repeat',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const raw = emptyScores()
    const repeatCounts = new Array(MAX_N + 1).fill(0)
    const repeatOpportunities = new Array(MAX_N + 1).fill(0)
    const carryDistribution: number[] = []

    for (let i = 1; i < draws.length; i++) {
      const prev = new Set(draws[i - 1]!.numbers)
      const cur = draws[i]!.numbers
      let carry = 0
      for (const n of cur) {
        if (prev.has(n)) {
          repeatCounts[n]!++
          carry++
        }
        if (prev.has(n) || cur.includes(n)) repeatOpportunities[n]!++
      }
      carryDistribution.push(carry)
    }

    const avgCarry = mean(carryDistribution)
    const lastDraw = draws.at(-1)
    const lastSet = lastDraw ? new Set(lastDraw.numbers) : new Set<number>()

    for (let n = 1; n <= MAX_N; n++) {
      const historicalRate =
        repeatOpportunities[n]! > 0
          ? repeatCounts[n]! / Math.max(1, draws.length - 1)
          : 0
      const inLast = lastSet.has(n) ? 1 : 0
      const carryFit = 1 - Math.abs(historicalRate - avgCarry / 6)
      raw[n] = historicalRate * 0.55 + carryFit * 0.25 + inLast * historicalRate * 0.2
    }

    const numberScores = normalizeMap(raw)
    const histHistogram: Record<number, number> = {}
    for (const c of carryDistribution) histHistogram[c] = (histHistogram[c] ?? 0) + 1

    return {
      engineId: 'repeat',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence: draws.length >= 25 ? clamp01(avgCarry / 3) : 0.2,
      evidence: {
        avgCarry,
        carryHistogram: histHistogram,
        lastDrawNumbers: lastDraw?.numbers ?? [],
      },
      metadata: { drawCount: draws.length },
    }
  },
}
