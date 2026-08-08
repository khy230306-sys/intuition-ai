/** Match-3 board engine — single source of truth, animation-agnostic. */

import type { Board, GemCell, GemKind, MatchGroup } from '../types'
import { mulberry32, pick } from './rng'

export const BOARD_SIZE = 8
export const GEM_KINDS: GemKind[] = ['fire', 'water', 'nature', 'light', 'dark', 'guard']

let gemSeq = 0
export function nextGemId(): string {
  gemSeq += 1
  return `g${gemSeq.toString(36)}`
}

export function resetGemSeq(n = 0): void {
  gemSeq = n
}

export function createCell(kind: GemKind, special: GemCell['special'] = 'none'): GemCell {
  return { id: nextGemId(), kind, special }
}

export function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((c) => {
      if (!c || !c.kind) return null as unknown as GemCell
      return { ...c }
    }),
  )
}

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => createCell('fire')),
  )
}

function wouldMatchAt(board: Board, r: number, c: number, kind: GemKind): boolean {
  // horizontal
  let left = 0
  for (let x = c - 1; x >= 0 && board[r]![x]!.kind === kind; x--) left++
  let right = 0
  for (let x = c + 1; x < BOARD_SIZE && board[r]![x]?.kind === kind; x++) right++
  if (left + right + 1 >= 3) return true
  // vertical
  let up = 0
  for (let y = r - 1; y >= 0 && board[y]![c]!.kind === kind; y--) up++
  let down = 0
  for (let y = r + 1; y < BOARD_SIZE && board[y]?.[c]?.kind === kind; y++) down++
  return up + down + 1 >= 3
}

export function generateBoard(seed: number, kinds: GemKind[] = GEM_KINDS): Board {
  const rng = mulberry32(seed)
  const board = emptyBoard()
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      let kind = pick(rng, kinds)
      let guard = 0
      while (wouldMatchAt(board, r, c, kind) && guard < 20) {
        kind = pick(rng, kinds)
        guard++
      }
      board[r]![c] = createCell(kind)
    }
  }
  // Ensure at least one legal move
  if (findAllMoves(board).length === 0) {
    return shuffleBoard(board, seed + 97)
  }
  return board
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE
}

export function areAdjacent(a: { r: number; c: number }, b: { r: number; c: number }): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1
}

export function swapCells(board: Board, a: { r: number; c: number }, b: { r: number; c: number }): Board {
  const next = cloneBoard(board)
  const t = next[a.r]![a.c]!
  next[a.r]![a.c] = next[b.r]![b.c]!
  next[b.r]![b.c] = t
  return next
}

/** Find all match groups on the board. */
export function findMatches(board: Board): MatchGroup[] {
  const marked = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false))
  const groups: MatchGroup[] = []

  // Horizontal runs
  for (let r = 0; r < BOARD_SIZE; r++) {
    let c = 0
    while (c < BOARD_SIZE) {
      const kind = board[r]![c]!.kind
      let end = c + 1
      while (end < BOARD_SIZE && board[r]![end]!.kind === kind) end++
      const len = end - c
      if (len >= 3) {
        const cells = []
        for (let x = c; x < end; x++) {
          cells.push({ r, c: x })
          marked[r]![x] = true
        }
        groups.push({
          cells,
          kind,
          shape: len >= 5 ? 'line5' : len === 4 ? 'line4' : 'line3',
        })
      }
      c = end
    }
  }

  // Vertical runs
  for (let c = 0; c < BOARD_SIZE; c++) {
    let r = 0
    while (r < BOARD_SIZE) {
      const kind = board[r]![c]!.kind
      let end = r + 1
      while (end < BOARD_SIZE && board[end]![c]!.kind === kind) end++
      const len = end - r
      if (len >= 3) {
        const cells = []
        for (let y = r; y < end; y++) {
          cells.push({ r: y, c })
          marked[y]![c] = true
        }
        // merge with existing if overlapping
        const existing = groups.find((g) => g.cells.some((p) => p.r === r && p.c === c && g.kind === kind))
        if (existing) {
          for (const cell of cells) {
            if (!existing.cells.some((p) => p.r === cell.r && p.c === cell.c)) existing.cells.push(cell)
          }
          existing.shape = classifyShape(existing.cells)
        } else {
          groups.push({ cells, kind, shape: len >= 5 ? 'line5' : len === 4 ? 'line4' : 'line3' })
        }
      }
      r = end
    }
  }

  // Reclassify L/T from merged cells
  for (const g of groups) {
    g.shape = classifyShape(g.cells)
  }

  return groups
}

