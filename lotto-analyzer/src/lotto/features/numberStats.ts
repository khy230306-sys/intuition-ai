import type { LottoDraw, NumberStatistic, Temperature } from '../domain/types'
import { MAX_N } from '../domain/types'
import { mean, percentileRank } from '../math/stats'
import { appearanceIndexes } from '../engines/types'

function countInWindow(draws: LottoDraw[], n: number, window: number): number {
  const slice = window >= draws.length ? draws : draws.slice(-window)
  let c = 0
  for (const d of slice) if (d.numbers.includes(n)) c++
  return c
}

function temperatureFromPercentile(p: number): Temperature {
  if (p >= 0.85) return 'HOT'
  if (p >= 0.65) return 'WARM'
  if (p >= 0.35) return 'NEUTRAL'
  if (p >= 0.15) return 'COLD'
  return 'FROZEN'
}

export function computeNumberStatistics(draws: LottoDraw[]): NumberStatistic[] {
  const total = draws.length
  const latestDraw = draws.at(-1)?.drawNumber ?? 0
  const stats: NumberStatistic[] = []
  const recentRates: number[] = []

  for (let n = 1; n <= MAX_N; n++) {
    const idxs = appearanceIndexes(draws, n)
    const appearances = idxs.map((i) => draws[i]!.drawNumber)
    const totalAppearances = appearances.length
    const appearanceRate = total ? totalAppearances / total : 0

    const delays: number[] = []
    for (let i = 1; i < appearances.length; i++) {
      delays.push(appearances[i]! - appearances[i - 1]!)
    }

    const lastAppearanceDraw = appearances.at(-1) ?? 0
    const currentDelay = lastAppearanceDraw ? latestDraw - lastAppearanceDraw : latestDraw
    const averageDelay = delays.length ? mean(delays) : total || 1
    const maxDelay = delays.length ? Math.max(...delays) : currentDelay
    const minDelay = delays.length ? Math.min(...delays) : 0

    const recent5 = countInWindow(draws, n, 5)
    const recent10 = countInWindow(draws, n, 10)
    const recent20 = countInWindow(draws, n, 20)
    const recent30 = countInWindow(draws, n, 30)
    const recent50 = countInWindow(draws, n, 50)
    const recent100 = countInWindow(draws, n, 100)
    const recent300 = countInWindow(draws, n, 300)

    const recentRate = total >= 20 ? recent20 / Math.min(20, total) : appearanceRate
    const longRate = total >= 100 ? recent100 / Math.min(100, total) : appearanceRate
    const rollingTrend = recentRate - longRate

    let consecutiveAppearanceCount = 0
    for (let i = draws.length - 1; i >= 0; i--) {
      if (draws[i]!.numbers.includes(n)) consecutiveAppearanceCount++
      else break
    }

    let repeatHits = 0
    let repeatOpportunities = 0
    for (let i = 1; i < draws.length; i++) {
      const prev = new Set(draws[i - 1]!.numbers)
      const cur = draws[i]!.numbers
      repeatOpportunities++
      if (cur.some((x) => prev.has(x))) repeatHits++
    }
    const repeatAfterPreviousDrawRate =
      repeatOpportunities > 0 ? repeatHits / repeatOpportunities : 0

    recentRates.push(recent20 / Math.max(1, Math.min(20, total)))

    stats.push({
      number: n,
      totalAppearances,
      appearanceRate,
      lastAppearanceDraw,
      currentDelay,
      averageDelay,
      maxDelay,
      minDelay,
      recent5,
      recent10,
      recent20,
      recent30,
      recent50,
      recent100,
      recent300,
      consecutiveAppearanceCount,
      repeatAfterPreviousDrawRate,
      rollingTrend,
      temperature: 'NEUTRAL',
      percentileScore: 0,
    })
  }

  const sortedRates = [...recentRates].sort((a, b) => a - b)
  for (let i = 0; i < stats.length; i++) {
    const s = stats[i]!
    const p = percentileRank(sortedRates, recentRates[i]!)
    s.percentileScore = p * 100
    s.temperature = temperatureFromPercentile(p)
  }

  return stats
}
