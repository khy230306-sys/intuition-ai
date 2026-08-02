import { describe, expect, it } from 'vitest'
import {
  advanceLevelIfExpired,
  getRemainingMs,
  goToLevel,
  pauseTimerState,
  resumeTimerState,
  startTimerState,
  stopTimerState,
} from '@/utils/timer'
import type { BlindLevel, TimerState } from '@/types'

const levels: BlindLevel[] = [
  {
    id: '1',
    levelNumber: 1,
    durationMinutes: 15,
    smallBlind: 100,
    bigBlind: 200,
    bigBlindAnte: 0,
    ante: 0,
    isBreak: false,
    isRegistrationClose: false,
    isRebuyEnd: false,
    isAddonAvailable: false,
    isChipRace: false,
  },
  {
    id: '2',
    levelNumber: 2,
    durationMinutes: 10,
    breakMinutes: 10,
    smallBlind: 0,
    bigBlind: 0,
    bigBlindAnte: 0,
    ante: 0,
    isBreak: true,
    isRegistrationClose: false,
    isRebuyEnd: false,
    isAddonAvailable: false,
    isChipRace: false,
  },
  {
    id: '3',
    levelNumber: 3,
    durationMinutes: 15,
    smallBlind: 200,
    bigBlind: 400,
    bigBlindAnte: 400,
    ante: 0,
    isBreak: false,
    isRegistrationClose: false,
    isRebuyEnd: false,
    isAddonAvailable: false,
    isChipRace: false,
  },
]

function baseTimer(partial: Partial<TimerState> = {}): TimerState {
  return {
    id: 't1',
    tournamentId: 'tour1',
    status: 'idle',
    currentLevelIndex: 0,
    levelStartedAt: null,
    levelEndsAt: null,
    pausedRemainingMs: 15 * 60 * 1000,
    muted: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...partial,
  }
}

describe('timer engine', () => {
  it('starts and tracks absolute end time', () => {
    const now = 1_000_000
    const started = startTimerState(baseTimer(), levels, now)
    expect(started.status).toBe('running')
    expect(getRemainingMs(started, now)).toBe(15 * 60 * 1000)
    expect(getRemainingMs(started, now + 60_000)).toBe(14 * 60 * 1000)
  })

  it('pauses and resumes without drift', () => {
    const now = 1_000_000
    const started = startTimerState(baseTimer(), levels, now)
    const paused = pauseTimerState(started, now + 120_000)
    expect(paused.status).toBe('paused')
    expect(paused.pausedRemainingMs).toBe(13 * 60 * 1000)
    const resumed = resumeTimerState(paused, now + 500_000)
    expect(getRemainingMs(resumed, now + 500_000)).toBe(13 * 60 * 1000)
    expect(getRemainingMs(resumed, now + 560_000)).toBe(12 * 60 * 1000)
  })

  it('advances level when expired', () => {
    const now = 1_000_000
    const started = startTimerState(baseTimer(), levels, now)
    const { timer, advanced } = advanceLevelIfExpired(started, levels, now + 15 * 60 * 1000 + 1)
    expect(advanced).toBe(true)
    expect(timer.currentLevelIndex).toBe(1)
    expect(timer.status).toBe('running')
  })

  it('supports next/prev and stop', () => {
    const now = 1_000_000
    const started = startTimerState(baseTimer(), levels, now)
    const next = goToLevel(started, levels, 2, true, now)
    expect(next.currentLevelIndex).toBe(2)
    expect(next.status).toBe('running')
    const stopped = stopTimerState(next, levels, now)
    expect(stopped.status).toBe('stopped')
    expect(stopped.pausedRemainingMs).toBe(15 * 60 * 1000)
  })
})
