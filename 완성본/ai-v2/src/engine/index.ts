import { chooseAdaptivePick } from './calibration'
import { computeConfidence } from './confidence'
import {
  clusterContinuations,
  nextSideAgreement,
  selectAlternativePath,
  selectExpectedPath,
  selectHiddenPath,
} from './continuation'
import { DEFAULT_HORIZON } from './constants'
import { extractRoadShape } from './roadShape'
import { generateFuturePaths, pathToString, toBpRoad } from './roadUtils'
import { searchHistoricalSimilarities } from './similaritySearch'
import type {
  EngineDebug,
  EnginePrediction,
  Outcome,
  PredictionRecord,
  Side,
} from '../types'

export { generateFuturePaths, toBpRoad, pathToString }
export { toRunLengths, extractRoadShape, mirrorSimilarity, runLengthSimilarity } from './roadShape'
export { searchHistoricalSimilarities } from './similaritySearch'
export {
  classifyContinuation,
  clusterContinuations,
  selectExpectedPath,
  selectAlternativePath,
  selectHiddenPath,
} from './continuation'
export { computeConfidence } from './confidence'
export { futurePathCounts } from './roadUtils'
export {
  chooseAdaptivePick,
  summarizeCalibration,
  CALIBRATION_WINDOW,
  CALIBRATION_POOR_RATE,
  CALIBRATION_LOSS_STREAK,
} from './calibration'
export * from './constants'

function fmt(path: readonly Side[] | null | undefined): string | null {
  if (!path || path.length === 0) return null
  return path.join('')
}

export type PredictOptions = {
  horizon?: number
  /** Exclusive index into fullOutcomeHistory for walk-forward tests. */
  asOfFullIndex?: number
  debug?: boolean
  /** Judged prediction history for calibration (never used to blindly reverse). */
  predictionRecords?: readonly PredictionRecord[]
}

function buildReason(
  expected: EnginePrediction['expectedPath'],
  alternative: EnginePrediction['alternativePath'],
  hidden: EnginePrediction['hiddenPath'],
  matchCount: number,
  adaptiveNote: string | null,
): string {
  const parts: string[] = []
  if (adaptiveNote) parts.push(adaptiveNote)
  if (matchCount > 0) parts.push(`유사 상황 ${matchCount}건`)
  if (expected) parts.push(`EXPECTED ${pathToString(expected.path)}`)
  if (alternative) parts.push(`ALT ${pathToString(alternative.path)}`)
  if (hidden) parts.push(`HIDDEN ${pathToString(hidden.path)}`)
  else if (matchCount > 0) parts.push('HIDDEN 없음')
  if (parts.length === 0) return '데이터 수집 중 · Future Road 대기'
  return parts.slice(0, 3).join(' · ')
}

/**
 * Future Road / Hidden Path Engine V2
 *
 * CURRENT ROAD → FUTURE PATH GENERATION → HISTORICAL SIMILARITY
 * → CONTINUATION ANALYSIS → EXPECTED / ALTERNATIVE / HIDDEN → NEXT PICK
 * (+ optional calibration when recent Expected-led form is poor)
 */
