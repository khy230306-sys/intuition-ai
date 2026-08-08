import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  createCell,
  emptyBoard,
  findAllMoves,
  findMatches,
  generateBoard,
  resolveBoard,
  resolveBoardSteps,
  swapCells,
  trySwap,
} from './board'
import { hashSeed } from './rng'
import type { GemKind } from '../types'

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

  it('resolveBoardSteps chains clear → gravity → next match waves', () => {
    // Checkerboard base (no matches), then force a cascading double clear.
    const kinds: GemKind[] = ['fire', 'water', 'nature', 'light', 'dark', 'guard']
    const b = emptyBoard()
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        b[r]![c] = createCell(kinds[(r + c) % kinds.length]!)
      }
    }
    // Wave 1: three fires on bottom row
    b[7]![0] = createCell('fire')
    b[7]![1] = createCell('fire')
    b[7]![2] = createCell('fire')
    // After they clear, three waters stacked above col0–2 fall onto row7 and match
    b[6]![0] = createCell('water')
    b[6]![1] = createCell('water')
    b[6]![2] = createCell('water')
    // Keep row5 non-matching with waters so only one cascade of waters
    b[5]![0] = createCell('nature')
    b[5]![1] = createCell('light')
    b[5]![2] = createCell('dark')

    expect(findMatches(b).length).toBeGreaterThan(0)
    const stepped = resolveBoardSteps(b, 11)
    expect(stepped.steps.length).toBeGreaterThanOrEqual(2)
    expect(stepped.combos).toBeGreaterThanOrEqual(2)
    // Each wave exposes matchedBoard before afterBoard
    for (const step of stepped.steps) {
      expect(step.matchedBoard).toBeTruthy()
      expect(step.afterBoard).toBeTruthy()
      expect(step.groups.length).toBeGreaterThan(0)
      expect(step.cleared.length).toBeGreaterThanOrEqual(3)
      expect(findMatches(step.matchedBoard).length).toBeGreaterThan(0)
    }
    expect(findMatches(stepped.board).length).toBe(0)

    const viaTry = trySwap(
      (() => {
        // Legal swap that creates the fire match
        const start = emptyBoard()
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            start[r]![c] = createCell(kinds[(r + c) % kinds.length]!)
          }
        }
        start[7]![0] = createCell('fire')
        start[7]![1] = createCell('fire')
        start[7]![2] = createCell('water')
        start[6]![2] = createCell('fire')
        start[6]![0] = createCell('water')
        start[6]![1] = createCell('water')
        start[5]![0] = createCell('nature')
        start[5]![1] = createCell('light')
        start[5]![2] = createCell('dark')
        return start
      })(),
      { r: 7, c: 2 },
      { r: 6, c: 2 },
      21,
    )
    expect(viaTry.ok).toBe(true)
    if (viaTry.ok) {
      expect(viaTry.swapped).toBeTruthy()
      expect(viaTry.steps.length).toBeGreaterThanOrEqual(1)
      expect(viaTry.steps[0]!.matchedBoard).toBeTruthy()
    }
  })
})
