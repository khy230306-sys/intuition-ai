import type { CombinationDNA, LottoDraw } from '../domain/types'
import { PICK } from '../domain/types'
import {
  consecutivePairs,
  gaps,
  lowCount,
  mean,
  oddCount,
  PRIMES,
  sectionCounts,
} from '../math/stats'

function oddEvenLabel(nums: number[]): string {
  const o = oddCount(nums)
  return `${o}:${PICK - o}`
}

function lowHighLabel(nums: number[]): string {
  const l = lowCount(nums)
  return `${l}:${PICK - l}`
}

function endingPairCount(nums: number[]): number {
  const ends = nums.map((n) => n % 10)
  let pairs = 0
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      if (ends[i] === ends[j]) pairs++
    }
  }
  return pairs
}

function structuralDistance(
  sections: number[],
  oddEven: string,
  sum: number,
  histSections: number[][],
  histOddEven: Map<string, number>,
  histSums: number[],
): number {
  if (!histSections.length) return 0.5

  let minSecDist = Infinity
  for (const h of histSections) {
    let d = 0
    for (let i = 0; i < sections.length; i++) {
      d += Math.abs(sections[i]! - (h[i] ?? 0))
    }
    minSecDist = Math.min(minSecDist, d)
  }

  const oeFreq = histOddEven.get(oddEven) ?? 0
  const oeScore = 1 - oeFreq / Math.max(1, histSections.length)

  const sortedSums = [...histSums].sort((a, b) => a - b)
  let sumRank = 0
  for (const s of sortedSums) if (s < sum) sumRank++
  const sumScore = Math.abs(sumRank / Math.max(1, sortedSums.length) - 0.5) * 2

  const secNorm = minSecDist / (PICK * 2)
  return clamp01((secNorm + oeScore + sumScore) / 3)
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function buildHistoricalProfiles(draws: LottoDraw[]): {
  sections: number[][]
  oddEven: Map<string, number>
  sums: number[]
} {
  const sections: number[][] = []
  const oddEven = new Map<string, number>()
  const sums: number[] = []
  for (const d of draws) {
    sections.push(sectionCounts(d.numbers))
    const oe = oddEvenLabel(d.numbers)
    oddEven.set(oe, (oddEven.get(oe) ?? 0) + 1)
    sums.push(d.numbers.reduce((a, b) => a + b, 0))
  }
  return { sections, oddEven, sums }
}

export function buildCombinationDNA(
  numbers: number[],
  historicalDraws: LottoDraw[],
): CombinationDNA {
  const sorted = [...numbers].sort((a, b) => a - b)
  const gs = gaps(sorted)
  const sections = sectionCounts(sorted)
  const oddEven = oddEvenLabel(sorted)
  const lowHigh = lowHighLabel(sorted)
  const sum = sorted.reduce((a, b) => a + b, 0)
  const range = sorted.at(-1)! - sorted[0]!
  const consPairs = consecutivePairs(sorted)
  const endPairs = endingPairCount(sorted)
  const primeCount = sorted.filter((n) => PRIMES.has(n)).length

  const prev = historicalDraws.at(-1)
  const repeatCount = prev
    ? sorted.filter((n) => prev.numbers.includes(n)).length
    : 0

  const avgGap = gs.length ? mean(gs) : 0
  const maxGap = gs.length ? Math.max(...gs) : 0

  const hist = buildHistoricalProfiles(historicalDraws)
  const dist = structuralDistance(sections, oddEven, sum, hist.sections, hist.oddEven, hist.sums)
  const structuralPercentile = (1 - dist) * 100

  const dnaString = [
    oddEven,
    lowHigh,
    sections.join('-'),
    `S${sum}`,
    `R${range}`,
    `C${consPairs}`,
    `E${endPairs}`,
    `P${primeCount}`,
  ].join('|')

  const readable = [
    `홀짝 ${oddEven}`,
    `저고 ${lowHigh}`,
    `구간 ${sections.join('/')}`,
    `합계 ${sum}`,
    `범위 ${range}`,
    `연속쌍 ${consPairs}`,
    `끝수쌍 ${endPairs}`,
    `소수 ${primeCount}`,
    `이월 ${repeatCount}`,
    `평균간격 ${avgGap.toFixed(1)}`,
  ]

  return {
    oddEven,
    lowHigh,
    sectionDistribution: sections,
    sum,
    range,
    consecutivePairs: consPairs,
    endingPairs: endPairs,
    primeCount,
    repeatCount,
    averageGap: avgGap,
    maxGap,
    structuralPercentile,
    dnaString,
    readable,
  }
}