export function predictNext(
  fullHistory: readonly Outcome[],
  options: PredictOptions = {},
): EnginePrediction {
  const horizon = options.horizon ?? DEFAULT_HORIZON
  const asOfFull =
    options.asOfFullIndex === undefined ? fullHistory.length : options.asOfFullIndex
  const records = options.predictionRecords ?? []

  const historySlice = fullHistory.slice(0, asOfFull)
  const bp = toBpRoad(historySlice)

  void generateFuturePaths(horizon)

  if (bp.length === 0) {
    const debug: EngineDebug = {
      currentContext: [],
      matchCount: 0,
      topMatches: [],
      clusters: [],
      expectedPath: null,
      alternativePath: null,
      hiddenPath: null,
      finalPick: 'P',
      confidence: 50,
      nextSideAgreement: 0.5,
      obviousPath: 'P'.repeat(horizon),
      adapted: false,
      adaptiveSource: 'FALLBACK',
      lossStreak: 0,
      recentHitRate: 0.5,
    }
    return {
      pick: 'P',
      confidence: 50,
      reason: '첫 입력 전 기본 분석값',
      expectedPath: null,
      alternativePath: null,
      hiddenPath: null,
      matchCount: 0,
      nextSideAgreement: 0.5,
      adapted: false,
      adaptiveSource: 'FALLBACK',
      debug,
    }
  }

  const matches = searchHistoricalSimilarities(bp, {
    asOfIndex: bp.length,
    horizon,
  })

  const shape = extractRoadShape(bp)
  const clusters = clusterContinuations(matches, shape.currentSide)
  const expectedPath = selectExpectedPath(clusters)
  const alternativePath = selectAlternativePath(clusters, expectedPath)
  const hiddenPath = selectHiddenPath(clusters, bp, expectedPath, alternativePath, horizon)

  let fallbackPick: Side = shape.currentSide ?? 'P'
  if (!expectedPath && clusters.length > 0) {
    const pW = clusters.filter((c) => c.nextSide === 'P').reduce((s, c) => s + c.weight, 0)
    const bW = clusters.filter((c) => c.nextSide === 'B').reduce((s, c) => s + c.weight, 0)
    fallbackPick = pW >= bW ? 'P' : 'B'
  } else if (expectedPath) {
    fallbackPick = expectedPath.nextSide
  }

  const adaptive = chooseAdaptivePick({
    expected: expectedPath,
    alternative: alternativePath,
    hidden: hiddenPath,
    fallbackPick,
    records,
  })
  const pick = adaptive.pick

  const agreement = nextSideAgreement(clusters, pick)
  const confidence = computeConfidence({
    matchCount: matches.length,
    historyLength: bp.length,
    nextSideAgreement: agreement,
    expected: expectedPath,
    alternative: alternativePath,
    hidden: hiddenPath,
    topClusters: clusters,
    poorForm: adaptive.calibration.poorForm,
    adapted: adaptive.adapted,
  })

  const reason = buildReason(
    expectedPath,
    alternativePath,
    hiddenPath,
    matches.length,
    adaptive.note,
  )

  const debug: EngineDebug = {
    currentContext: bp.slice(-Math.min(20, bp.length)),
    matchCount: matches.length,
    topMatches: matches.slice(0, 8).map((m) => ({
      endIndex: m.endIndex,
      contextLength: m.contextLength,
      similarity: Number(m.similarity.toFixed(4)),
      continuation: m.continuation.join(''),
      mirrored: m.mirrored,
    })),
    clusters: clusters.slice(0, 8).map((c) => ({
      type: c.type,
      path: c.representative.join(''),
      nextSide: c.nextSide,
      weight: Number(c.weight.toFixed(4)),
      count: c.count,
      share: Number(c.share.toFixed(4)),
    })),
    expectedPath: fmt(expectedPath?.path),
    alternativePath: fmt(alternativePath?.path),
    hiddenPath: fmt(hiddenPath?.path),
    finalPick: pick,
    confidence,
    nextSideAgreement: Number(agreement.toFixed(4)),
    obviousPath: (shape.currentSide ?? 'P').repeat(horizon),
    adapted: adaptive.adapted,
    adaptiveSource: adaptive.source,
    lossStreak: adaptive.calibration.lossStreak,
    recentHitRate: Number(adaptive.calibration.hitRate.toFixed(4)),
  }

  if (options.debug) {
    console.debug('[FutureRoadEngine]', debug)
  }

  return {
    pick,
    confidence,
    reason,
    expectedPath,
    alternativePath,
    hiddenPath,
    matchCount: matches.length,
    nextSideAgreement: agreement,
    adapted: adaptive.adapted,
    adaptiveSource: adaptive.source,
    debug,
  }
}

/** Walk-forward evaluation without look-ahead leakage. */
export function walkForwardEvaluate(
  fullHistory: readonly Outcome[],
  startAt = 30,
): {
  total: number
  wins: number
  accuracy: number
  predictions: Array<{ index: number; pick: Side; actual: Side; win: boolean }>
} {
  const bp = toBpRoad(fullHistory)
  const predictions: Array<{ index: number; pick: Side; actual: Side; win: boolean }> = []

  for (let i = Math.max(1, startAt); i < bp.length; i += 1) {
    let seenBp = 0
    let fullIdx = 0
    while (fullIdx < fullHistory.length && seenBp < i) {
      const o = fullHistory[fullIdx]!
      if (o === 'B' || o === 'P') seenBp += 1
      fullIdx += 1
    }
    const pred = predictNext(fullHistory, { asOfFullIndex: fullIdx })
    const actual = bp[i]!
    predictions.push({
      index: i,
      pick: pred.pick,
      actual,
      win: pred.pick === actual,
    })
  }

  const wins = predictions.filter((p) => p.win).length
  return {
    total: predictions.length,
    wins,
    accuracy: predictions.length === 0 ? 0 : wins / predictions.length,
    predictions,
  }
}
