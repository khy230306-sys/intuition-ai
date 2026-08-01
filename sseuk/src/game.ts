/** Classic sliding puzzle — solvable shuffles only. */

export type Cell = number // 1..n*n-1, 0 = empty

export interface StageDef {
  id: number
  size: number
  /** random legal moves to scramble */
  scramble: number
  /** par moves for 3 stars (approx) */
  par: number
  title: string
  theme: ThemeId
}

export type ThemeId = 'ocean' | 'sunset' | 'forest' | 'candy' | 'night'

export interface Theme {
  id: ThemeId
  label: string
  colors: string[] // n*n palette samples — we'll index by tile
}

export const THEMES: Record<ThemeId, Theme> = {
  ocean: {
    id: 'ocean',
    label: '바다',
    colors: ['#3d9cf0', '#5ad1c0', '#7bdff2', '#2a6f97', '#48cae4', '#90e0ef'],
  },
  sunset: {
    id: 'sunset',
    label: '노을',
    colors: ['#ff8a5b', '#ffd166', '#f4a261', '#e76f51', '#f7b267', '#ffb4a2'],
  },
  forest: {
    id: 'forest',
    label: '숲',
    colors: ['#2a9d8f', '#52b788', '#95d5b2', '#1b4332', '#40916c', '#74c69d'],
  },
  candy: {
    id: 'candy',
    label: '캔디',
    colors: ['#ff6b9d', '#ff85a1', '#ffd6a5', '#b8f2e6', '#ffa69e', '#ffc6ff'],
  },
  night: {
    id: 'night',
    label: '밤하늘',
    colors: ['#1b3a4b', '#3d9cf0', '#4cc9f0', '#243b55', '#4895ef', '#7bdff2'],
  },
}

export function makeStages(): StageDef[] {
  const stages: StageDef[] = []
  const themes: ThemeId[] = ['ocean', 'sunset', 'forest', 'candy', 'night']
  // 1-10: 3x3, 11-25: 4x4, 26-40: 5x5
  for (let i = 1; i <= 40; i++) {
    let size = 3
    let scramble = 12 + i * 2
    let par = 10 + i
    if (i >= 11 && i <= 25) {
      size = 4
      scramble = 40 + (i - 10) * 6
      par = 35 + (i - 10) * 4
    } else if (i >= 26) {
      size = 5
      scramble = 80 + (i - 25) * 10
      par = 70 + (i - 25) * 6
    }
    stages.push({
      id: i,
      size,
      scramble,
      par,
      title: `스테이지 ${i}`,
      theme: themes[(i - 1) % themes.length]!,
    })
  }
  return stages
}

export const STAGES = makeStages()

export interface GameState {
  size: number
  board: Cell[]
  empty: number
  moves: number
  startedAt: number
  elapsedMs: number
  stage: StageDef
  solved: boolean
  history: number[] // empty indices before each move (for undo)
}

export function solvedBoard(size: number): Cell[] {
  const n = size * size
  const b: Cell[] = []
  for (let i = 1; i < n; i++) b.push(i)
  b.push(0)
  return b
}

export function isSolved(board: Cell[]): boolean {
  const n = board.length
  for (let i = 0; i < n - 1; i++) {
    if (board[i] !== i + 1) return false
  }
  return board[n - 1] === 0
}

function neighbors(empty: number, size: number): number[] {
  const r = Math.floor(empty / size)
  const c = empty % size
  const out: number[] = []
  if (r > 0) out.push(empty - size)
  if (r < size - 1) out.push(empty + size)
  if (c > 0) out.push(empty - 1)
  if (c < size - 1) out.push(empty + 1)
  return out
}

/** Scramble by making legal moves from solved — always solvable. */
export function scramble(size: number, moves: number): { board: Cell[]; empty: number } {
  let board = solvedBoard(size)
  let empty = size * size - 1
  let last = -1
  for (let i = 0; i < moves; i++) {
    const opts = neighbors(empty, size).filter((x) => x !== last)
    const pick = opts[Math.floor(Math.random() * opts.length)]!
    board = [...board]
    board[empty] = board[pick]!
    board[pick] = 0
    last = empty
    empty = pick
  }
  // ensure not already solved
  if (isSolved(board)) {
    const opts = neighbors(empty, size)
    const pick = opts[0]!
    board = [...board]
    board[empty] = board[pick]!
    board[pick] = 0
    empty = pick
  }
  return { board, empty }
}

export function createGame(stage: StageDef): GameState {
  const { board, empty } = scramble(stage.size, stage.scramble)
  return {
    size: stage.size,
    board,
    empty,
    moves: 0,
    startedAt: Date.now(),
    elapsedMs: 0,
    stage,
    solved: false,
    history: [],
  }
}

export function canSlide(state: GameState, index: number): boolean {
  if (state.solved) return false
  return neighbors(state.empty, state.size).includes(index)
}

export function slide(state: GameState, index: number): GameState | null {
  if (!canSlide(state, index)) return null
  const board = [...state.board]
  board[state.empty] = board[index]!
  board[index] = 0
  const next: GameState = {
    ...state,
    board,
    empty: index,
    moves: state.moves + 1,
    history: [...state.history, state.empty],
    elapsedMs: Date.now() - state.startedAt,
  }
  next.solved = isSolved(next.board)
  return next
}

export function undo(state: GameState): GameState | null {
  if (state.history.length === 0 || state.solved) return null
  const prevEmpty = state.history[state.history.length - 1]!
  const board = [...state.board]
  // current empty goes back; tile at prevEmpty was the empty before
  const curEmpty = state.empty
  board[curEmpty] = board[prevEmpty]!
  board[prevEmpty] = 0
  return {
    ...state,
    board,
    empty: prevEmpty,
    moves: Math.max(0, state.moves - 1),
    history: state.history.slice(0, -1),
  }
}

export function tileColor(tile: number, size: number, theme: Theme): string {
  if (tile === 0) return 'transparent'
  const colors = theme.colors
  // map tile to a 2D gradient across the board for a "picture" feel
  const i = tile - 1
  const r = Math.floor(i / size)
  const c = i % size
  const t = (r + c) / (size * 2 - 2 || 1)
  const a = colors[Math.floor(t * (colors.length - 1))]!
  const b = colors[Math.min(colors.length - 1, Math.floor(t * (colors.length - 1)) + 1)]!
  return mix(a, b, (t * (colors.length - 1)) % 1)
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a)
  const pb = hex(b)
  const r = Math.round(pa[0]! + (pb[0]! - pa[0]!) * t)
  const g = Math.round(pa[1]! + (pb[1]! - pa[1]!) * t)
  const bl = Math.round(pa[2]! + (pb[2]! - pa[2]!) * t)
  return `rgb(${r},${g},${bl})`
}

function hex(h: string): [number, number, number] {
  const s = h.replace('#', '')
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}

export function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3
  if (moves <= Math.floor(par * 1.35)) return 2
  return 1
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
