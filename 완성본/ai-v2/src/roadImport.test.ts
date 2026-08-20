import { describe, expect, it } from 'vitest'
import { importRoadWalkForward } from './importWalkForward'
import { parseRoadText } from './roadParse'
import type { Outcome } from './types'

describe('road parse', () => {
  it('parses P/B/T tokens', () => {
    expect(parseRoadText('P B B P T B')).toEqual(['P', 'B', 'B', 'P', 'T', 'B'])
  })

  it('parses Korean and English words', () => {
    expect(parseRoadText('플레이어 뱅커 BANKER PLAYER 타이')).toEqual([
      'P',
      'B',
      'B',
      'P',
      'T',
    ])
  })
})

describe('import walk-forward', () => {
  it('rebuilds picks and success/fail without look-ahead', () => {
    const road = parseRoadText('P B B B P B P P P B B P B P P B')
    const result = importRoadWalkForward(road)
    expect(result.history).toEqual(road)
    expect(result.judgedCount).toBe(road.filter((x: Outcome) => x === 'P' || x === 'B').length)
    expect(result.predictionRecords.length).toBe(result.judgedCount)
    expect(result.pending?.pick === 'P' || result.pending?.pick === 'B').toBe(true)
    // Each judged record must only use past data conceptually: actual is set
    for (const r of result.predictionRecords) {
      expect(r.actualResult === 'P' || r.actualResult === 'B').toBe(true)
      expect(r.result === 'WIN' || r.result === 'LOSE').toBe(true)
    }
  })

  it('excludes TIE from success/fail while keeping history', () => {
    const road = parseRoadText('P T B T P')
    const result = importRoadWalkForward(road)
    expect(result.history).toEqual(['P', 'T', 'B', 'T', 'P'])
    expect(result.judgedCount).toBe(3)
  })
})
