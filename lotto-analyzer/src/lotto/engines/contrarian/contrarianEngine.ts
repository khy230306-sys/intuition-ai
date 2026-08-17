import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import { clamp01, normalizeMap } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'

function windowRate(draws: { numbers: number[] }[], n: number, w: number): number {
  const slice = draws.slice(-w)
  if (!slice.length) return 0
  let hits = 0
  for (const d of slice) if (d.numbers.includes(n)) hits++
  return hits / slice.length
}

export const contrarianEngine: AnalysisEngine = {
  id: 'contrarian',
  name: 'Contrarian',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const total = draws.length
    const expected = total ? 6 / MAX_N : 0
    const raw = emptyScores()
    const signals: Record<number, { underweight: number; recencyPenalty: number }> = {}

    for (let n = 1; n <= MAX_N; n++) {
      const allRate = windowRate(draws, n, total || 1)
      const r10 = windowRate(draws, n, 10)
      const r50 = windowRate(draws, n, 50)
      const r300 = windowRate(draws, n, Math.min(300, total))

      const longUnder = Math.max(0, expected - allRate)
      const midUnder = Math.max(0, expected - r50)
      const shortOver = Math.max(0, r10 - expected)
      const divergence = Math.max(0, r50 - r300)

      const underweight = longUnder * 0.35 + midUnder * 0.35 + divergence * 0.3
      const recencyPenalty = shortOver * 0.5
      const independent = underweight - recencyPenalty + (expected - r10) * 0.15

      raw[n] = 50 + independent * 500
      if (n <= 4) signals[n] = { underweight, recencyPenalty }
    }

    const numberScores = normalizeMap(raw)
    const coldCount = Object.values(numberScores).filter((s) => s >= 60).length

    return {
      engineId: 'contrarian',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence: draws.length >= 40 ? clamp01(coldCount / 15) : 0.25,
      evidence: { signals, method: 'independent-underweight-not-inverted-trend' },
      metadata: { drawCount: total, expectedRate: expected },
    }
  },
}
