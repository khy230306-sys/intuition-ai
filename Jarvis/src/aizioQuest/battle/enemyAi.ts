/** Local enemy AI — scores all legal moves, no board cheating. */

import type { Board, Difficulty, GemKind } from '../types'
import { findAllMoves, findMatches, swapCells, type Move } from '../match3/board'
import { mulberry32 } from '../match3/rng'

function kindWeight(kind: GemKind, mode: 'damage' | 'heal' | 'energy' | 'deny'): number {
  const table: Record<GemKind, Record<'damage' | 'heal' | 'energy' | 'deny', number>> = {
    fire: { damage: 3, heal: 0, energy: 0.5, deny: 1 },
    dark: { damage: 2.6, heal: 0, energy: 0.8, deny: 1.2 },
    light: { damage: 1.2, heal: 0.4, energy: 2.5, deny: 1 },
    water: { damage: 0.8, heal: 0.6, energy: 3, deny: 0.8 },
    nature: { damage: 0.5, heal: 3, energy: 0.8, deny: 0.7 },
    guard: { damage: 0.4, heal: 0.8, energy: 0.5, deny: 1.5 },
  }
  return table[kind]?.[mode] ?? 0.5
}

function scoreBoardAfterMove(board: Board, move: Move): number {
  const swapped = swapCells(board, move.a, move.b)
  const groups = findMatches(swapped)
  if (!groups.length) return -1e9
  let score = 0
  let cells = 0
  for (const g of groups) {
    cells += g.cells.length
    const mul = g.shape === 'line5' ? 3.2 : g.shape === 'L' || g.shape === 'T' ? 2.6 : g.shape === 'line4' ? 1.8 : 1
    score += g.cells.length * kindWeight(g.kind, 'damage') * mul
    score += g.cells.length * kindWeight(g.kind, 'heal') * 0.6
    score += g.cells.length * kindWeight(g.kind, 'energy') * 0.5
    if (g.shape === 'line5' || g.shape === 'L' || g.shape === 'T') score += 8 // special / extra-turn potential
  }
  score += Math.max(0, cells - 3) * 0.4
  return score
}

function depthFor(diff: Difficulty): number {
  switch (diff) {
    case 'NORMAL':
      return 1
    case 'HARD':
      return 1
    case 'ELITE':
      return 2
    case 'BOSS':
      return 2
  }
}

/**
 * Pick best move. Depth>1 does a shallow denial estimate (player best reply penalty).
 */
export function chooseEnemyMove(board: Board, difficulty: Difficulty, seed: number): Move | null {
  const moves = findAllMoves(board)
  if (!moves.length) return null
  const rng = mulberry32(seed)
  const depth = depthFor(difficulty)
  let best = moves[0]!
  let bestScore = -1e12

  for (const m of moves) {
    let s = scoreBoardAfterMove(board, m)
    if (depth >= 2 && s > -1e8) {
      // Approximate denial on the post-swap board (pre-cascade is enough for heuristic).
      const after = swapCells(board, m.a, m.b)
      const playerMoves = findAllMoves(after)
      let playerBest = 0
      for (const pm of playerMoves.slice(0, 12)) {
        const ps = scoreBoardAfterMove(after, pm)
        if (ps > playerBest) playerBest = ps
      }
      s -= playerBest * 0.22
    }
    // Soft randomness so play feels alive
    s += (rng() - 0.5) * (difficulty === 'NORMAL' ? 2.2 : 0.8)
    if (s > bestScore) {
      bestScore = s
      best = m
    }
  }
  return best
}
