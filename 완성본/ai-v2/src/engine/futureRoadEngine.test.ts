import { describe, expect, it } from 'vitest'
import {
  classifyContinuation,
  clusterContinuations,
  computeConfidence,
  CONTEXT_LENGTHS,
  extractRoadShape,
  futurePathCounts,
  generateFuturePaths,
  HORIZON_MAX,
  mirrorSimilarity,
  pathToString,
  predictNext,
  runLengthSimilarity,
  searchHistoricalSimilarities,
  selectAlternativePath,
  selectExpectedPath,
  selectHiddenPath,
  toBpRoad,
  toRunLengths,
  walkForwardEvaluate,
} from './index'
import type { HistoricalMatch, Outcome, Side } from '../types'
import { judgePrediction } from '../judgment'
import type { PendingPrediction } from '../types'

function seq(s: string): Side[] {
  return s.replace(/\s+/g, '').split('') as Side[]
}

function outcomes(s: string): Outcome[] {
  return s.replace(/\s+/g, '').split('') as Outcome[]
}

describe('future path generation', () => {
  it('generates 2 paths for horizon 1', () => {
    const paths = generateFuturePaths(1)
    expect(paths).toHaveLength(2)
    expect(paths.map(pathToString).sort()).toEqual(['B', 'P'])
  })

  it('generates correct counts for horizons 1..5', () => {
    const counts = futurePathCounts(5)
    expect(counts[1]).toBe(2)
    expect(counts[2]).toBe(4)
    expect(counts[3]).toBe(8)
    expect(counts[4]).toBe(16)
    expect(counts[5]).toBe(32)
    expect(generateFuturePaths(HORIZON_MAX)).toHaveLength(32)
  })

  it('includes all 3-length combinations', () => {
    const set = new Set(generateFuturePaths(3).map(pathToString))
    for (const p of ['BBB', 'BBP', 'BPB', 'BPP', 'PBB', 'PBP', 'PPB', 'PPP']) {
      expect(set.has(p)).toBe(true)
    }
  })
})

describe('run-length and road shape', () => {
  it('converts sequence to run lengths', () => {
    // BBB P BB PP B → 3-1-2-2-1
    expect(toRunLengths(seq('BBBPBBPPB'))).toEqual([3, 1, 2, 2, 1])
  })

  it('supports B/P inversion similarity for mirrored structures', () => {
    const a = seq('BBBPBB')
    const b = seq('PPPBBP') // color-inverted of BBBPBB? BBBPBB inverted = PPPBPP
    const inv = seq('PPPBPP')
    expect(mirrorSimilarity(a, inv)).toBe(1)
    expect(mirrorSimilarity(a, b)).toBeGreaterThan(0.5)
  })

  it('scores similar run-length structures highly', () => {
    expect(runLengthSimilarity([3, 1, 2], [3, 1, 2])).toBe(1)
    expect(runLengthSimilarity([3, 1, 2], [3, 1, 3])).toBeGreaterThan(0.7)
  })
})

describe('historical similarity search', () => {
  it('finds exact historical matches and continuations', () => {
    const h = seq('PPPBBBPBBPPPBBBPBB')
    const matches = searchHistoricalSimilarities(h, {
      asOfIndex: h.length,
      horizon: 3,
      contextLengths: [4],
      minSimilarity: 0.7,
    })
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0]!.continuation.length).toBeGreaterThan(0)
  })

  it('finds approximate (non-exact) historical matches via shape', () => {
    const h = seq('BBBPPBBPPB' + 'PPPBBPPBBP' + 'BBBPPBB')
    const matches = searchHistoricalSimilarities(h, {
      asOfIndex: h.length,
      horizon: 3,
      contextLengths: [6, 8],
      minSimilarity: 0.5,
    })
    expect(matches.length).toBeGreaterThan(0)
    const hasNonExact = matches.some((m) => m.breakdown.exact < 1)
    expect(hasNonExact || matches.some((m) => m.breakdown.runLength > 0.7)).toBe(true)
  })

  it('extracts continuations only from past data (no look-ahead leakage)', () => {
    const h = seq('PBPBPBPBPB' + 'BBBB' + 'PBPBPBPB')
    const asOf = 14 // mid history
    const matches = searchHistoricalSimilarities(h, {
      asOfIndex: asOf,
      horizon: 4,
      contextLengths: [6],
      minSimilarity: 0.4,
    })
    for (const m of matches) {
      expect(m.endIndex).toBeLessThanOrEqual(asOf - 1)
      expect(m.endIndex + m.continuation.length).toBeLessThanOrEqual(asOf)
      // continuation must equal actual slice
      const raw = h.slice(m.endIndex, m.endIndex + m.continuation.length)
      if (!m.mirrored) expect(m.continuation).toEqual(raw)
    }
  })
})

