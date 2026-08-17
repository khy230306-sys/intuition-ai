import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import { clamp01, normalizeMap } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'

export const endingEngine: AnalysisEngine = {
  id: 'ending',
  name: 'Ending',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const digitCounts = new Array(10).fill(0)
    let totalDigits = 0

    for (const d of draws) {
      for (const n of d.numbers) {
        digitCounts[n % 10]!++
        totalDigits++
      }
    }

    const digitRates = digitCounts.map((c) => (totalDigits ? c / totalDigits : 0.1))
    const recentWindow = draws.slice(-30)
    const recentCounts = new Array(10).fill(0)
    let recentTotal = 0
    for (const d of recentWindow) {
      for (const n of d.numbers) {
        recentCounts[n % 10]!++
        recentTotal++
      }
    }
    const recentRates = recentCounts.map((c) => (recentTotal ? c / recentTotal : 0.1))

    const raw = emptyScores()
    for (let n = 1; n <= MAX_N; n++) {
      const d = n % 10
      const historical = digitRates[d]!
      const recent = recentRates[d]!
      const blend = historical * 0.65 + recent * 0.35
      raw[n] = blend
    }

    const numberScores = normalizeMap(raw)
    const spread = Math.max(...digitRates) - Math.min(...digitRates)

    return {
      engineId: 'ending',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence: draws.length >= 20 ? clamp01(spread * 8) : 0.2,
      evidence: {
        digitRates: Object.fromEntries(digitRates.map((r, i) => [i, r])),
        recentRates: Object.fromEntries(recentRates.map((r, i) => [i, r])),
      },
      metadata: { drawCount: draws.length, recentWindow: 30 },
    }
  },
}
