import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import { clamp01, mean, normalizeMap, percentileRank } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { appearanceIndexes, emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'

export const delayEngine: AnalysisEngine = {
  id: 'delay',
  name: 'Delay',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const latest = draws.at(-1)?.drawNumber ?? 0
    const raw = emptyScores()
    const perNumber: Record<number, unknown> = {}
    const ratios: number[] = []

    for (let n = 1; n <= MAX_N; n++) {
      const idxs = appearanceIndexes(draws, n)
      const appearances = idxs.map((i) => draws[i]!.drawNumber)
      const delays: number[] = []
      for (let i = 1; i < appearances.length; i++) {
        delays.push(appearances[i]! - appearances[i - 1]!)
      }

      const lastApp = appearances.at(-1) ?? 0
      const currentDelay = lastApp ? latest - lastApp : latest
      const avgDelay = delays.length ? mean(delays) : draws.length || 1
      const maxDelay = delays.length ? Math.max(...delays) : currentDelay
      const ratio = avgDelay > 0 ? currentDelay / avgDelay : 1
      ratios.push(ratio)

      raw[n] = ratio
      if (n <= 3) {
        perNumber[n] = { currentDelay, avgDelay, maxDelay, ratio }
      }
    }

    const sortedRatios = [...ratios].sort((a, b) => a - b)
    for (let n = 1; n <= MAX_N; n++) {
      const ratio = raw[n]!
      const pct = percentileRank(sortedRatios, ratio)
      const nearExpected = 1 - Math.abs(ratio - 1)
      const notExtreme = ratio < 2.2 ? 1 : Math.max(0, 1 - (ratio - 2.2) / 2)
      const mildUnder = ratio >= 0.55 && ratio <= 1.15 ? 0.15 : 0
      raw[n] = nearExpected * 0.55 + notExtreme * 0.3 + pct * 0.15 + mildUnder
    }

    const numberScores = normalizeMap(raw)
    const spread = Math.max(...Object.values(numberScores)) - Math.min(...Object.values(numberScores))
    const confidence = draws.length >= 30 ? clamp01(spread / 80) : 0.25

    return {
      engineId: 'delay',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence,
      evidence: { sample: perNumber, note: 'ratio-near-1-weighted-not-overdue-blind' },
      metadata: { drawCount: draws.length },
    }
  },
}