function classifyShape(cells: Array<{ r: number; c: number }>): MatchGroup['shape'] {
  if (cells.length >= 5) {
    const rows = new Set(cells.map((p) => p.r))
    const cols = new Set(cells.map((p) => p.c))
    if (rows.size >= 2 && cols.size >= 2) {
      // L or T
      const byR = new Map<number, number>()
      const byC = new Map<number, number>()
      for (const p of cells) {
        byR.set(p.r, (byR.get(p.r) || 0) + 1)
        byC.set(p.c, (byC.get(p.c) || 0) + 1)
      }
      const maxR = Math.max(...byR.values())
      const maxC = Math.max(...byC.values())
      if (maxR >= 3 && maxC >= 3) {
        // T if one cell is in both a long row and long col center-ish
        return 'T'
      }
      return 'L'
    }
    return 'line5'
  }
  if (cells.length === 4) {
    const rows = new Set(cells.map((p) => p.r))
    const cols = new Set(cells.map((p) => p.c))
    if (rows.size > 1 && cols.size > 1) return 'L'
    return 'line4'
  }
  return 'line3'
}

export type ClearResult = {
  board: Board
  cleared: Array<{ r: number; c: number; kind: GemKind; special?: GemCell['special'] }>
  spawnedSpecials: Array<{ r: number; c: number; special: NonNullable<GemCell['special']>; kind: GemKind }>
  groups: MatchGroup[]
}

export function clearMatches(board: Board, groups: MatchGroup[]): ClearResult {
  const next = cloneBoard(board)
  const cleared: ClearResult['cleared'] = []
  const spawnedSpecials: ClearResult['spawnedSpecials'] = []
  const kill = new Set<string>()

  for (const g of groups) {
    for (const p of g.cells) kill.add(`${p.r},${p.c}`)
    // special gem spawn at centroid of group
    let special: GemCell['special'] = 'none'
    if (g.shape === 'line5') special = 'core'
    else if (g.shape === 'L' || g.shape === 'T') special = 'blast'
    else if (g.shape === 'line4') special = 'line'
    if (special !== 'none') {
      const mid = g.cells[Math.floor(g.cells.length / 2)]!
      spawnedSpecials.push({ r: mid.r, c: mid.c, special, kind: g.kind })
    }
  }

  // Expand blast/core/line specials that were cleared
  for (const g of groups) {
    for (const p of g.cells) {
      const cell = board[p.r]![p.c]!
      if (cell.special === 'blast') {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const rr = p.r + dr
            const cc = p.c + dc
            if (inBounds(rr, cc)) kill.add(`${rr},${cc}`)
          }
      }
      if (cell.special === 'line') {
        for (let i = 0; i < BOARD_SIZE; i++) {
          kill.add(`${p.r},${i}`)
          kill.add(`${i},${p.c}`)
        }
      }
      if (cell.special === 'core') {
        for (let r = 0; r < BOARD_SIZE; r++)
          for (let c = 0; c < BOARD_SIZE; c++)
            if (board[r]![c]!.kind === cell.kind) kill.add(`${r},${c}`)
      }
    }
  }

  for (const key of kill) {
    const [rs, cs] = key.split(',')
    const r = Number(rs)
    const c = Number(cs)
    const cell = next[r]![c]!
    cleared.push({ r, c, kind: cell.kind, special: cell.special })
    next[r]![c] = null as unknown as GemCell
  }

  // Place specials on cleared cells that were designated
  for (const sp of spawnedSpecials) {
    const key = `${sp.r},${sp.c}`
    if (kill.has(key)) {
      next[sp.r]![sp.c] = createCell(sp.kind, sp.special)
      // remove from cleared visual? keep cleared count but cell respawns as special
    }
  }

  return { board: next, cleared, spawnedSpecials, groups }
}

