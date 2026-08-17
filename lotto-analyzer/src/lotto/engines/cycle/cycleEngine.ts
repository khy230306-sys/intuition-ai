import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import { clamp01, mean, median, normalizeMap, stddev } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { appearanceIndexes, emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'

export const cycleEngine: AnalysisEngine = {
  id: 'cycle',
  name: 'Cycle',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const latest = draws.at(-1)?.drawNumber ?? 0
    const raw = emptyScores()
    const samples: Record<number, unknown> = {}

    for (let n = 1; n <= MAX_N; n++) {
      const idxs = appearanceIndexes(draws, n)
      const rounds = idxs.map((i) => draws[i]!.drawNumber)
      const intervals: number[] = []
      for (let i = 1; i < rounds.length; i++) {
        intervals.push(rounds[i]! - rounds[i - 1]!)
      }

      if (intervals.length < 2) {
        raw[n] = 50
        continue
      }

      const intervalMean = mean(intervals)
      const intervalMedian = median(intervals)
      const intervalVar = stddev(intervals) ** 2
      const lastRound = rounds.at(-1) ?? 0
      const sinceLast = lastRound ? latest - lastRound : latest
      const deviation = Math.abs(sinceLast - intervalMean)
      const stability = 1 / (1 + intervalVar / (intervalMean ** 2 + 1))
      const proximity = 1 / (1 + deviation / (intervalMedian + 1))

      raw[n] = stability * 0.45 + proximity * 0.55
      if (n <= 3) {
        samples[n] = {
          intervalMean,
          intervalMedian,
          intervalVar,
          sinceLast,
          deviation,
        }
      }
    }

    const numberScores = normalizeMap(raw)
    const confidence = draws.length >= 40 ? clamp01(stddev(Object.values(numberScores)) / 35) : 0.2

    return {
      engineId: 'cycle',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence,
      evidence: { samples },
      metadata: { drawCount: draws.length },
    }
  },
}
