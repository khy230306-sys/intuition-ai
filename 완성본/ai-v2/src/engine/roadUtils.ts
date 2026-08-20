import type { FuturePath, Outcome, Side } from '../types'
import { HORIZON_MAX, HORIZON_MIN } from './constants'

/** Keep chronological B/P road; TIE does not break run structure. */
export function toBpRoad(history: readonly Outcome[]): Side[] {
  const out: Side[] = []
  for (const x of history) {
    if (x === 'B' || x === 'P') out.push(x)
  }
  return out
}

export function invertSide(side: Side): Side {
  return side === 'B' ? 'P' : 'B'
}

export function invertSequence(seq: readonly Side[]): Side[] {
  return seq.map(invertSide)
}

export function pathToString(path: readonly Side[]): string {
  return path.join('')
}

export function generateFuturePaths(horizon: number): FuturePath[] {
  const h = Math.max(HORIZON_MIN, Math.min(HORIZON_MAX, Math.floor(horizon)))
  const paths: FuturePath[] = []
  const total = 1 << h
  for (let mask = 0; mask < total; mask += 1) {
    const path: Side[] = []
    for (let bit = h - 1; bit >= 0; bit -= 1) {
      path.push((mask >> bit) & 1 ? 'P' : 'B')
    }
    paths.push(path)
  }
  return paths
}

export function futurePathCounts(maxHorizon = HORIZON_MAX): Record<number, number> {
  const out: Record<number, number> = {}
  for (let h = HORIZON_MIN; h <= maxHorizon; h += 1) {
    out[h] = 1 << h
  }
  return out
}
