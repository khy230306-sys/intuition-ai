import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import {
  clamp01,
  lowCount,
  mean,
  normalizeMap,
  oddCount,
  sectionCounts,
} from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'

interface StructureProfile {
  sectionMeans: number[]
  oddMean: number
  lowMean: number
  sumMean: number
}

function buildProfile(draws: { numbers: number[] }[]): StructureProfile {
  const sections: number[][] = []
  const odds: number[] = []
  const lows: number[] = []
  const sums: number[] = []

  for (const d of draws) {
    sections.push(sectionCounts(d.numbers))
    odds.push(oddCount(d.numbers))
    lows.push(lowCount(d.numbers))
    sums.push(d.numbers.reduce((a, b) => a + b, 0))
  }

  const sectionMeans = [0, 1, 2, 3, 4].map((i) =>
    mean(sections.map((s) => s[i] ?? 0)),
  )

  return {
    sectionMeans,
    oddMean: mean(odds),
    lowMean: mean(lows),
    sumMean: mean(sums),
  }
}

function sectionIndex(n: number): number {
  if (n <= 10) return 0
  if (n <= 20) return 1
  if (n <= 30) return 2
  if (n <= 40) return 3
  return 4
}

export const structureEngine: AnalysisEngine = {
  id: 'structure',
  name: 'Structure',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const profile = buildProfile(draws)
    const raw = emptyScores()

    for (let n = 1; n <= MAX_N; n++) {
      const sec = sectionIndex(n)
      const sectionBoost = profile.sectionMeans[sec]! / 2
      const oddBoost = n % 2 === 1 ? profile.oddMean / 6 : (6 - profile.oddMean) / 6
      const lowBoost = n <= 22 ? profile.lowMean / 6 : (6 - profile.lowMean) / 6
      const sumProximity = 1 - Math.abs(n - profile.sumMean / 6) / MAX_N
      raw[n] = sectionBoost * 0.45 + oddBoost * 0.2 + lowBoost * 0.2 + sumProximity * 0.15
    }

    const numberScores = normalizeMap(raw)

    return {
      engineId: 'structure',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence: draws.length >= 30 ? clamp01(1 - stddev(profile.sectionMeans) / 2) : 0.2,
      evidence: { profile },
      metadata: { drawCount: draws.length, usage: 'section-balance-tendency' },
    }
  },
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}
