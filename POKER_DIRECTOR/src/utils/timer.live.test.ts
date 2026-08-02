import { describe, expect, it } from 'vitest'
import { buildLiveTimerView, startTimerState } from '@/utils/timer'
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

describe('live timer view refresh', () => {
  it('decreases remaining as wall clock advances while running', () => {
    const base: TimerState = {
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
    const now = 10_000_000
    const running = startTimerState(base, levels, now)
    const t0 = buildLiveTimerView(running, levels, now)
    const t1 = buildLiveTimerView(running, levels, now + 5_000)
    expect(t0.status).toBe('running')
    expect(t0.remainingMs).toBe(12 * 60 * 1000)
    expect(t1.remainingMs).toBe(12 * 60 * 1000 - 5_000)
  })
})
