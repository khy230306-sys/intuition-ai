import { pathToString, predictNext } from './engine'
import { judgePrediction } from './judgment'
import type { Outcome, PredictionRecord, PendingPrediction } from './types'

export type ImportWalkForwardResult = {
  history: Outcome[]
  predictionRecords: PredictionRecord[]
  pending: PendingPrediction | null
  judgedCount: number
  wins: number
}

/**
 * Import a chronological road and rebuild picks + success/fail without look-ahead.
 * For each outcome: predict from past-only history, then judge if P/B, then append.
 */
export function importRoadWalkForward(
  outcomes: readonly Outcome[],
): ImportWalkForwardResult {
  const history: Outcome[] = []
  const predictionRecords: PredictionRecord[] = []
  let pending: PendingPrediction | null = null
  let judgedCount = 0
  let wins = 0

  for (const actual of outcomes) {
    const prediction = predictNext(history, {
      predictionRecords,
    })
    const bp = history.filter((x): x is 'P' | 'B' => x === 'P' || x === 'B')
    pending = {
      pick: prediction.pick,
      confidence: prediction.confidence,
      reason: prediction.reason,
      pattern: bp.slice(-20),
      createdAt: new Date().toISOString(),
      expectedPath: prediction.expectedPath
        ? pathToString(prediction.expectedPath.path)
        : null,
      alternativePath: prediction.alternativePath
        ? pathToString(prediction.alternativePath.path)
        : null,
      hiddenPath: prediction.hiddenPath
        ? pathToString(prediction.hiddenPath.path)
        : null,
      matchCount: prediction.matchCount,
      nextSideAgreement: prediction.nextSideAgreement,
    }

    if (actual === 'P' || actual === 'B') {
      const judged = judgePrediction(pending, actual)
      if (judged) {
        predictionRecords.push(judged)
        judgedCount += 1
        if (judged.result === 'WIN') wins += 1
      }
    }

    history.push(actual)
  }

  // Fresh next pick after full import
  const next = predictNext(history, { predictionRecords })
  const bp = history.filter((x): x is 'P' | 'B' => x === 'P' || x === 'B')
  pending = {
    pick: next.pick,
    confidence: next.confidence,
    reason: next.reason,
    pattern: bp.slice(-20),
    createdAt: new Date().toISOString(),
    expectedPath: next.expectedPath ? pathToString(next.expectedPath.path) : null,
    alternativePath: next.alternativePath
      ? pathToString(next.alternativePath.path)
      : null,
    hiddenPath: next.hiddenPath ? pathToString(next.hiddenPath.path) : null,
    matchCount: next.matchCount,
    nextSideAgreement: next.nextSideAgreement,
  }

  return { history, predictionRecords, pending, judgedCount, wins }
}
