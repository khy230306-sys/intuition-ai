import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { cached, drawsBefore } from '../../data/provider'
import { clamp01, normalizeMap } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'

function buildAdjacency(draws: { numbers: number[] }[]): Map<number, Map<number, number>> {
  const adj = new Map<number, Map<number, number>>()
  for (let n = 1; n <= MAX_N; n++) adj.set(n, new Map())

  for (const d of draws) {
    const nums = d.numbers
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const a = nums[i]!
        const b = nums[j]!
        const rowA = adj.get(a)!
        const rowB = adj.get(b)!
        rowA.set(b, (rowA.get(b) ?? 0) + 1)
        rowB.set(a, (rowB.get(a) ?? 0) + 1)
      }
    }
  }
  return adj
}

function centralityScore(adj: Map<number, Map<number, number>>, n: number): number {
  const row = adj.get(n)
  if (!row || row.size === 0) return 0
  let degree = 0
  let weighted = 0
  for (const [, w] of row) {
    degree++
    weighted += w
  }
  const avgWeight = weighted / degree
  return degree * 0.4 + avgWeight * 0.6
}

export const networkEngine: AnalysisEngine = {
  id: 'network',
  name: 'Network',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const cacheKey = `network-adj-${draws.length}-${draws.at(-1)?.drawNumber ?? 0}`
    const adj = cached(cacheKey, () => buildAdjacency(draws))
    const raw = emptyScores()
    const centralities: { number: number; score: number }[] = []

    for (let n = 1; n <= MAX_N; n++) {
      const c = centralityScore(adj, n)
      raw[n] = c
      centralities.push({ number: n, score: c })
    }

    const numberScores = normalizeMap(raw)
    centralities.sort((a, b) => b.score - a.score)

    return {
      engineId: 'network',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence: draws.length >= 40 ? clamp01(centralities[0]!.score / (centralities.at(-1)!.score + 1)) : 0.25,
      evidence: {
        topCentral: centralities.slice(0, 10),
        bottomCentral: centralities.slice(-5),
      },
      metadata: { drawCount: draws.length, metric: 'degree-weighted-centrality' },
    }
  },
}
