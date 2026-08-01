export const COLS = 5
export const ROWS = 6
export const CELL_COUNT = COLS * ROWS
export const MAX_LEVEL = 12

export interface Species {
  level: number
  name: string
  color: string
  face: string
  income: number
  sell: number
}

/** Soft creature ladder — merge same level → next. */
export const SPECIES: Species[] = [
  { level: 1, name: '몽이', color: '#9fe8d8', face: '·ᴗ·', income: 1, sell: 2 },
  { level: 2, name: '몽순', color: '#7fd6c2', face: 'ᴗ͈ˬᴗ͈', income: 3, sell: 6 },
  { level: 3, name: '몽실', color: '#6bc4de', face: '◕ᴗ◕', income: 8, sell: 16 },
  { level: 4, name: '몽글', color: '#5aa6e8', face: 'ᵔᴗᵔ', income: 18, sell: 36 },
  { level: 5, name: '몽별', color: '#4f8fd6', face: '★ᴗ★', income: 40, sell: 80 },
  { level: 6, name: '몽달', color: '#3d7bb5', face: '☾ᴗ☽', income: 90, sell: 180 },
  { level: 7, name: '몽해', color: '#ff7a59', face: '≧∇≦', income: 200, sell: 400 },
  { level: 8, name: '몽산', color: '#ffb347', face: '∧ᴗ∧', income: 450, sell: 900 },
  { level: 9, name: '몽왕', color: '#ffd166', face: '♛ᴗ♛', income: 1000, sell: 2000 },
  { level: 10, name: '몽신', color: '#ffe8a3', face: '✧ᴗ✧', income: 2200, sell: 4400 },
  { level: 11, name: '몽천', color: '#fff1c9', face: '✶ᴗ✶', income: 5000, sell: 10000 },
  { level: 12, name: '전설몽', color: '#ffffff', face: '◎ᴗ◎', income: 12000, sell: 24000 },
]

export function speciesAt(level: number): Species {
  const i = Math.max(1, Math.min(MAX_LEVEL, level)) - 1
  return SPECIES[i]!
}

export type Cell = number | null

export interface RunState {
  board: Cell[]
  coins: number
  totalMerges: number
  highest: number
  unlocked: number
  spawnCost: number
  incomeMult: number
  prestige: number
  lastTick: number
  selected: number | null
  toast: string | null
  toastAt: number
}

export function emptyBoard(): Cell[] {
  return Array.from({ length: CELL_COUNT }, () => null)
}

export function createRun(prestige = 0, unlocked = 1): RunState {
  const board = emptyBoard()
  board[22] = 1
  board[23] = 1
  board[27] = 1
  return {
    board,
    coins: 10 + prestige * 25,
    totalMerges: 0,
    highest: 1,
    unlocked: Math.max(1, unlocked),
    spawnCost: Math.max(5, 12 - prestige),
    incomeMult: 1 + prestige * 0.25,
    prestige,
    lastTick: Date.now(),
    selected: null,
    toast: null,
    toastAt: 0,
  }
}

export function firstEmpty(board: Cell[]): number {
  return board.findIndex((c) => c == null)
}

export function boardIncome(board: Cell[], mult: number): number {
  let sum = 0
  for (const c of board) {
    if (c != null) sum += speciesAt(c).income
  }
  return Math.floor(sum * mult)
}

export function occupiedCount(board: Cell[]): number {
  let n = 0
  for (const c of board) if (c != null) n += 1
  return n
}

export function canMerge(a: Cell, b: Cell): boolean {
  return a != null && b != null && a === b && a < MAX_LEVEL
}

export function spawnPrice(state: RunState): number {
  const occ = occupiedCount(state.board)
  return state.spawnCost + Math.floor(occ * 0.5)
}
