import type { LottoDraw } from '../domain/types'
import { PICK } from '../domain/types'
import {
  consecutivePairs,
  endingDigits,
  gaps,
  lowCount,
  oddCount,
  sectionCounts,
} from '../math/stats'

export interface SimilarDrawResult {
  drawNumber: number
  similarity: number
  date: string
}

function normalizeSections(sections: number[]): number[] {
  const total = sections.reduce((a, b) => a + b, 0) || 1
  return sections.map((s) => s / total)
}

function endingHistogram(nums: number[]): number[] {
  const hist = new Array(10).fill(0)
  for (const d of endingDigits(nums)) hist[d]!++
  return hist.map((h) => h / nums.length)
}

function structureVector(nums: number[]): number[] {
  const sorted = [...nums].sort((a, b) => a - b)
  const odd = oddCount(sorted) / PICK
  const low = lowCount(sorted) / PICK
  const sections = normalizeSections(sectionCounts(sorted))
  const sumNorm = sorted.reduce((a, b) => a + b, 0) / (PICK * 45)
  const gapVals = gaps(sorted)
  const avgGap = gapVals.length
    ? gapVals.reduce((a, b) => a + b, 0) / gapVals.length / 45
    : 0
  const maxGap = gapVals.length ? Math.max(...gapVals) / 45 : 0
  const endings = endingHistogram(sorted)
  const consNorm = consecutivePairs(sorted) / (PICK - 1)

  return [odd, low, sumNorm, avgGap, maxGap, consNorm, ...sections, ...endings]
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!
    normA += a[i]! ** 2
    normB += b[i]! ** 2
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dot / denom : 0
}

export function findSimilarDraws(
  candidate: number[],
  history: LottoDraw[],
  top = 10,
): SimilarDrawResult[] {
  const candidateVec = structureVector(candidate)
  const results: SimilarDrawResult[] = []

  for (const draw of history) {
    const drawVec = structureVector(draw.numbers)
    const similarity = cosineSimilarity(candidateVec, drawVec)
    results.push({
      drawNumber: draw.drawNumber,
      similarity,
      date: draw.drawDate,
    })
  }

  results.sort((a, b) => b.similarity - a.similarity || a.drawNumber - b.drawNumber)
  return results.slice(0, top)
}
