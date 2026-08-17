import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { cached, drawsBefore } from '../../data/provider'
import { clamp01, normalizeMap } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'
const TOP_N = 80

interface TripleStat {
  triple: [number, number, number]
  count: number
  lift: number
}

function tripleKey(a: number, b: number, c: number): string {
  return [a, b, c].sort((x, y) => x - y).join('-')
}

function buildTopTriples(draws: { numbers: number[] }[]): TripleStat[] {
  const total = draws.length
  const single = new Array(MAX_N + 1).fill(0)
  const tripleCount = new Map<string, { nums: [number, number, number]; count: number }>()

  for (const d of draws) {
    const nums = [...d.numbers].sort((a, b) => a - b)
    for (const n of nums) single[n]!++
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        for (let k = j + 1; k < nums.length; k++) {
          const t: [number, number, number] = [nums[i]!, nums[j]!, nums[k]!]
          const key = tripleKey(t[0], t[1], t[2])
          const prev = tripleCount.get(key)
          if (prev) prev.count++
          else tripleCount.set(key, { nums: t, count: 1 })
        }
      }
    }
  }

  const expectedTriple =
    total > 0
      ? (6 / MAX_N) *
        (5 / (MAX_N - 1)) *
        (4 / (MAX_N - 2))
      : 0

  const stats: TripleStat[] = []
  for (const { nums, count } of tripleCount.values()) {
    const [a, b, c] = nums
    const joint = count / total
    const marginal =
      (single[a]! / total) *
      (single[b]! / total) *
      (single[c]! / total)
    const lift = expectedTriple > 0 ? joint / (marginal + 1e-12) : 1
    stats.push({ triple: nums, count, lift })
  }

  return stats.sort((x, y) => y.lift - x.lift || y.count - x.count).slice(0, TOP_N)
}

export const tripleEngine: AnalysisEngine = {
  id: 'triple',
  name: 'Triple',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const cacheKey = `top-triples-${draws.length}-${draws.at(-1)?.drawNumber ?? 0}`
    const topTriples = cached(cacheKey, () => buildTopTriples(draws))
    const raw = emptyScores()
    const participation = new Array(MAX_N + 1).fill(0)
    const strength = new Array(MAX_N + 1).fill(0)

    for (const t of topTriples) {
      const w = t.lift * Math.log1p(t.count)
      for (const n of t.triple) {
        participation[n]!++
        strength[n]! += w
      }
    }

    for (let n = 1; n <= MAX_N; n++) {
      raw[n] = participation[n]! > 0 ? strength[n]! / participation[n]! : 0
    }

    const numberScores = normalizeMap(raw)
    const confidence = draws.length >= 60 ? clamp01(topTriples.length / TOP_N) : 0.25

    return {
      engineId: 'triple',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence,
      evidence: { topTriples: topTriples.slice(0, 15) },
      metadata: { drawCount: draws.length, cachedTop: TOP_N },
    }
  },
}