export function applyGravity(board: Board, seed: number, kinds: GemKind[] = GEM_KINDS): Board {
  const rng = mulberry32(seed)
  const next = cloneBoard(board)
  for (let c = 0; c < BOARD_SIZE; c++) {
    const stack: GemCell[] = []
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      const cell = next[r]![c]
      if (cell) stack.push(cell)
    }
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      if (stack.length) {
        next[r]![c] = stack.shift()!
      } else {
        next[r]![c] = createCell(pick(rng, kinds))
      }
    }
  }
  return next
}

/** Resolve cascades until stable. */
export function resolveBoard(
  board: Board,
  seed: number,
): {
  board: Board
  totalCleared: ClearResult['cleared']
  combos: number
  groupsAll: MatchGroup[]
} {
  let cur = cloneBoard(board)
  let totalCleared: ClearResult['cleared'] = []
  let combos = 0
  const groupsAll: MatchGroup[] = []
  let s = seed
  for (let guard = 0; guard < 40; guard++) {
    const groups = findMatches(cur)
    if (!groups.length) break
    combos += 1
    groupsAll.push(...groups)
    const cleared = clearMatches(cur, groups)
    totalCleared = totalCleared.concat(cleared.cleared)
    cur = applyGravity(cleared.board, s++)
  }
  return { board: cur, totalCleared, combos, groupsAll }
}

export type Move = { a: { r: number; c: number }; b: { r: number; c: number } }

export function findAllMoves(board: Board): Move[] {
  const moves: Move[] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const neighbors = [
        { r, c: c + 1 },
        { r: r + 1, c },
      ]
      for (const n of neighbors) {
        if (!inBounds(n.r, n.c)) continue
        const swapped = swapCells(board, { r, c }, n)
        if (findMatches(swapped).length) moves.push({ a: { r, c }, b: n })
      }
    }
  }
  return moves
}

export function trySwap(
  board: Board,
  a: { r: number; c: number },
  b: { r: number; c: number },
  seed: number,
): { ok: false } | { ok: true; board: Board; cleared: ClearResult['cleared']; combos: number; groups: MatchGroup[] } {
  if (!areAdjacent(a, b)) return { ok: false }
  const swapped = swapCells(board, a, b)
  const matches = findMatches(swapped)
  if (!matches.length) return { ok: false }
  const resolved = resolveBoard(swapped, seed)
  return {
    ok: true,
    board: resolved.board,
    cleared: resolved.totalCleared,
    combos: resolved.combos,
    groups: resolved.groupsAll,
  }
}

export function shuffleBoard(board: Board, seed: number): Board {
  const rng = mulberry32(seed)
  const cells = board.flat().map((c) => ({ ...c, id: nextGemId() }))
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = cells[i]!
    cells[i] = cells[j]!
    cells[j] = t
  }
  const next = emptyBoard()
  let k = 0
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++) next[r]![c] = cells[k++]!
  // If still no moves or immediate match flood, regenerate
  if (findMatches(next).length || findAllMoves(next).length === 0) {
    return generateBoard(seed + 13)
  }
  return next
}

export function ensurePlayable(board: Board, seed: number): Board {
  let cur = board
  let s = seed
  for (let i = 0; i < 8; i++) {
    if (findMatches(cur).length) {
      cur = resolveBoard(cur, s++).board
      continue
    }
    if (findAllMoves(cur).length) return cur
    cur = shuffleBoard(cur, s++)
  }
  return generateBoard(seed + 999)
}
