import { describe, expect, it } from 'vitest'
import {
  CALIBRATION_LOSS_STREAK,
  CALIBRATION_MIN_SAMPLES,
  chooseAdaptivePick,
  summarizeCalibration,
} from './calibration'
import type { PathSummary, PredictionRecord, Side } from '../types'

function path(next: Side, share = 0.3, count = 5, label = 'EXPECTED'): NonNullable<PathSummary> {
  return {
    path: [next, next, next, next],
    type: 'CONTINUE',
    nextSide: next,
    weight: share * 10,
    count,
    share,
    label,
  }
}

function record(result: 'WIN' | 'LOSE', pick: Side = 'P'): PredictionRecord {
  return {
    pick,
    confidence: 50,
    reason: 't',
    pattern: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    expectedPath: 'PPPP',
    alternativePath: 'BBBB',
    hiddenPath: null,
    matchCount: 1,
    nextSideAgreement: 0.5,
    actualResult: result === 'WIN' ? pick : pick === 'P' ? 'B' : 'P',
    result,
    judgedAt: '2026-01-01T00:00:01.000Z',
  }
}

describe('calibration adaptive pick', () => {
  it('keeps Expected when form is not poor', () => {
    const records = Array.from({ length: 10 }, () => record('WIN'))
    const decision = chooseAdaptivePick({
      expected: path('P', 0.5, 10, 'EXPECTED'),
      alternative: path('B', 0.3, 6, 'ALTERNATIVE'),
      hidden: null,
      fallbackPick: 'P',
      records,
    })
    expect(decision.adapted).toBe(false)
    expect(decision.pick).toBe('P')
    expect(decision.source).toBe('EXPECTED')
  })

  it('switches to Alternative when losing streak + poor rate and ALT differs', () => {
    const records = [
      ...Array.from({ length: 5 }, () => record('WIN')),
      ...Array.from({ length: 7 }, () => record('LOSE')),
    ]
    const snap = summarizeCalibration(records)
    expect(snap.sampleCount).toBeGreaterThanOrEqual(CALIBRATION_MIN_SAMPLES)
    expect(snap.lossStreak).toBeGreaterThanOrEqual(CALIBRATION_LOSS_STREAK)
    expect(snap.poorForm).toBe(true)

    const decision = chooseAdaptivePick({
      expected: path('P', 0.4, 8, 'EXPECTED'),
      alternative: path('B', 0.28, 5, 'ALTERNATIVE'),
      hidden: null,
      fallbackPick: 'P',
      records,
    })
    expect(decision.adapted).toBe(true)
    expect(decision.pick).toBe('B')
    expect(decision.source).toBe('ALTERNATIVE')
  })

  it('does not blindly reverse when no supported alternate path exists', () => {
    const records = Array.from({ length: 10 }, () => record('LOSE'))
    const decision = chooseAdaptivePick({
      expected: path('P', 0.7, 12, 'EXPECTED'),
      alternative: path('P', 0.2, 3, 'ALTERNATIVE'), // same side as Expected
      hidden: null,
      fallbackPick: 'P',
      records,
    })
    expect(decision.adapted).toBe(false)
    expect(decision.pick).toBe('P')
    expect(decision.note).toContain('대안 경로 부족')
  })

  it('prefers Hidden when Alternative is unavailable but Hidden differs', () => {
    const records = Array.from({ length: 12 }, () => record('LOSE'))
    const decision = chooseAdaptivePick({
      expected: path('B', 0.45, 9, 'EXPECTED'),
      alternative: null,
      hidden: path('P', 0.2, 4, 'HIDDEN'),
      fallbackPick: 'B',
      records,
    })
    expect(decision.adapted).toBe(true)
    expect(decision.pick).toBe('P')
    expect(decision.source).toBe('HIDDEN')
  })
})
