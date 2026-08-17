import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N, PICK } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import { clamp01, gaps, mean, normalizeMap } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'

interface GapProfile {
  avgGap: number
  maxGap: number
  gapHistogram: Record<number, number>
}

function buildGapProfile(draws: { numbers: number[] }[]): GapProfile {
  const allGaps: number[] = []
  const histogram: Record<number, number> = {}

  for (const d of draws) {
    const g = gaps(d.numbers)
    for (const x of g) {
      allGaps.push(x)
      histogram[x] = (histogram[x] ?? 0) + 1
    }
  }

  return {
    avgGap: mean(allGaps),
    maxGap: allGaps.length ? Math.max(...allGaps) : 0,
    gapHistogram: histogram,
  }
}

function gapFitScore(n: number, profile: GapProfile, selected: number[]): number {
  if (!selected.length) {
    const idealPos = profile.avgGap
    return 1 / (1 + Math.abs(n - idealPos * 2) / MAX_N)
  }

  const sorted = [...selected, n].sort((a, b) => a - b)
  const g = gaps(sorted)
  let fit = 0
  for (const x of g) {
    fit += 1 / (1 + Math.abs(x - profile.avgGap))
  }
  return fit / g.length
}

export const gapEngine: AnalysisEngine = {
  id: 'gap',
  name: 'Gap',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const profile = buildGapProfile(draws)
    const anchor = draws.at(-1)?.numbers ?? []
    const raw = emptyScores()

    for (let n = 1; n <= MAX_N; n++) {
      if (anchor.includes(n)) {
        raw[n] = 0.3
        continue
      }
      const solo = gapFitScore(n, profile, [])
      const withAnchor = gapFitScore(n, profile, anchor.slice(0, 3))
      raw[n] = solo * 0.5 + withAnchor * 0.5
    }

    const numberScores = normalizeMap(raw)

    return {
      engineId: 'gap',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence: draws.length >= 30 ? clamp01(profile.avgGap / 10) : 0.2,
      evidence: { profile, anchorSample: anchor },
      metadata: { drawCount: draws.length, pick: PICK },
    }
  },
}
