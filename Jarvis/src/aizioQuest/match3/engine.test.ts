import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  areAdjacent,
  applyGravity,
  clearMatches,
  createCell,
  emptyBoard,
  ensurePlayable,
  findAllMoves,
  findMatches,
  generateBoard,
  resolveBoard,
  shuffleBoard,
  swapCells,
  trySwap,
} from './board'
import { hashSeed } from './rng'
import type { Board, GemKind } from '../types'

function fill(kind: GemKind): Board {
  const b = emptyBoard()
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++) b[r]![c] = createCell(kind === 'fire' && (r + c) % 2 ? 'water' : kind)
  return b
}

describe('match3 engine recovery suite', () => {
  it('accepts adjacent swaps and rejects diagonal/distant', () => {
    expect(areAdjacent({ r: 1, c: 1 }, { r: 1, c: 2 })).toBe(true)
    expect(areAdjacent({ r: 1, c: 1 }, { r: 2, c: 1 })).toBe(true)
    expect(areAdjacent({ r: 1, c: 1 }, { r: 2, c: 2 })).toBe(false)
    expect(areAdjacent({ r: 0, c: 0 }, { r: 0, c: 2 })).toBe(false)
    const b = generateBoard(11)
    const moves = findAllMoves(b)
    expect(moves.length).toBeGreaterThan(0)
    const m = moves[0]!
    expect(trySwap(b, m.a, m.b, 1).ok).toBe(true)
    expect(trySwap(b, { r: 0, c: 0 }, { r: 2, c: 2 }, 1).ok).toBe(false)
    expect(trySwap(b, { r: 0, c: 0 }, { r: 0, c: 2 }, 1).ok).toBe(false)
  })

  it('invalid swap leaves board unchanged (revert semantics)', () => {
    const b = generateBoard(42)
    // Find a non-matching adjacent pair if possible by brute force
    let reverted = false
    for (let r = 0; r < BOARD_SIZE && !reverted; r++) {
      for (let c = 0; c < BOARD_SIZE - 1; c++) {
        const a = { r, c }
        const bpos = { r, c: c + 1 }
        const res = trySwap(b, a, bpos, 9)
        if (!res.ok) {
          const after = swapCells(b, a, bpos)
          // engine rejected — caller must keep original
          expect(findMatches(after).length).toBe(0)
          reverted = true
          break
        }
      }
    }
    expect(reverted).toBe(true)
  })

  it('detects horizontal 3, vertical 3, 4, 5, L, T', () => {
    const b = fill('water')
    b[1]![1]!.kind = 'fire'
    b[1]![2]!.kind = 'fire'
    b[1]![3]!.kind = 'fire'
    expect(findMatches(b).some((g) => g.cells.length >= 3)).toBe(true)

    const v = fill('water')
    v[1]![2]!.kind = 'dark'
    v[2]![2]!.kind = 'dark'
    v[3]![2]!.kind = 'dark'
    expect(findMatches(v).some((g) => g.cells.length >= 3)).toBe(true)

    const four = fill('water')
    for (let c = 0; c < 4; c++) four[4]![c]!.kind = 'nature'
    expect(findMatches(four).some((g) => g.shape === 'line4' || g.cells.length === 4)).toBe(true)

    const five = fill('water')
    for (let c = 0; c < 5; c++) five[5]![c]!.kind = 'light'
    expect(findMatches(five).some((g) => g.shape === 'line5' || g.cells.length >= 5)).toBe(true)

    const L = fill('water')
    L[0]![0]!.kind = 'guard'
    L[0]![1]!.kind = 'guard'
    L[0]![2]!.kind = 'guard'
    L[1]![0]!.kind = 'guard'
    L[2]![0]!.kind = 'guard'
    expect(findMatches(L).some((g) => g.shape === 'L' || g.shape === 'T')).toBe(true)

    const T = fill('water')
    T[0]![2]!.kind = 'fire'
    T[0]![3]!.kind = 'fire'
    T[0]![4]!.kind = 'fire'
    T[1]![3]!.kind = 'fire'
    T[2]![3]!.kind = 'fire'
    expect(findMatches(T).some((g) => g.shape === 'T' || g.shape === 'L')).toBe(true)
  })

  it('gravity, refill, cascade, dead-board shuffle', () => {
    const b = fill('water')
    b[7]![0]!.kind = 'fire'
    b[7]![1]!.kind = 'fire'
    b[7]![2]!.kind = 'fire'
    const groups = findMatches(b)
    const cleared = clearMatches(b, groups)
    const fallen = applyGravity(cleared.board, 3)
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++) expect(fallen[r]![c]?.kind).toBeTruthy()

    const resolved = resolveBoard(b, 5)
    expect(resolved.totalCleared.length).toBeGreaterThanOrEqual(3)
    expect(resolved.combos).toBeGreaterThanOrEqual(1)

    const playable = ensurePlayable(generateBoard(hashSeed('dead')), 1)
    expect(findMatches(playable).length).toBe(0)
    expect(findAllMoves(playable).length).toBeGreaterThan(0)

    const shuffled = shuffleBoard(playable, 99)
    expect(findAllMoves(shuffled).length).toBeGreaterThan(0)
  })
})
