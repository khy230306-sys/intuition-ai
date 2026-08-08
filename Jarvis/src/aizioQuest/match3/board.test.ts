import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  findAllMoves,
  findMatches,
  generateBoard,
  resolveBoard,
  swapCells,
  trySwap,
} from './board'
import { hashSeed } from './rng'

describe('aizioQuest match3', () => {
  it('generates 8x8 board without immediate soft-lock', () => {
    const b = generateBoard(hashSeed('quest-gen-1'))
    expect(b).toHaveLength(BOARD_SIZE)
    expect(b[0]).toHaveLength(BOARD_SIZE)
    expect(findMatches(b).length).toBe(0)
    expect(findAllMoves(b).length).toBeGreaterThan(0)
  })

  it('accepts valid swaps and rejects invalid', () => {
    // Construct a known board with a horizontal match available via swap
    const b = generateBoard(42)
    const moves = findAllMoves(b)
    expect(moves.length).toBeGreaterThan(0)
    const m = moves[0]!
    const ok = trySwap(b, m.a, m.b, 99)
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.cleared.length).toBeGreaterThanOrEqual(3)
      expect(ok.combos).toBeGreaterThanOrEqual(1)
    }
    // Non-adjacent
    const bad = trySwap(b, { r: 0, c: 0 }, { r: 2, c: 2 }, 1)
    expect(bad.ok).toBe(false)
  })

  it('detects line matches after forced swap setup', () => {
    const b = generateBoard(7)
    // Force three fire in a row
    b[0]![0]!.kind = 'fire'
    b[0]![1]!.kind = 'fire'
    b[0]![2]!.kind = 'water'
    b[1]![2]!.kind = 'fire'
    const swapped = swapCells(b, { r: 0, c: 2 }, { r: 1, c: 2 })
    const groups = findMatches(swapped)
    expect(groups.some((g) => g.cells.length >= 3)).toBe(true)
    const resolved = resolveBoard(swapped, 3)
    expect(resolved.totalCleared.length).toBeGreaterThanOrEqual(3)
  })

  it('classifies 4-match, 5-match, L and T shapes', () => {
    const b = generateBoard(99)
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++) b[r]![c]!.kind = (r + c) % 2 === 0 ? 'water' : 'nature'

    // line4
    b[2]![0]!.kind = 'fire'
    b[2]![1]!.kind = 'fire'
    b[2]![2]!.kind = 'fire'
    b[2]![3]!.kind = 'fire'
    expect(findMatches(b).some((g) => g.shape === 'line4')).toBe(true)

    // line5
    b[3]![0]!.kind = 'dark'
    b[3]![1]!.kind = 'dark'
    b[3]![2]!.kind = 'dark'
    b[3]![3]!.kind = 'dark'
    b[3]![4]!.kind = 'dark'
    expect(findMatches(b).some((g) => g.shape === 'line5')).toBe(true)

    // L
    b[5]![5]!.kind = 'light'
    b[5]![6]!.kind = 'light'
    b[5]![7]!.kind = 'light'
    b[6]![5]!.kind = 'light'
    b[7]![5]!.kind = 'light'
    expect(findMatches(b).some((g) => g.shape === 'L' || g.shape === 'T')).toBe(true)

    // T
    b[0]![4]!.kind = 'guard'
    b[0]![5]!.kind = 'guard'
    b[0]![6]!.kind = 'guard'
    b[1]![5]!.kind = 'guard'
    b[2]![5]!.kind = 'guard'
    expect(findMatches(b).some((g) => g.shape === 'T' || g.shape === 'L')).toBe(true)
  })
})
