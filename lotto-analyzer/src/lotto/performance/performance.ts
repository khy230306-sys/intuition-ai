import type { EnginePerformance } from '../domain/types'
import { PICK } from '../domain/types'

export function evaluatePrediction(
  prediction: number[] | { number: number }[],
  actualDraw: number[],
): number {
  const predNums =
    Array.isArray(prediction) && typeof prediction[0] === 'number'
      ? (prediction as number[])
      : (prediction as { number: number }[]).slice(0, PICK).map((r) => r.number)

  const actualSet = new Set(actualDraw)
  return predNums.filter((n) => actualSet.has(n)).length
}

export function createEmptyPerformance(
  engine: string,
  evaluationWindow: string,
): EnginePerformance {
  return {
    engine,
    evaluationWindow,
    drawCount: 0,
    averageMatches: 0,
    match3Count: 0,
    match4Count: 0,
    match5Count: 0,
    match6Count: 0,
    randomBaselineDelta: 0,
    calculatedAt: new Date().toISOString(),
  }
}

export function accumulatePerformance(
  perf: EnginePerformance,
  matches: number,
  randomMatches: number,
): EnginePerformance {
  const drawCount = perf.drawCount + 1
  const totalMatches = perf.averageMatches * perf.drawCount + matches
  const prevRandomAvg = perf.averageMatches - perf.randomBaselineDelta
  const totalRandom = prevRandomAvg * perf.drawCount + randomMatches
  const averageMatches = totalMatches / drawCount
  const randomAverage = totalRandom / drawCount

  return {
    ...perf,
    drawCount,
    averageMatches,
    match3Count: perf.match3Count + (matches >= 3 ? 1 : 0),
    match4Count: perf.match4Count + (matches >= 4 ? 1 : 0),
    match5Count: perf.match5Count + (matches >= 5 ? 1 : 0),
    match6Count: perf.match6Count + (matches === 6 ? 1 : 0),
    randomBaselineDelta: averageMatches - randomAverage,
    calculatedAt: new Date().toISOString(),
  }
}

export function evaluateBatch(
  engine: string,
  evaluationWindow: string,
  predictions: number[][],
  actuals: number[][],
  randomBaselines: number[],
): EnginePerformance {
  let perf = createEmptyPerformance(engine, evaluationWindow)
  for (let i = 0; i < predictions.length; i++) {
    const matches = evaluatePrediction(predictions[i]!, actuals[i]!)
    const randomMatches = randomBaselines[i] ?? 0
    perf = accumulatePerformance(perf, matches, randomMatches)
  }
  return perf
}
