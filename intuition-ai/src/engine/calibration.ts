import type { PathSummary, PredictionRecord, Side } from '../types'

/** Recent judged picks used for calibration (not simple reverse). */
export const CALIBRATION_WINDOW = 12
export const CALIBRATION_MIN_SAMPLES = 8
/** Switch path source only when recent hit-rate is at/below this. */
export const CALIBRATION_POOR_RATE = 0.42
/** Require a current losing streak before switching. */
export const CALIBRATION_LOSS_STREAK = 3
/** Alternative/Hidden must keep at least this share to be eligible. */
export const CALIBRATION_MIN_PATH_SHARE = 0.14

export type CalibrationSnapshot = {
  sampleCount: number
  wins: number
  losses: number
  hitRate: number
  lossStreak: number
  poorForm: boolean
}

export type AdaptiveDecision = {
  pick: Side
  source: 'EXPECTED' | 'ALTERNATIVE' | 'HIDDEN' | 'FALLBACK'
  adapted: boolean
  note: string | null
  calibration: CalibrationSnapshot
}

export function summarizeCalibration(
  records: readonly PredictionRecord[],
  window = CALIBRATION_WINDOW,
): CalibrationSnapshot {
  const judged = records
    .filter((r) => r.result === 'WIN' || r.result === 'LOSE')
    .slice(-window)

  const wins = judged.filter((r) => r.result === 'WIN').length
  const losses = judged.filter((r) => r.result === 'LOSE').length
  const sampleCount = judged.length
  const hitRate = sampleCount === 0 ? 0.5 : wins / sampleCount

  let lossStreak = 0
  for (let i = judged.length - 1; i >= 0; i -= 1) {
    if (judged[i]!.result === 'LOSE') lossStreak += 1
    else break
  }

  const poorForm =
    sampleCount >= CALIBRATION_MIN_SAMPLES &&
    hitRate <= CALIBRATION_POOR_RATE &&
    lossStreak >= CALIBRATION_LOSS_STREAK

  return { sampleCount, wins, losses, hitRate, lossStreak, poorForm }
}

/**
 * When recent Expected-led picks are failing, prefer Alternative or Hidden
 * that already have historical support and a different next side.
 *
 * Never blindly flips the pick just because of recent losses.
 */
export function chooseAdaptivePick(input: {
  expected: PathSummary
  alternative: PathSummary
  hidden: PathSummary
  fallbackPick: Side
  records: readonly PredictionRecord[]
}): AdaptiveDecision {
  const calibration = summarizeCalibration(input.records)
  const expectedPick = input.expected?.nextSide ?? input.fallbackPick

  if (!calibration.poorForm) {
    return {
      pick: expectedPick,
      source: input.expected ? 'EXPECTED' : 'FALLBACK',
      adapted: false,
      note: null,
      calibration,
    }
  }

  const alt = input.alternative
  if (
    alt &&
    alt.nextSide !== expectedPick &&
    alt.share >= CALIBRATION_MIN_PATH_SHARE &&
    alt.count >= 2
  ) {
    return {
      pick: alt.nextSide,
      source: 'ALTERNATIVE',
      adapted: true,
      note: `보정 ALT · 최근 ${calibration.lossStreak}연패`,
      calibration,
    }
  }

  const hidden = input.hidden
  if (
    hidden &&
    hidden.nextSide !== expectedPick &&
    hidden.share >= CALIBRATION_MIN_PATH_SHARE &&
    hidden.count >= 3
  ) {
    return {
      pick: hidden.nextSide,
      source: 'HIDDEN',
      adapted: true,
      note: `보정 HIDDEN · 최근 ${calibration.lossStreak}연패`,
      calibration,
    }
  }

  // No supported alternate path — keep Expected, but caller will dampen confidence.
  return {
    pick: expectedPick,
    source: input.expected ? 'EXPECTED' : 'FALLBACK',
    adapted: false,
    note: `부진 감지 · 대안 경로 부족`,
    calibration,
  }
}
