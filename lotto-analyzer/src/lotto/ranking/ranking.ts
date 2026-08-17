import type {
  EngineResult,
  Grade,
  NumberRankingRow,
  NumberStatistic,
} from '../domain/types'
import { MAX_N } from '../domain/types'
import { buildCouncil } from '../council/council'
import { normalizeMap } from '../math/stats'

function gradeFromScore(score: number): Grade {
  if (score >= 80) return 'S'
  if (score >= 65) return 'A'
  if (score >= 50) return 'B'
  if (score >= 35) return 'C'
  return 'D'
}

function reasonSummary(
  number: number,
  score: number,
  stats: NumberStatistic | undefined,
  breakdown: Record<string, number>,
): string[] {
  const reasons: string[] = []
  if (stats) {
    reasons.push(`delay ${stats.currentDelay}`)
    reasons.push(`temp ${stats.temperature}`)
    if (stats.rollingTrend > 0.05) reasons.push('rising trend')
    if (stats.rollingTrend < -0.05) reasons.push('cooling trend')
  }
  const topEngines = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id, s]) => `${id}:${s.toFixed(0)}`)
  if (topEngines.length) reasons.push(`engines ${topEngines.join(', ')}`)
  reasons.push(`score ${score.toFixed(1)}`)
  if (!stats) reasons.push(`#${number}`)
  return reasons
}

export function buildNumberRankings(
  engineResults: EngineResult[],
  numberStats: NumberStatistic[],
): NumberRankingRow[] {
  const council = buildCouncil(engineResults)
  const statsByNumber = new Map(numberStats.map((s) => [s.number, s]))

  const master = engineResults.find((r) => r.engineId === 'master')
  const blended: Record<number, number> = {}

  if (master) {
    Object.assign(blended, master.numberScores)
  } else {
    for (let n = 1; n <= MAX_N; n++) {
      let sum = 0
      let count = 0
      for (const r of engineResults) {
        sum += r.numberScores[n] ?? 50
        count++
      }
      blended[n] = count ? sum / count : 50
    }
  }

  const normalized = normalizeMap(blended)
  const ranked = Object.entries(normalized)
    .map(([n, s]) => ({ number: Number(n), score: s }))
    .sort((a, b) => b.score - a.score || a.number - b.number)

  const breakdownByNumber: Record<number, Record<string, number>> = {}
  for (let n = 1; n <= MAX_N; n++) {
    breakdownByNumber[n] = {}
    for (const r of engineResults) {
      breakdownByNumber[n]![r.engineId] = r.numberScores[n] ?? 50
    }
  }

  return ranked.map((row, idx) => {
    const entry = council.find((c) => c.number === row.number)
    const stats = statsByNumber.get(row.number)
    const breakdown = breakdownByNumber[row.number] ?? {}

    return {
      number: row.number,
      rank: idx + 1,
      score: row.score,
      grade: gradeFromScore(row.score),
      temperature: stats?.temperature ?? 'NEUTRAL',
      engineConsensus: entry?.consensus ?? 'neutral',
      votes: entry?.votes ?? {},
      breakdown,
      lastAppearance: stats?.lastAppearanceDraw ?? 0,
      reasonSummary: reasonSummary(row.number, row.score, stats, breakdown),
    }
  })
}
