import type { RoadShape, Side } from '../types'
import { invertSequence } from './roadUtils'

export function toRunLengths(sequence: readonly Side[]): number[] {
  if (sequence.length === 0) return []
  const runs: number[] = []
  let len = 1
  for (let i = 1; i < sequence.length; i += 1) {
    if (sequence[i] === sequence[i - 1]) len += 1
    else {
      runs.push(len)
      len = 1
    }
  }
  runs.push(len)
  return runs
}

export function toRunSides(sequence: readonly Side[]): Side[] {
  if (sequence.length === 0) return []
  const sides: Side[] = [sequence[0]!]
  for (let i = 1; i < sequence.length; i += 1) {
    if (sequence[i] !== sequence[i - 1]) sides.push(sequence[i]!)
  }
  return sides
}

export function extractRoadShape(sequence: readonly Side[]): RoadShape {
  const runLengths = toRunLengths(sequence)
  const runSides = toRunSides(sequence)
  const currentSide = sequence.length === 0 ? null : sequence[sequence.length - 1]!
  const currentRunLength = runLengths.length === 0 ? 0 : runLengths[runLengths.length - 1]!
  return {
    sequence: [...sequence],
    runLengths,
    runSides,
    currentRunLength,
    currentSide,
    transitions: Math.max(0, runLengths.length - 1),
  }
}

/** Normalized L1 similarity for run-length vectors (pad shorter with 0). */
export function runLengthSimilarity(a: readonly number[], b: readonly number[]): number {
  const n = Math.max(a.length, b.length, 1)
  let diff = 0
  let denom = 0
  for (let i = 0; i < n; i += 1) {
    const av = a[a.length - n + i] ?? 0
    const bv = b[b.length - n + i] ?? 0
    diff += Math.abs(av - bv)
    denom += Math.max(av, bv, 1)
  }
  return Math.max(0, 1 - diff / denom)
}

export function exactSequenceSimilarity(a: readonly Side[], b: readonly Side[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0
  const aa = a.slice(-n)
  const bb = b.slice(-n)
  let same = 0
  for (let i = 0; i < n; i += 1) if (aa[i] === bb[i]) same += 1
  return same / n
}

export function recentSegmentSimilarity(
  a: readonly Side[],
  b: readonly Side[],
  segment = 4,
): number {
  const n = Math.min(segment, a.length, b.length)
  if (n === 0) return 0
  return exactSequenceSimilarity(a.slice(-n), b.slice(-n))
}

/**
 * Structural similarity ignoring color: compare run lengths + transition pattern.
 * Also returns best of direct vs mirrored sequence exact score via caller.
 */
export function roadShapeSimilarity(a: RoadShape, b: RoadShape): number {
  const runSim = runLengthSimilarity(a.runLengths, b.runLengths)
  const transDenom = Math.max(a.transitions, b.transitions, 1)
  const transSim = 1 - Math.abs(a.transitions - b.transitions) / transDenom
  const curDenom = Math.max(a.currentRunLength, b.currentRunLength, 1)
  const curSim = 1 - Math.abs(a.currentRunLength - b.currentRunLength) / curDenom
  return runSim * 0.55 + transSim * 0.25 + curSim * 0.2
}

export function mirrorSimilarity(a: readonly Side[], b: readonly Side[]): number {
  return exactSequenceSimilarity(a, invertSequence(b))
}

/** Obvious human continuation: keep current streak one more step. */
export function obviousContinuation(shape: RoadShape, horizon: number): Side[] {
  if (!shape.currentSide) {
    return Array.from({ length: horizon }, () => 'P' as Side)
  }
  const path: Side[] = []
  for (let i = 0; i < horizon; i += 1) path.push(shape.currentSide)
  return path
}
