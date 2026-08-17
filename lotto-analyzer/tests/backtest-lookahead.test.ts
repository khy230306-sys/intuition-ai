import { describe, expect, it, vi } from 'vitest'
import * as provider from '../src/lotto/data/provider'
import {
  assertNoLookahead,
  LookaheadError,
  runBacktest,
} from '../src/lotto/backtest/backtest'
import { GOLDEN_DRAWS, GOLDEN_DATASET_VERSION } from './golden/dataset'

describe('backtest lookahead safety', () => {
  it('assertNoLookahead rejects future draws', () => {
    expect(() => assertNoLookahead(GOLDEN_DRAWS, 3)).toThrow(LookaheadError)
    expect(() => assertNoLookahead(GOLDEN_DRAWS.slice(0, 2), 3)).not.toThrow()
  })

  it('runBacktest only passes pre-draw history via drawsBefore', async () => {
    const spy = vi.spyOn(provider, 'drawsBefore')
    spy.mockImplementation((all, asOf) => {
      const result = all.filter((d) => asOf == null || d.drawNumber < asOf)
      if (asOf != null) {
        for (const d of result) {
          if (d.drawNumber >= asOf) {
            throw new Error(`lookahead spy: draw ${d.drawNumber} >= ${asOf}`)
          }
        }
      }
      return result
    })

    const report = await runBacktest({
      allDraws: GOLDEN_DRAWS,
      strategyMode: 'RANDOM',
      fromDraw: 4,
      toDraw: 6,
      gamesPerDraw: 2,
      seed: 42,
      datasetVersion: GOLDEN_DATASET_VERSION,
    })

    expect(report.drawCount).toBe(3)
    expect(spy.mock.calls.length).toBeGreaterThan(0)
    for (const [, asOf] of spy.mock.calls) {
      if (asOf != null) {
        expect(asOf).toBeGreaterThanOrEqual(4)
        expect(asOf).toBeLessThanOrEqual(6)
      }
    }

    vi.restoreAllMocks()
  })

  it('would fail if drawsBefore returned future data', () => {
    const contaminated = [...GOLDEN_DRAWS]
    expect(() => assertNoLookahead(contaminated, 5)).toThrow(LookaheadError)
  })
})