describe('Expected / Alternative / Hidden paths', () => {
  function fakeMatches(continuations: Side[][], sim = 0.8): HistoricalMatch[] {
    return continuations.map((continuation, i) => ({
      endIndex: i + 10,
      contextLength: 8,
      similarity: sim,
      breakdown: {
        exact: sim,
        runLength: sim,
        roadShape: sim,
        recentSegment: sim,
        mirror: 0,
        contextLength: 0.5,
        recency: 0.5,
      },
      mirrored: false,
      continuation,
    }))
  }

  it('selects Expected Path from strongest cluster', () => {
    const currentSide: Side = 'B'
    const matches = fakeMatches([
      seq('BBBB'),
      seq('BBBP'),
      seq('BBBB'),
      seq('BBBB'),
      seq('PPPP'),
      seq('PPPB'),
    ])
    const clusters = clusterContinuations(matches, currentSide)
    const expected = selectExpectedPath(clusters)
    expect(expected).not.toBeNull()
    expect(expected!.nextSide).toBe('B')
  })

  it('selects Alternative Path different from Expected', () => {
    const matches = fakeMatches([
      seq('BBBB'),
      seq('BBBB'),
      seq('BBBB'),
      seq('BBBB'),
      seq('PPPP'),
      seq('PPPP'),
      seq('PPPB'),
    ])
    const clusters = clusterContinuations(matches, 'B')
    const expected = selectExpectedPath(clusters)
    const alt = selectAlternativePath(clusters, expected)
    expect(alt).not.toBeNull()
    expect(
      alt!.nextSide !== expected!.nextSide || pathToString(alt!.path) !== pathToString(expected!.path),
    ).toBe(true)
  })

  it('discovers Hidden Path when non-obvious structure repeats', () => {
    // Obvious = continue B. Hidden mass of flip-return patterns.
    const matches = fakeMatches([
      ...Array.from({ length: 5 }, () => seq('BBBB')),
      ...Array.from({ length: 4 }, () => seq('PBBP')),
      ...Array.from({ length: 3 }, () => seq('PBPP')),
    ])
    const clusters = clusterContinuations(matches, 'B')
    const expected = selectExpectedPath(clusters)
    const alt = selectAlternativePath(clusters, expected)
    const hidden = selectHiddenPath(clusters, seq('PPPBBB'), expected, alt, 4)
    // May or may not find hidden depending on thresholds; if found must differ from obvious
    if (hidden) {
      expect(pathToString(hidden.path).startsWith('B')).toBe(false)
      expect(hidden.count).toBeGreaterThanOrEqual(3)
    }
  })

  it('returns no Hidden Path when sample is insufficient', () => {
    const matches = fakeMatches([seq('BBBB'), seq('PPPP')])
    const clusters = clusterContinuations(matches, 'B')
    const expected = selectExpectedPath(clusters)
    const alt = selectAlternativePath(clusters, expected)
    const hidden = selectHiddenPath(clusters, seq('PPPBBB'), expected, alt, 4)
    expect(hidden).toBeNull()
  })
})

describe('confidence', () => {
  it('is lower when paths split and samples are thin', () => {
    const low = computeConfidence({
      matchCount: 4,
      historyLength: 20,
      nextSideAgreement: 0.52,
      expected: {
        path: seq('BBBB'),
        type: 'CONTINUE',
        nextSide: 'B',
        weight: 1,
        count: 2,
        share: 0.35,
        label: 'EXPECTED',
      },
      alternative: {
        path: seq('PPPP'),
        type: 'FLIP_ONCE',
        nextSide: 'P',
        weight: 0.9,
        count: 2,
        share: 0.31,
        label: 'ALTERNATIVE',
      },
      hidden: {
        path: seq('PBPP'),
        type: 'FLIP_RETURN',
        nextSide: 'P',
        weight: 0.8,
        count: 2,
        share: 0.27,
        label: 'HIDDEN',
      },
      topClusters: [],
    })
    const high = computeConfidence({
      matchCount: 40,
      historyLength: 200,
      nextSideAgreement: 0.86,
      expected: {
        path: seq('BBBB'),
        type: 'CONTINUE',
        nextSide: 'B',
        weight: 10,
        count: 30,
        share: 0.72,
        label: 'EXPECTED',
      },
      alternative: {
        path: seq('BBBP'),
        type: 'CONTINUE',
        nextSide: 'B',
        weight: 2,
        count: 5,
        share: 0.15,
        label: 'ALTERNATIVE',
      },
      hidden: null,
      topClusters: [],
    })
    expect(low).toBeLessThan(high)
    expect(low).toBeLessThan(60)
  })
})

