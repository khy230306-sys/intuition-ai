import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import { clamp01, normalizeMap } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const WINDOWS = [5, 10, 20, 30, 50, 100, 300] as const
const VERSION = '1.0.0'

function rateInWindow(
  draws: { numbers: number[] }[],
  n: number,
  window: number | 'all',
): number {
  if (!draws.length) return 0
  const slice = window === 'all' ? draws : draws.slice(-window)
  let hits = 0
  for (const d of slice) if (d.numbers.includes(n)) hits++
  return hits / slice.length
}

export const trendEngine: AnalysisEngine = {
  id: 'trend',
  name: 'Trend',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const total = draws.length
    const expectedRate = total ? 6 / MAX_N : 0

    const raw: Record<number, number> = emptyScores()
    const evidence: Record<string, unknown> = { windows: {}, expectedRate }

    for (let n = 1; n <= MAX_N; n++) {
      const windowRates: Record<string, number> = {}
      for (const w of WINDOWS) {
        windowRates[String(w)] = rateInWindow(draws, n, w)
      }
      windowRates.all = rateInWindow(draws, n, 'all')

      const recentRate =
        (windowRates['5']! +
          windowRates['10']! +
          windowRates['20']!) /
        3
      const longTermRate =
        (windowRates['100']! +
          windowRates['300']! +
          windowRates.all) /
        3

      const trendDelta = recentRate - longTermRate
      const overheated =
        recentRate > expectedRate * 1.35 && windowRates['5']! > windowRates['20']!

      let score = 50 + trendDelta * 400
      if (overheated) score -= (recentRate - expectedRate) * 250
      if (recentRate < expectedRate * 0.6 && trendDelta > 0) score += 8

      raw[n] = score
      if (n <= 5 || n === 7 || n === 23) {
        ;(evidence.windows as Record<number, unknown>)[n] = {
          recentRate,
          longTermRate,
          trendDelta,
          overheated,
        }
      }
    }

    const numberScores = normalizeMap(raw)
    const deltas = Object.values(numberScores).map((s) => Math.abs(s - 50))
    const confidence = total >= 50 ? clamp01(mean(deltas) / 50) : 0.3

    return {
      engineId: 'trend',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence,
      evidence,
      metadata: { drawCount: total, windows: [...WINDOWS, 'all'] },
    }
  },
}

function mean(xs: number[]): number {
  if (!xs.length) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
