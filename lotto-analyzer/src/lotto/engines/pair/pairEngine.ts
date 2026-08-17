import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { cached, drawsBefore } from '../../data/provider'
import { clamp01, normalizeMap } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'

interface PairMetrics {
  coOccurrence: number
  lift: number
  jaccard: number
  conditionalA: number
  conditionalB: number
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function buildPairMatrix(draws: { numbers: number[] }[]): Map<string, PairMetrics> {
  const total = draws.length
  const single = new Array(MAX_N + 1).fill(0)
  const pairCount = new Map<string, number>()

  for (const d of draws) {
    const nums = d.numbers
    for (const n of nums) single[n]!++
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = pairKey(nums[i]!, nums[j]!)
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1)
      }
    }
  }

  const expectedPair = total ? (6 / MAX_N) * (5 / (MAX_N - 1)) : 0
  const out = new Map<string, PairMetrics>()

  for (let a = 1; a < MAX_N; a++) {
    for (let b = a + 1; b <= MAX_N; b++) {
      const key = pairKey(a, b)
      const co = pairCount.get(key) ?? 0
      const rateA = single[a]! / Math.max(1, total)
      const rateB = single[b]! / Math.max(1, total)
      const joint = co / Math.max(1, total)
      const lift = expectedPair > 0 ? joint / (rateA * rateB + 1e-9) : 1
      const union = rateA + rateB - joint
      const jaccard = union > 0 ? joint / union : 0
      const conditionalA = single[a]! > 0 ? co / single[a]! : 0
      const conditionalB = single[b]! > 0 ? co / single[b]! : 0
      out.set(key, { coOccurrence: co, lift, jaccard, conditionalA, conditionalB })
    }
  }

  return out
}

function recentHotNumbers(draws: { numbers: number[] }[], window = 20): number[] {
  const slice = draws.slice(-window)
  const counts = new Array(MAX_N + 1).fill(0)
  for (const d of slice) for (const n of d.numbers) counts[n]!++
  return counts
    .map((c, n) => ({ n, c }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.c - a.c)
    .slice(0, 12)
    .map((x) => x.n)
}

export const pairEngine: AnalysisEngine = {
  id: 'pair',
  name: 'Pair',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const cacheKey = `pair-matrix-${draws.length}-${draws.at(-1)?.drawNumber ?? 0}`
    const matrix = cached(cacheKey, () => buildPairMatrix(draws))
    const hot = recentHotNumbers(draws)
    const raw = emptyScores()

    for (let n = 1; n <= MAX_N; n++) {
      let liftSum = 0
      let liftCount = 0
      for (const h of hot) {
        if (h === n) continue
        const m = matrix.get(pairKey(n, h))
        if (m) {
          liftSum += m.lift * 0.6 + m.jaccard * 0.25 + m.conditionalA * 0.15
          liftCount++
        }
      }
      raw[n] = liftCount ? liftSum / liftCount : 1
    }

    const numberScores = normalizeMap(raw)
    const topPairs = [...matrix.entries()]
      .sort((a, b) => b[1].lift - a[1].lift)
      .slice(0, 10)
      .map(([k, v]) => ({ pair: k, ...v }))

    return {
      engineId: 'pair',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence: draws.length >= 50 ? clamp01(hot.length / 12) : 0.3,
      evidence: { hotNumbers: hot, topPairs },
      metadata: { drawCount: draws.length, hotWindow: 20 },
    }
  },
}
