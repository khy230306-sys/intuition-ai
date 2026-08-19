import { describe, expect, it } from 'vitest'
import { analyzeSession } from './engines'
import { DEFAULT_APP_SETTINGS } from './types'
import type { RoundResult } from './types'

function makeRound(i: number, actual: 'PLAYER' | 'BANKER'): RoundResult {
  return {
    id: `r-${i}`,
    shoeId: 1,
    tableId: 'LOCAL',
    roundId: i,
    roundIndex: i - 1,
    tableChangedAt: Date.now(),
    timestamp: Date.now() + i,
    actual,
    dataSource: 'local',
  }
}

describe('analyzeSession gating', () => {
  it('when min sample is not reached, multiPick should be WAIT', () => {
    const settings = {
      ...DEFAULT_APP_SETTINGS,
      allowWait: true,
      multiEnsemble: { ...DEFAULT_APP_SETTINGS.multiEnsemble, minSampleDefault: 50 },
    }

    const rounds: RoundResult[] = []
    for (let i = 1; i <= 20; i++) {
      rounds.push(makeRound(i, i % 2 === 0 ? 'PLAYER' : 'BANKER'))
    }

    const res = analyzeSession({
      rounds,
      balanceSnapshots: [],
      settings,
      shoeId: 1,
      tableId: 'LOCAL',
      randomSeed: 123,
    })

    expect(res.multiPick.entryState).toBe('WAIT')
    expect(res.multiPick.predictedSide).toBeNull()
    expect(res.multiPick.minSampleReached).toBe(false)
  })
})

