import type { HistoricalMatch, RoadShape, Side, SimilarityBreakdown } from '../types'
import {
  CONTEXT_LENGTHS,
  MAX_MATCHES,
  MAX_SCAN_POSITIONS,
  MIN_SIMILARITY,
  SIMILARITY_WEIGHTS,
} from './constants'
import {
  exactSequenceSimilarity,
  extractRoadShape,
  mirrorSimilarity,
  recentSegmentSimilarity,
  roadShapeSimilarity,
  runLengthSimilarity,
} from './roadShape'
import { invertSequence } from './roadUtils'

export type SimilaritySearchOptions = {
  contextLengths?: readonly number[]
  horizon?: number
  /** Exclusive end of searchable history (default: full length). For walk-forward. */
  asOfIndex?: number
  minSimilarity?: number
  maxMatches?: number
}

function contextLengthScore(len: number, maxLen: number): number {
  if (maxLen <= 0) return 0
  return len / maxLen
}

function recencyScore(endIndex: number, asOfIndex: number): number {
  if (asOfIndex <= 1) return 0
  const age = asOfIndex - endIndex
  // Newer historical situations score higher, but never use future.
  return Math.max(0, 1 - age / asOfIndex)
}

function combineScore(b: SimilarityBreakdown): number {
  const w = SIMILARITY_WEIGHTS
  return (
    b.exact * w.exact +
    b.runLength * w.runLength +
    b.roadShape * w.roadShape +
    b.recentSegment * w.recentSegment +
    b.mirror * w.mirror +
    b.contextLength * w.contextLength +
    b.recency * w.recency
  )
}

function scorePair(
  current: readonly Side[],
  currentShape: RoadShape,
  candidate: readonly Side[],
  endIndex: number,
  asOfIndex: number,
  maxContext: number,
): { similarity: number; breakdown: SimilarityBreakdown; mirrored: boolean } {
  const candShape = extractRoadShape(candidate)
  const exact = exactSequenceSimilarity(current, candidate)
  const mirrorExact = mirrorSimilarity(current, candidate)
  const mirrored = mirrorExact > exact + 0.05
  const compareSeq = mirrored ? invertSequence(candidate) : candidate
  const compareShape = mirrored ? extractRoadShape(compareSeq) : candShape

  const breakdown: SimilarityBreakdown = {
    exact: Math.max(exact, mirrorExact * 0.92),
    runLength: runLengthSimilarity(currentShape.runLengths, compareShape.runLengths),
    roadShape: roadShapeSimilarity(currentShape, compareShape),
    recentSegment: recentSegmentSimilarity(current, compareSeq),
    mirror: mirrorExact,
    contextLength: contextLengthScore(candidate.length, maxContext),
    recency: recencyScore(endIndex, asOfIndex),
  }
  return { similarity: combineScore(breakdown), breakdown, mirrored }
}

/**
 * Search historical BP road for situations similar to the current suffix.
 * Look-ahead leakage is forbidden: only positions with endIndex < asOfIndex
 * and continuations drawn from [endIndex, endIndex+horizon) are used.
 */
export function searchHistoricalSimilarities(
  bpHistory: readonly Side[],
  options: SimilaritySearchOptions = {},
): HistoricalMatch[] {
  const asOfIndex = options.asOfIndex ?? bpHistory.length
  const horizon = options.horizon ?? 4
  const minSim = options.minSimilarity ?? MIN_SIMILARITY
  const maxMatches = options.maxMatches ?? MAX_MATCHES
  const lengths = options.contextLengths ?? CONTEXT_LENGTHS

  if (asOfIndex <= 0) return []

  const currentFull = bpHistory.slice(0, asOfIndex)
  if (currentFull.length === 0) return []

  const maxContext = Math.max(...lengths)
  const matches: HistoricalMatch[] = []

  for (const L of lengths) {
    if (currentFull.length < Math.min(4, L)) continue
    const ctxLen = Math.min(L, currentFull.length)
    const current = currentFull.slice(-ctxLen)
    const currentShape = extractRoadShape(current)

    // endIndex is exclusive end of historical context.
    // Continuation must come only from data before asOfIndex (no look-ahead leakage).
    const startEnd = ctxLen
    const stopEnd = asOfIndex - 1
    const span = stopEnd - startEnd + 1
    const scanStart =
      span > MAX_SCAN_POSITIONS ? stopEnd - MAX_SCAN_POSITIONS + 1 : startEnd

    for (let endIndex = Math.max(startEnd, scanStart); endIndex <= stopEnd; endIndex += 1) {
      const candidate = bpHistory.slice(endIndex - ctxLen, endIndex)
      const available = Math.min(horizon, asOfIndex - endIndex)
      if (available < 1) continue

      const scored = scorePair(current, currentShape, candidate, endIndex, asOfIndex, maxContext)
      if (scored.similarity < minSim) continue

      const continuation = bpHistory.slice(endIndex, endIndex + available)
      matches.push({
        endIndex,
        contextLength: ctxLen,
        similarity: scored.similarity,
        breakdown: scored.breakdown,
        mirrored: scored.mirrored,
        continuation: scored.mirrored ? invertSequence(continuation) : continuation,
      })
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity || b.contextLength - a.contextLength)

  // Deduplicate near-identical positions (same endIndex keep best)
  const bestByEnd = new Map<number, HistoricalMatch>()
  for (const m of matches) {
    const prev = bestByEnd.get(m.endIndex)
    if (!prev || m.similarity > prev.similarity) bestByEnd.set(m.endIndex, m)
  }

  return [...bestByEnd.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxMatches)
}
