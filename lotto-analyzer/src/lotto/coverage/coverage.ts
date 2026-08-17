import { MAX_N, PICK } from '../domain/types'
import { jaccard } from '../math/stats'

const JACCARD_DUP_THRESHOLD = 0.66

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

export interface CoverageScore {
  score: number
  exposures: Record<number, number>
  avgPairDup: number
}

export function scoreCoverage(games: number[][]): CoverageScore {
  const exposures: Record<number, number> = {}
  for (let n = 1; n <= MAX_N; n++) exposures[n] = 0

  const pairCounts = new Map<string, number>()
  let pairTotal = 0

  for (const game of games) {
    const sorted = [...game].sort((a, b) => a - b)
    for (const n of sorted) exposures[n] = (exposures[n] ?? 0) + 1
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = pairKey(sorted[i]!, sorted[j]!)
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
        pairTotal++
      }
    }
  }

  const gameCount = games.length
  const exposureValues = Object.values(exposures)
  const maxExposure = gameCount > 0 ? Math.max(...exposureValues) : 0
  const minExposure = gameCount > 0 ? Math.min(...exposureValues) : 0
  const spread = maxExposure - minExposure

  let dupPairs = 0
  for (const count of pairCounts.values()) {
    if (count > 1) dupPairs += count - 1
  }
  const avgPairDup = pairTotal > 0 ? dupPairs / pairTotal : 0

  const idealExposure = gameCount > 0 ? (gameCount * PICK) / MAX_N : 0
  let deviationSum = 0
  for (const n of exposureValues) {
    deviationSum += Math.abs(n - idealExposure)
  }
  const avgDeviation = exposureValues.length ? deviationSum / exposureValues.length : 0
  const balanceScore = gameCount > 0 ? Math.max(0, 100 - avgDeviation * 15) : 0
  const spreadPenalty = gameCount > 0 ? spread * 5 : 0
  const dupPenalty = avgPairDup * 40

  const score = Math.max(0, Math.min(100, balanceScore - spreadPenalty - dupPenalty))

  return { score, exposures, avgPairDup }
}

export function diversifyGames(
  games: number[][],
  scores: number[],
  rand: () => number,
): number[][] {
  if (games.length <= 1) return games.map((g) => [...g])

  const result = games.map((g) => [...g].sort((a, b) => a - b))
  const resultScores = [...scores]

  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const sim = jaccard(result[i]!, result[j]!)
      if (sim > JACCARD_DUP_THRESHOLD) {
        const replaceIdx = resultScores[i]! >= resultScores[j]! ? j : i
        const keepIdx = replaceIdx === i ? j : i
        const used = new Set<number>()
        for (let k = 0; k < result.length; k++) {
          if (k !== replaceIdx) for (const n of result[k]!) used.add(n)
        }
        const pool = Array.from({ length: MAX_N }, (_, k) => k + 1).filter((n) => !used.has(n))
        if (pool.length >= PICK) {
          const shuffled = [...pool]
          for (let s = shuffled.length - 1; s > 0; s--) {
            const r = Math.floor(rand() * (s + 1))
            ;[shuffled[s], shuffled[r]] = [shuffled[r]!, shuffled[s]!]
          }
          result[replaceIdx] = shuffled.slice(0, PICK).sort((a, b) => a - b)
          resultScores[replaceIdx] = resultScores[replaceIdx]! * 0.5
        } else {
          result[replaceIdx] = [...result[keepIdx]!]
        }
      }
    }
  }

  return result
}
