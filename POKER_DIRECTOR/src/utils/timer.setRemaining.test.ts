import { describe, expect, it } from 'vitest'
import { getRemainingMs, setRemainingMs, startTimerState } from '@/utils/timer'
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
]

function base(): TimerState {
  return {
    id: 't',
    tournamentId: 'tour',
    status: 'paused',
    currentLevelIndex: 0,
    levelStartedAt: null,
    levelEndsAt: null,
    pausedRemainingMs: 12 * 60 * 1000,
    muted: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }
}

describe('set remaining time', () => {
  it('updates paused remaining by absolute value', () => {
    const next = setRemainingMs(base(), 8 * 60 * 1000 + 30_000)
    expect(next.pausedRemainingMs).toBe(8 * 60 * 1000 + 30_000)
    expect(getRemainingMs(next)).toBe(8 * 60 * 1000 + 30_000)
  })

  it('updates running end time without drift', () => {
    const now = 5_000_000
    const running = startTimerState(base(), levels, now)
    const edited = setRemainingMs(running, 3 * 60 * 1000, now)
    expect(edited.status).toBe('running')
    expect(getRemainingMs(edited, now)).toBe(3 * 60 * 1000)
    expect(getRemainingMs(edited, now + 60_000)).toBe(2 * 60 * 1000)
  })
})
