import type {
  ContinuationCluster,
  HistoricalMatch,
  PathClusterType,
  PathSummary,
  Side,
} from '../types'
import {
  HIDDEN_MIN_AVG_SIMILARITY,
  HIDDEN_MIN_OCCURRENCES,
  HIDDEN_MIN_SHARE,
} from './constants'
import { extractRoadShape, obviousContinuation } from './roadShape'
import { pathToString } from './roadUtils'

function isAlternating(path: readonly Side[]): boolean {
  if (path.length < 2) return false
  for (let i = 1; i < path.length; i += 1) {
    if (path[i] === path[i - 1]) return false
  }
  return true
}

export function classifyContinuation(
  currentSide: Side | null,
  continuation: readonly Side[],
): PathClusterType {
  if (continuation.length === 0) return 'OTHER'
  const first = continuation[0]!

  if (!currentSide) return 'OTHER'

  if (first === currentSide) return 'CONTINUE'

  // immediate flip
  if (continuation.length === 1) return 'FLIP_ONCE'

  // Full alternating structure takes priority over short flip-return.
  if (continuation.length >= 3 && isAlternating(continuation)) return 'ALTERNATING'

  const second = continuation[1]!
  if (second === currentSide) return 'FLIP_RETURN'
  if (isAlternating(continuation)) return 'ALTERNATING'
  if (continuation.every((s) => s === first)) return 'FLIP_ONCE'
  return 'OTHER'
}

function pathDistance(a: readonly Side[], b: readonly Side[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 1
  let diff = 0
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) diff += 1
  return diff / n
}

/**
 * Cluster historical continuations by structural type + next-side + path motif.
 */
export function clusterContinuations(
  matches: readonly HistoricalMatch[],
  currentSide: Side | null,
): ContinuationCluster[] {
  type Acc = {
    type: PathClusterType
    nextSide: Side
    key: string
    weight: number
    count: number
    simSum: number
    paths: Side[][]
  }

  const buckets = new Map<string, Acc>()

  for (const m of matches) {
    if (m.continuation.length === 0) continue
    const type = classifyContinuation(currentSide, m.continuation)
    const nextSide = m.continuation[0]!
    const motif = pathToString(m.continuation.slice(0, Math.min(4, m.continuation.length)))
    const key = `${type}|${nextSide}|${motif}`
    const prev = buckets.get(key)
    if (!prev) {
      buckets.set(key, {
        type,
        nextSide,
        key,
        weight: m.similarity,
        count: 1,
        simSum: m.similarity,
        paths: [m.continuation],
      })
    } else {
      prev.weight += m.similarity
      prev.count += 1
      prev.simSum += m.similarity
      prev.paths.push(m.continuation)
    }
  }

  const totalWeight = [...buckets.values()].reduce((s, b) => s + b.weight, 0) || 1

  const clusters: ContinuationCluster[] = [...buckets.values()].map((b) => {
    // representative = most common exact continuation string among bucket
    const freq = new Map<string, { path: Side[]; n: number }>()
    for (const p of b.paths) {
      const k = pathToString(p)
      const cur = freq.get(k)
      if (!cur) freq.set(k, { path: p, n: 1 })
      else cur.n += 1
    }
    const representative = [...freq.values()].sort((a, b2) => b2.n - a.n)[0]!.path
    return {
      type: b.type,
      representative,
      nextSide: b.nextSide,
      weight: b.weight,
      count: b.count,
      avgSimilarity: b.simSum / b.count,
      share: b.weight / totalWeight,
    }
  })

  return clusters.sort((a, b) => b.weight - a.weight || b.count - a.count)
}

function toSummary(c: ContinuationCluster | undefined, label: string): PathSummary {
  if (!c) return null
  return {
    path: c.representative,
    type: c.type,
    nextSide: c.nextSide,
    weight: c.weight,
    count: c.count,
    share: c.share,
    label,
  }
}

export function selectExpectedPath(clusters: readonly ContinuationCluster[]): PathSummary {
  return toSummary(clusters[0], 'EXPECTED')
}

export function selectAlternativePath(
  clusters: readonly ContinuationCluster[],
  expected: PathSummary,
): PathSummary {
  if (!expected) return toSummary(clusters[1], 'ALTERNATIVE')
  const alt = clusters.find((c) => {
    if (c.nextSide !== expected.nextSide) return true
    return pathDistance(c.representative, expected.path) >= 0.34
  })
  return toSummary(alt, 'ALTERNATIVE')
}

/**
 * Hidden = structurally different from the obvious human continuation,
 * with repeated historical support (not a one-off).
 */
export function selectHiddenPath(
  clusters: readonly ContinuationCluster[],
  current: readonly Side[],
  expected: PathSummary,
  alternative: PathSummary,
  horizon: number,
): PathSummary {
  const shape = extractRoadShape(current)
  const obvious = obviousContinuation(shape, horizon)

  const candidates = clusters.filter((c) => {
    if (c.count < HIDDEN_MIN_OCCURRENCES) return false
    if (c.share < HIDDEN_MIN_SHARE) return false
    if (c.avgSimilarity < HIDDEN_MIN_AVG_SIMILARITY) return false
    if (pathDistance(c.representative, obvious) < 0.4) return false
    if (expected && pathDistance(c.representative, expected.path) < 0.25) return false
    if (alternative && pathDistance(c.representative, alternative.path) < 0.25) return false
    // Prefer non-CONTINUE or different next side vs obvious
    const obviousNext = obvious[0]
    if (c.type === 'CONTINUE' && c.nextSide === obviousNext) return false
    return true
  })

  // Prefer strong but non-top-1 paths (hidden insight)
  const ranked = candidates.sort((a, b) => {
    const aNotExpected = expected && a.nextSide !== expected.nextSide ? 1 : 0
    const bNotExpected = expected && b.nextSide !== expected.nextSide ? 1 : 0
    return bNotExpected - aNotExpected || b.weight - a.weight
  })

  return toSummary(ranked[0], 'HIDDEN')
}

export function nextSideAgreement(clusters: readonly ContinuationCluster[], pick: Side): number {
  const total = clusters.reduce((s, c) => s + c.weight, 0)
  if (total <= 0) return 0.5
  const forPick = clusters.filter((c) => c.nextSide === pick).reduce((s, c) => s + c.weight, 0)
  return forPick / total
}
