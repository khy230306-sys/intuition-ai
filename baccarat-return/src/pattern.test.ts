import { describe, expect, it } from 'vitest'
import {
  countableLength,
  judgeGuess,
  parsePattern,
  revealedPattern,
  skipTies,
  summarizeMarks,
  toBigRoad,
} from './pattern'

describe('parsePattern', () => {
  it('parses BPT letters', () => {
    expect(parsePattern('BBTP')).toEqual(['B', 'B', 'T', 'P'])
  })

  it('parses korean tokens', () => {
    expect(parsePattern('뱅커 타이 플레이어')).toEqual(['B', 'T', 'P'])
  })
})

describe('ties and judging', () => {
  it('skips ties without counting', () => {
    expect(skipTies(['T', 'T', 'B', 'P'], 0)).toEqual({ index: 2, ties: 2 })
  })

  it('judges B/P only', () => {
    const pattern = ['T', 'B', 'P'] as const
    const r = judgeGuess([...pattern], 0, 'B')
    expect(r.ok).toBe(true)
    expect(r.nextIndex).toBe(2)
  })

  it('fails on wrong guess', () => {
    const r = judgeGuess(['B', 'P'], 0, 'P')
    expect(r.ok).toBe(false)
    expect(r.nextIndex).toBe(0)
  })
})

describe('big road', () => {
  it('builds columns on color change', () => {
    const road = toBigRoad(['B', 'B', 'P', 'P', 'P'])
    expect(road).toHaveLength(2)
    expect(road[0]!.map((c) => c.outcome)).toEqual(['B', 'B'])
    expect(road[1]!.map((c) => c.outcome)).toEqual(['P', 'P', 'P'])
  })

  it('attaches ties to previous bead', () => {
    const road = toBigRoad(['B', 'T', 'T', 'P'])
    expect(road[0]![0]!.tiesAfter).toBe(2)
    expect(road[1]![0]!.outcome).toBe('P')
  })
})

describe('reveal helpers', () => {
  it('reveals including ties before cutoff', () => {
    expect(revealedPattern(['B', 'T', 'P', 'B'], 2)).toEqual(['B', 'T', 'P'])
  })

  it('counts non-ties', () => {
    expect(countableLength(['B', 'T', 'P', 'T'])).toBe(2)
  })

  it('summarizes marks', () => {
    expect(summarizeMarks(['O', 'O', 'X'])).toEqual({ hits: 2, misses: 1, rate: 2 / 3 })
  })
})
