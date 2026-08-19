import { describe, expect, it } from 'vitest'
import { simulateMartingale } from './martingale'
import { DEFAULT_APP_SETTINGS, type AppSettings } from './types'
import type { EntryState, Side } from './types'

describe('simulateMartingale', () => {
  it('classic multiEnsembleBet flow: fail → step up → win reset', () => {
    const settings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      martingale: { ...DEFAULT_APP_SETTINGS.martingale, activeStrategyId: 'multiEnsembleBet', startAmount: 1, targetProfit: 999, dailyMaxLoss: 999 },
      allowWait: true,
    }

    const rounds = [
      { roundIndex: 0, actual: 'BANKER' as Side },
      { roundIndex: 1, actual: 'BANKER' as Side },
      { roundIndex: 2, actual: 'PLAYER' as Side },
    ]

    const multiHistory = [
      { roundIndex: 0, entryState: 'ENTRY' as EntryState, predictedSide: 'PLAYER' as Side },
      { roundIndex: 1, entryState: 'WAIT' as EntryState, predictedSide: null },
      { roundIndex: 2, entryState: 'WAIT' as EntryState, predictedSide: null },
    ]

    const st = simulateMartingale({ settings, rounds, multiHistory })
    expect(st.totalFail).toBe(2)
    expect(st.totalSuccess).toBe(1)
    // -1 (step0) -2(step1) +4(step2) = +1
    expect(st.totalProfit).toBe(1)
    expect(st.lockedDirection).toBeNull()
    expect(st.martingaleStepIndex).toBe(0)
  })
})