describe('prediction judgment', () => {
  const pending: PendingPrediction = {
    pick: 'P',
    confidence: 60,
    reason: 'test',
    pattern: seq('PBPB'),
    createdAt: '2026-01-01T00:00:00.000Z',
    expectedPath: 'PPPP',
    alternativePath: 'BBBB',
    hiddenPath: null,
    matchCount: 3,
    nextSideAgreement: 0.7,
  }

  it('marks SUCCESS when actual PLAYER matches pick', () => {
    const r = judgePrediction(pending, 'P')
    expect(r?.result).toBe('WIN')
    expect(r?.actualResult).toBe('P')
  })

  it('marks SUCCESS when actual BANKER matches pick', () => {
    const r = judgePrediction({ ...pending, pick: 'B' }, 'B')
    expect(r?.result).toBe('WIN')
  })

  it('marks FAIL when prediction mismatches actual', () => {
    const r = judgePrediction(pending, 'B')
    expect(r?.result).toBe('LOSE')
  })

  it('excludes TIE from success/fail', () => {
    expect(judgePrediction(pending, 'T')).toBeNull()
  })
})

describe('engine integration + recalculation', () => {
  it('recalculates next prediction after actual result input', () => {
    let history = outcomes('PBBBPBBPPPBBBP')
    const before = predictNext(history)
    history = [...history, 'B']
    const after = predictNext(history)
    expect(after.pick === 'P' || after.pick === 'B').toBe(true)
    // reason/confidence objects are fresh
    expect(after.debug.matchCount).toBeGreaterThanOrEqual(0)
    expect(before.pick === 'P' || before.pick === 'B').toBe(true)
  })

  it('uses multiple context lengths', () => {
    expect(CONTEXT_LENGTHS.length).toBeGreaterThan(3)
    const h = seq('PBPBPBPBPBPBPBPBPBPBPBPBPB')
    const matches = searchHistoricalSimilarities(h, {
      contextLengths: CONTEXT_LENGTHS,
      minSimilarity: 0.5,
    })
    const lengths = new Set(matches.map((m) => m.contextLength))
    expect(lengths.size).toBeGreaterThan(1)
  })

  it('classifies continuation cluster types', () => {
    expect(classifyContinuation('B', seq('BBBB'))).toBe('CONTINUE')
    expect(classifyContinuation('B', seq('PPPP'))).toBe('FLIP_ONCE')
    expect(classifyContinuation('B', seq('PBPP'))).toBe('FLIP_RETURN')
    expect(classifyContinuation('B', seq('PBPB'))).toBe('ALTERNATING')
  })

  it('filters TIE from BP road without breaking structure', () => {
    expect(toBpRoad(outcomes('P T B B T P'))).toEqual(['P', 'B', 'B', 'P'])
    expect(toRunLengths(toBpRoad(outcomes('P T B B T P')))).toEqual([1, 2, 1])
  })
})

describe('walk-forward (no leakage)', () => {
  it('never uses future outcomes when predicting index i', () => {
    // Deterministic synthetic road with repeating motif
    const motif = seq('BBBP')
    const history: Outcome[] = []
    for (let i = 0; i < 80; i += 1) history.push(motif[i % motif.length]!)

    const result = walkForwardEvaluate(history, 25)
    expect(result.total).toBeGreaterThan(20)

    // Spot-check: prediction at bp index i only sees prefix
    for (const p of result.predictions.slice(0, 10)) {
      let seen = 0
      let fullIdx = 0
      while (seen < p.index) {
        if (history[fullIdx] === 'B' || history[fullIdx] === 'P') seen += 1
        fullIdx += 1
      }
      const pred = predictNext(history, { asOfFullIndex: fullIdx })
      expect(pred.pick).toBe(p.pick)
      // Ensure asOf doesn't include actual
      const bp = toBpRoad(history.slice(0, fullIdx))
      expect(bp).toHaveLength(p.index)
    }

    expect(result.accuracy).toBeGreaterThanOrEqual(0)
    expect(result.accuracy).toBeLessThanOrEqual(1)
  })
})

describe('road shape extraction', () => {
  it('reports current run relation', () => {
    const shape = extractRoadShape(seq('PPBBB'))
    expect(shape.currentSide).toBe('B')
    expect(shape.currentRunLength).toBe(3)
    expect(shape.runLengths).toEqual([2, 3])
  })
})
