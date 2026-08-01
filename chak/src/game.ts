import { randomHand, shapeBounds, type Piece, type Shape } from './pieces'

export const SIZE = 8

export type Cell = string | null // color hex or empty

export interface StageDef {
  id: number
  title: string
  goal: number
  /** 0..1 piece difficulty */
  hard: number
  /** prefilled density 0..0.35 */
  clutter: number
}

export function makeStages(): StageDef[] {
  const stages: StageDef[] = []
  for (let i = 1; i <= 40; i++) {
    stages.push({
      id: i,
      title: `스테이지 ${i}`,
      goal: 400 + i * 180 + Math.floor(i * i * 8),
      hard: Math.min(0.85, (i - 1) * 0.03),
      clutter: Math.min(0.28, Math.max(0, (i - 4) * 0.015)),
    })
  }
  return stages
}

export const STAGES = makeStages()

export interface GameState {
  board: Cell[]
  hand: (Piece | null)[]
  score: number
  combo: number
  bestCombo: number
  clears: number
  stage: StageDef
  mode: 'stage' | 'endless'
  over: boolean
  cleared: boolean
  lastClear: number
  toast: string | null
}

export function idx(r: number, c: number): number {
  return r * SIZE + c
}

export function emptyBoard(): Cell[] {
  return Array.from({ length: SIZE * SIZE }, () => null)
}

function seedClutter(board: Cell[], density: number, colors: string[]) {
  if (density <= 0) return
  const cells = SIZE * SIZE
  const n = Math.floor(cells * density)
  const picks = new Set<number>()
  while (picks.size < n) picks.add(Math.floor(Math.random() * cells))
  for (const i of picks) {
    // leave some structure — avoid almost-full rows
    const r = Math.floor(i / SIZE)
    const c = i % SIZE
    if (c === SIZE - 1 && Math.random() < 0.5) continue
    if (r === SIZE - 1 && Math.random() < 0.4) continue
    board[i] = colors[Math.floor(Math.random() * colors.length)]!
  }
}

export function createGame(stage: StageDef, mode: 'stage' | 'endless' = 'stage'): GameState {
  const board = emptyBoard()
  seedClutter(board, stage.clutter, ['#2ec4b6', '#ff6b4a', '#ffd166', '#4d96ff'])
  return {
    board,
    hand: randomHand(stage.hard),
    score: 0,
    combo: 0,
    bestCombo: 0,
    clears: 0,
    stage,
    mode,
    over: false,
    cleared: false,
    lastClear: 0,
    toast: null,
  }
}

export function createEndless(): GameState {
  return createGame(
    { id: 0, title: '엔드리스', goal: Infinity, hard: 0.2, clutter: 0 },
    'endless',
  )
}

export function canPlace(board: Cell[], piece: Piece, r0: number, c0: number): boolean {
  for (const [dr, dc] of piece.cells) {
    const r = r0 + dr
    const c = c0 + dc
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return false
    if (board[idx(r, c)] != null) return false
  }
  return true
}

export function place(board: Cell[], piece: Piece, r0: number, c0: number): Cell[] {
  const next = [...board]
  for (const [dr, dc] of piece.cells) {
    next[idx(r0 + dr, c0 + dc)] = piece.color
  }
  return next
}

export interface ClearResult {
  board: Cell[]
  rows: number[]
  cols: number[]
}

export function clearLines(board: Cell[]): ClearResult {
  const rows: number[] = []
  const cols: number[] = []
  for (let r = 0; r < SIZE; r++) {
    let full = true
    for (let c = 0; c < SIZE; c++) {
      if (board[idx(r, c)] == null) {
        full = false
        break
      }
    }
    if (full) rows.push(r)
  }
  for (let c = 0; c < SIZE; c++) {
    let full = true
    for (let r = 0; r < SIZE; r++) {
      if (board[idx(r, c)] == null) {
        full = false
        break
      }
    }
    if (full) cols.push(c)
  }
  if (rows.length === 0 && cols.length === 0) return { board, rows, cols }
  const next = [...board]
  for (const r of rows) {
    for (let c = 0; c < SIZE; c++) next[idx(r, c)] = null
  }
  for (const c of cols) {
    for (let r = 0; r < SIZE; r++) next[idx(r, c)] = null
  }
  return { board: next, rows, cols }
}

export function scoreClear(lines: number, combo: number, cellsPlaced: number): number {
  if (lines <= 0) return cellsPlaced * 2
  const base = lines * 80 + lines * (lines - 1) * 40
  const comboBonus = combo > 1 ? Math.floor(base * (combo - 1) * 0.35) : 0
  return base + comboBonus + cellsPlaced * 2
}

export function anyFit(board: Cell[], hand: (Piece | null)[]): boolean {
  for (const p of hand) {
    if (!p) continue
    const { w, h } = shapeBounds(p.cells)
    for (let r = 0; r <= SIZE - h; r++) {
      for (let c = 0; c <= SIZE - w; c++) {
        if (canPlace(board, p, r, c)) return true
      }
    }
  }
  return false
}

export function ghostCells(piece: Piece, r0: number, c0: number): Shape {
  return piece.cells.map(([dr, dc]) => [r0 + dr, c0 + dc] as const)
}

export function handEmpty(hand: (Piece | null)[]): boolean {
  return hand.every((p) => p == null)
}

export function refillHand(hard: number): (Piece | null)[] {
  return randomHand(hard)
}

export function hardForScore(score: number): number {
  return Math.min(0.9, 0.15 + score / 12000)
}
