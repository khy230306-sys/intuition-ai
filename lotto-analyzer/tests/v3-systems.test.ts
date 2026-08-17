import { describe, expect, it, beforeEach } from 'vitest'
import {
  parseNaturalLanguageConstraints,
  mergeParsedConstraints,
} from '../src/lotto/generator/nlConstraints'
import {
  resetStoreForTests,
  saveTicket,
  listTickets,
  saveConstraints,
  getConstraints,
  exportStore,
  importStore,
} from '../src/lotto/persistence/store'
import { analyzeUserBias } from '../src/lotto/performance/userBias'
import { GOLDEN_DRAWS } from './golden/dataset'
import { buildNetworkGraph } from '../src/lotto/engines/network/graph'
import { buildDrawReport } from '../src/lotto/reports/report'
import { buildCouncil } from '../src/lotto/council/council'
import { trendEngine } from '../src/lotto/engines/trend/trendEngine'
import { delayEngine } from '../src/lotto/engines/delay/delayEngine'
import { GOLDEN_DATASET_VERSION } from './golden/dataset'

describe('nlConstraints', () => {
  it('parses fixed, games, and mode hints', () => {
    const p = parseNaturalLanguageConstraints(
      '최근 많이 나온 번호는 줄이고 21번은 고정하고 10게임 만들어줘',
    )
    expect(p.errors).toEqual([])
    expect(p.fixed).toContain(21)
    expect(p.gameCount).toBe(10)
    expect(p.reduceHot).toBe(true)
  })

  it('rejects fixed/excluded conflict', () => {
    const p = parseNaturalLanguageConstraints('7번은 고정하고 7번은 제외해줘')
    expect(p.errors.length).toBeGreaterThan(0)
  })

  it('merges into existing constraints', () => {
    const merged = mergeParsedConstraints(
      { fixed: [1], excluded: [], watch: [2] },
      parseNaturalLanguageConstraints('14번은 고정하고'),
    )
    expect(merged.fixed).toContain(14)
  })
})

describe('persistence', () => {
  beforeEach(() => {
    resetStoreForTests()
  })

  it('saves and restores tickets', () => {
    saveTicket({
      id: 't1',
      drawNumber: 1,
      purchaseDate: '2020-01-01',
      games: [{ label: 'A', numbers: [1, 2, 3, 4, 5, 6] }],
      purchaseAmount: 1000,
      winnings: 0,
      createdAt: '2020-01-01T00:00:00.000Z',
      source: 'manual',
    })
    expect(listTickets()).toHaveLength(1)
    const dumped = exportStore()
    resetStoreForTests()
    importStore(dumped)
    expect(listTickets()[0]?.id).toBe('t1')
  })

  it('persists constraints', () => {
    saveConstraints({ fixed: [7], excluded: [8], watch: [9] })
    expect(getConstraints()).toEqual({ fixed: [7], excluded: [8], watch: [9] })
  })
})

describe('userBias', () => {
  it('reports insufficient sample', () => {
    const r = analyzeUserBias([], GOLDEN_DRAWS)
    expect(r.insufficient).toBe(true)
  })
})

describe('network graph', () => {
  it('builds edges without lookahead', () => {
    const g = buildNetworkGraph(GOLDEN_DRAWS, 5)
    expect(g.nodes).toHaveLength(45)
    expect(g.neighborsOf(1, 5).length).toBeLessThanOrEqual(5)
  })
})

describe('reports + council', () => {
  it('builds text report from engine results', async () => {
    const ctx = {
      draws: GOLDEN_DRAWS,
      asOfDrawNumber: 8,
      datasetVersion: GOLDEN_DATASET_VERSION,
      seed: 1,
    }
    const results = [await trendEngine.analyze(ctx), await delayEngine.analyze(ctx)]
    const council = buildCouncil(results)
    const report = buildDrawReport({
      drawNumber: 7,
      analyzedAt: '2020-01-01T00:00:00.000Z',
      rankings: Array.from({ length: 5 }, (_, i) => ({
        number: i + 1,
        rank: i + 1,
        score: 90 - i,
        grade: 'A' as const,
        temperature: 'WARM' as const,
        engineConsensus: 'for' as const,
        votes: {},
        breakdown: { trend: 80 },
        lastAppearance: 1,
        reasonSummary: ['test'],
      })),
      council,
    })
    expect(report.title).toContain('7')
    expect(report.textSummary).toContain('과거 데이터')
  })
})
