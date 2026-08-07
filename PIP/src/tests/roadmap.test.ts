import { beforeEach, describe, expect, it } from 'vitest'
import { buildRoundResult } from '../game/rules'
import {
  buildBeadRoad,
  buildDuelMainRoad,
  buildSequence,
  buildTotalRoad,
  canRevealArchivedHidden,
  computeRoadStatistics,
  createArchivedShoe,
  loadArchivedShoes,
  MAIN_ROAD_MAX_ROWS,
  placeMainRoad,
  pushArchivedShoe,
  saveArchivedShoes,
} from '../game/roadmap'
import { createShoe } from '../game/shoe'
import type { CardDuelResult, RoundResult, TotalBand } from '../game/types'

function duelRound(round: number, duel: CardDuelResult, totalBand: TotalBand = 'LOW'): RoundResult {
  // Pick card values that satisfy requested duel/total loosely for visualization tests.
  if (duel === 'UP') return { ...buildRoundResult(round, 2, 4), totalBand, cardDuel: 'UP' }
  if (duel === 'DOWN') return { ...buildRoundResult(round, 4, 2), totalBand, cardDuel: 'DOWN' }
  return { ...buildRoundResult(round, 3, 3), totalBand, cardDuel: 'SAME', isPair: true }
}

describe('PIP Road Engine', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('builds vertical streak for 상 5연속', () => {
    const history = Array.from({ length: 5 }, (_, i) => duelRound(i + 1, 'UP'))
    const road = buildDuelMainRoad(history)
    expect(road.columns).toHaveLength(1)
    expect(road.columns[0].cells).toHaveLength(5)
    expect(road.columns[0].cells.every((cell) => cell.outcome === 'UP')).toBe(true)
    expect(road.columns[0].cells.map((cell) => cell.streakIndex)).toEqual([1, 2, 3, 4, 5])
  })

  it('moves to next column on 상→하', () => {
    const history = [duelRound(1, 'UP'), duelRound(2, 'DOWN')]
    const road = buildDuelMainRoad(history)
    expect(road.columns).toHaveLength(2)
    expect(road.columns[0].outcome).toBe('UP')
    expect(road.columns[1].outcome).toBe('DOWN')
  })

  it('attaches 무 between 상→무→상 without new column (default)', () => {
    const history = [duelRound(1, 'UP'), duelRound(2, 'SAME'), duelRound(3, 'UP')]
    const road = buildDuelMainRoad(history, { sameIndependent: false })
    expect(road.sequence).toEqual(['UP', 'UP'])
    expect(road.columns).toHaveLength(1)
    expect(road.columns[0].cells).toHaveLength(2)
    expect(road.columns[0].cells[0].sameCount).toBe(1)
  })

  it('supports consecutive 무 attachment counts', () => {
    const history = [
      duelRound(1, 'UP'),
      duelRound(2, 'SAME'),
      duelRound(3, 'SAME'),
      duelRound(4, 'DOWN'),
    ]
    const seq = buildSequence(
      history.map((round) => ({ outcome: round.cardDuel, round: round.round })),
      'duel',
      { sameIndependent: false },
    )
    expect(seq[0].sameCount).toBe(2)
    expect(seq).toHaveLength(2)
  })

  it('creates dragon tail after more than 6 continuous results', () => {
    const history = Array.from({ length: 8 }, (_, i) => duelRound(i + 1, 'UP'))
    const road = buildDuelMainRoad(history)
    const vertical = road.columns[0].cells.filter((cell) => !cell.isDragonTail)
    expect(vertical).toHaveLength(MAIN_ROAD_MAX_ROWS)
    expect(road.columns.length).toBeGreaterThan(1)
    expect(road.columns.slice(1).every((col) => col.cells[0]?.isDragonTail)).toBe(true)
  })

  it('handles multiple direction changes', () => {
    const pattern: CardDuelResult[] = ['UP', 'UP', 'DOWN', 'DOWN', 'UP', 'DOWN', 'DOWN', 'DOWN']
    const history = pattern.map((duel, i) => duelRound(i + 1, duel))
    const road = buildDuelMainRoad(history)
    expect(road.columns.map((col) => col.outcome)).toEqual(['UP', 'DOWN', 'UP', 'DOWN'])
    expect(road.columns[0].cells).toHaveLength(2)
    expect(road.columns[3].cells).toHaveLength(3)
  })

  it('keeps bead road in chronological order for 22 rounds', () => {
    const history = Array.from({ length: 22 }, (_, i) =>
      duelRound(i + 1, i % 2 === 0 ? 'UP' : 'DOWN', i % 3 === 0 ? 'CENTER' : 'HIGH'),
    )
    const bead = buildBeadRoad(history)
    expect(bead.beads).toHaveLength(22)
    expect(bead.beads.map((item) => item.round)).toEqual(
      Array.from({ length: 22 }, (_, i) => i + 1),
    )
    expect(bead.columns).toHaveLength(4) // 6+6+6+4
    expect(bead.columns[0]).toHaveLength(6)
  })

  it('builds TOTAL road from LOW/CENTER/HIGH', () => {
    const history = [
      duelRound(1, 'UP', 'LOW'),
      duelRound(2, 'UP', 'LOW'),
      duelRound(3, 'DOWN', 'CENTER'),
      duelRound(4, 'DOWN', 'HIGH'),
    ]
    const road = buildTotalRoad(history)
    expect(road.sequence).toEqual(['LOW', 'LOW', 'CENTER', 'HIGH'])
    expect(road.columns.map((col) => col.outcome)).toEqual(['LOW', 'CENTER', 'HIGH'])
    expect(road.columns[0].cells).toHaveLength(2)
  })

  it('computes card distribution, TOTAL histogram and PAIR stats from revealed rounds only', () => {
    const history = [
      buildRoundResult(1, 1, 1),
      buildRoundResult(2, 2, 4),
      buildRoundResult(3, 5, 5),
      buildRoundResult(4, 3, 3),
    ]
    const stats = computeRoadStatistics(history)
    expect(stats.pipCounts[1]).toBe(2)
    expect(stats.pipCounts[5]).toBe(2)
    expect(stats.pairTotal).toBe(3)
    expect(stats.pairByValue[1]).toBe(1)
    expect(stats.pairByValue[5]).toBe(1)
    expect(stats.pairByValue[3]).toBe(1)
    expect(stats.totalHistogram[2]).toBe(1) // 1+1
    expect(stats.totalHistogram[6]).toBe(2) // 2+4 and 3+3
    expect(stats.progress.completed).toBe(4)
    expect(stats.progress.total).toBe(22)
  })

  it('resets road model for empty new shoe history', () => {
    const road = buildDuelMainRoad([])
    expect(road.columns).toHaveLength(0)
    expect(road.sequence).toHaveLength(0)
    const stats = computeRoadStatistics([])
    expect(stats.cardDuel.UP).toBe(0)
    expect(stats.currentStreak.length).toBe(0)
  })

  it('archives completed shoes with hidden only after completion', () => {
    const shoe = createShoe(3)
    shoe.history = [duelRound(1, 'UP'), duelRound(2, 'DOWN')]
    const openArchive = createArchivedShoe(shoe, 't0', 't1', false)
    expect(openArchive.hidden).toBeNull()
    expect(canRevealArchivedHidden(openArchive)).toBe(false)

    const closed = createArchivedShoe(shoe, 't0', 't1', true)
    expect(closed.hidden).toHaveLength(6)
    expect(canRevealArchivedHidden(closed)).toBe(true)
    expect(closed.cardDuelResults).toEqual(['UP', 'DOWN'])

    const stored = pushArchivedShoe(closed)
    expect(stored).toHaveLength(1)
    expect(loadArchivedShoes()[0].shoeNumber).toBe(3)
  })

  it('keeps at most 20 archived shoes', () => {
    const shoe = createShoe(1)
    shoe.history = [duelRound(1, 'UP')]
    let list = loadArchivedShoes()
    for (let i = 0; i < 25; i += 1) {
      const archive = createArchivedShoe(
        { ...shoe, shoeNumber: i + 1 },
        `s${i}`,
        `e${i}`,
        true,
      )
      list = pushArchivedShoe(archive, list)
    }
    expect(list).toHaveLength(20)
    saveArchivedShoes(list)
    expect(loadArchivedShoes()).toHaveLength(20)
  })

  it('placeMainRoad packs dragon tails then expands for render columns', () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({
      outcome: 'DOWN' as const,
      rounds: [i + 1],
      sameCount: 0,
    }))
    const packed = placeMainRoad(entries)
    expect(packed.columns[0].cells).toHaveLength(6)
    expect(packed.columns[1].cells[0].isDragonTail).toBe(true)
  })
})
