import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  applyGravity,
  clearMatches,
  createCell,
  emptyBoard,
  ensurePlayable,
  findAllMoves,
  findMatches,
  generateBoard,
  shuffleBoard,
  trySwap,
} from './board'
import type { Board, GemKind } from '../types'

function kindsOf(b: Board): GemKind[][] {
  return b.map((row) => row.map((c) => c.kind))
}

describe('cascade board continuity', () => {
  it('after a 3-clear, untouched columns keep the same gem ids', () => {
    const kinds: GemKind[] = ['fire', 'water', 'nature', 'light', 'dark', 'guard']
    const b = emptyBoard()
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++) b[r]![c] = createCell(kinds[(r + c) % kinds.length]!)
    b[7]![0] = createCell('fire')
    b[7]![1] = createCell('fire')
    b[7]![2] = createCell('fire')
    const beforeCol7 = b.map((row) => row[7]!.id)
    const groups = findMatches(b)
    const cleared = clearMatches(b, groups)
    const fallen = applyGravity(cleared.board, 3)
    for (let r = 0; r < BOARD_SIZE; r++) {
      expect(fallen[r]![7]!.id).toBe(beforeCol7[r])
    }
  })

  it('ensurePlayable does not reshuffle a post-swap board that still has moves', () => {
    let samples = 0
    let changed = 0
    for (let seed = 1; seed <= 120; seed++) {
      const b = generateBoard(seed)
      const moves = findAllMoves(b)
      if (!moves.length) continue
      const m = moves[0]!
      const res = trySwap(b, m.a, m.b, seed + 3)
      if (!res.ok) continue
      samples++
      const ensured = ensurePlayable(res.board, seed + 9)
      const same = JSON.stringify(kindsOf(res.board)) === JSON.stringify(kindsOf(ensured))
      if (!same) changed++
    }
    expect(samples).toBeGreaterThan(40)
    expect(changed).toBe(0)
  })

  it('shuffleBoard preserves gem kind multiset when it succeeds', () => {
    const b = generateBoard(55)
    const before = b.flat().map((c) => c.kind).sort().join(',')
    const sh = shuffleBoard(b, 12)
    const after = sh.flat().map((c) => c.kind).sort().join(',')
    expect(after).toBe(before)
    expect(findMatches(sh).length).toBe(0)
    expect(findAllMoves(sh).length).toBeGreaterThan(0)
  })
})
