/** Polyomino shapes as [row, col] offsets from origin. */

export type Shape = readonly (readonly [number, number])[]

export const COLORS = ['#2ec4b6', '#ff6b4a', '#ffd166', '#4d96ff', '#7bdff2', '#f4a261'] as const

export interface PieceDef {
  id: string
  shape: Shape
  /** Relative difficulty weight for random pick. */
  weight: number
}

const S = (id: string, shape: Shape, weight = 1): PieceDef => ({ id, shape, weight })

export const PIECES: PieceDef[] = [
  // singles / small
  S('dot', [[0, 0]], 1.2),
  S('dom-h', [[0, 0], [0, 1]], 1.1),
  S('dom-v', [[0, 0], [1, 0]], 1.1),
  // tris
  S('tri-h', [[0, 0], [0, 1], [0, 2]], 1),
  S('tri-v', [[0, 0], [1, 0], [2, 0]], 1),
  S('tri-L', [[0, 0], [1, 0], [1, 1]], 1),
  S('tri-J', [[0, 1], [1, 0], [1, 1]], 1),
  // tetris-ish
  S('sq', [[0, 0], [0, 1], [1, 0], [1, 1]], 1.15),
  S('line4h', [[0, 0], [0, 1], [0, 2], [0, 3]], 0.85),
  S('line4v', [[0, 0], [1, 0], [2, 0], [3, 0]], 0.85),
  S('L4', [[0, 0], [1, 0], [2, 0], [2, 1]], 0.9),
  S('J4', [[0, 1], [1, 1], [2, 0], [2, 1]], 0.9),
  S('T4', [[0, 0], [0, 1], [0, 2], [1, 1]], 0.9),
  S('S4', [[0, 1], [0, 2], [1, 0], [1, 1]], 0.8),
  S('Z4', [[0, 0], [0, 1], [1, 1], [1, 2]], 0.8),
  // bigger
  S('line5h', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], 0.55),
  S('line5v', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], 0.55),
  S('plus', [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], 0.5),
  S('bigL', [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], 0.55),
  S('u', [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]], 0.5),
]

export interface Piece {
  def: PieceDef
  color: string
  /** cells occupied relative */
  cells: Shape
}

export function shapeBounds(shape: Shape): { w: number; h: number } {
  let maxR = 0
  let maxC = 0
  for (const [r, c] of shape) {
    maxR = Math.max(maxR, r)
    maxC = Math.max(maxC, c)
  }
  return { w: maxC + 1, h: maxR + 1 }
}

function pickWeighted(list: PieceDef[], hardBias: number): PieceDef {
  // hardBias 0..1 — prefer larger / lower weight pieces when higher
  const scored = list.map((p) => {
    const rarity = 1 / p.weight
    const w = p.weight * (1 - hardBias) + rarity * hardBias * 2
    return { p, w: Math.max(0.15, w) }
  })
  const total = scored.reduce((s, x) => s + x.w, 0)
  let r = Math.random() * total
  for (const x of scored) {
    r -= x.w
    if (r <= 0) return x.p
  }
  return scored[scored.length - 1]!.p
}

export function randomPiece(hardBias = 0): Piece {
  const def = pickWeighted(PIECES, hardBias)
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]!
  return { def, color, cells: def.shape }
}

export function randomHand(hardBias = 0): Piece[] {
  return [randomPiece(hardBias), randomPiece(hardBias), randomPiece(hardBias)]
}
