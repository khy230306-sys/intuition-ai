import {
  CONFIDENCE_EMPTY,
  CONFIDENCE_MAX,
  CONFIDENCE_MIN,
} from './constants'
import type { ContinuationCluster, PathSummary } from '../types'

export function computeConfidence(input: {
  matchCount: number
  historyLength: number
  nextSideAgreement: number
  expected: PathSummary
  alternative: PathSummary
  hidden: PathSummary
  topClusters: readonly ContinuationCluster[]
  /** Recent calibration poor-form dampens confidence further. */
  poorForm?: boolean
  adapted?: boolean
}): number {
  const {
    matchCount,
    historyLength,
    nextSideAgreement,
    expected,
    alternative,
    hidden,
    poorForm = false,
    adapted = false,
  } = input

  if (historyLength === 0) return CONFIDENCE_EMPTY
  if (matchCount === 0) return CONFIDENCE_MIN

  // Sample strength
  const sampleFactor = Math.min(1, matchCount / 24)

  // Similarity / concentration on expected
  const expectedShare = expected?.share ?? 0
  const altShare = alternative?.share ?? 0
  const hiddenShare = hidden?.share ?? 0

  // If paths split hard, confidence must drop
  const topShares = [expectedShare, altShare, hiddenShare].filter((x) => x > 0).sort((a, b) => b - a)
  const leader = topShares[0] ?? 0
  const runner = topShares[1] ?? 0
  const splitPenalty = runner > 0 && leader - runner < 0.12 ? 0.18 : runner > 0.28 ? 0.12 : 0

  const agreementFactor = nextSideAgreement // 0.5 = coin flip, 1 = unanimous
  const concentration = leader

  const dataFactor = Math.min(1, historyLength / 80)

  let raw =
    0.34 * agreementFactor +
    0.26 * concentration +
    0.22 * sampleFactor +
    0.18 * dataFactor

  raw -= splitPenalty
  if (poorForm) raw -= 0.08
  if (adapted) raw -= 0.04

  const pct = Math.round(raw * 100)
  return Math.max(CONFIDENCE_MIN, Math.min(CONFIDENCE_MAX, pct))
}
