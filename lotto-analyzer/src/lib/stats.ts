import type {
  Dataset,
  Draw,
  DrawRow,
  NumberStat,
  PairStat,
  PatternSummary,
} from './types'

export const MAX_N = 45
export const PICK = 6
export const RECENT_WINDOW = 52 // ~1 year of weekly draws

export function parseDraws(data: Dataset): Draw[] {
  return data.draws.map((row: DrawRow) => ({
    round: row[0],
    date: row[1],
    numbers: [row[2], row[3], row[4], row[5], row[6], row[7]].sort(
      (a, b) => a - b,
    ),
    bonus: row[8],
  }))
}

export function ballColor(n: number): string {
  if (n <= 10) return 'yellow'
  if (n <= 20) return 'blue'
  if (n <= 30) return 'red'
  if (n <= 40) return 'gray'
  return 'green'
}

export function mean(xs: number[]): number {
  if (!xs.length) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)
  return Math.sqrt(v)
}

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

export function oddCount(nums: number[]): number {
  return nums.filter((n) => n % 2 === 1).length
}

export function highCount(nums: number[]): number {
  return nums.filter((n) => n >= 23).length
}

export function sumOf(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0)
}

/** Consecutive pair count (e.g. 12,13 counts as 1). */
export function consecutivePairs(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  let c = 0
  for (let i = 1; i < s.length; i++) if (s[i] === s[i - 1] + 1) c++
  return c
}

/**
 * Arithmetic Complexity (AC): unique positive pairwise differences, minus 5.
 * Higher AC ≈ more "spread out" combinations.
 */
export function arithmeticComplexity(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const diffs = new Set<number>()
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) diffs.add(s[j] - s[i])
  }
  return Math.max(0, diffs.size - (PICK - 1))
}

export function sectionCounts(nums: number[]): number[] {
  const secs = [0, 0, 0, 0, 0]
  for (const n of nums) {
    if (n <= 9) secs[0]++
    else if (n <= 19) secs[1]++
    else if (n <= 29) secs[2]++
    else if (n <= 39) secs[3]++
    else secs[4]++
  }
  return secs
}

/**
 * Exponentially weighted frequency: recent draws contribute more.
 * half-life ≈ 80 draws (~1.5 years).
 */
function weightedHit(drawIndexFromEnd: number, halfLife = 80): number {
  return Math.pow(0.5, drawIndexFromEnd / halfLife)
}

export function computeNumberStats(draws: Draw[]): NumberStat[] {
  const latest = draws[draws.length - 1]?.round ?? 0
  const appearances: number[][] = Array.from({ length: MAX_N + 1 }, () => [])
  const weighted = new Array(MAX_N + 1).fill(0)
  const recent = new Array(MAX_N + 1).fill(0)
  const from = Math.max(0, draws.length - RECENT_WINDOW)

  draws.forEach((d, i) => {
    const fromEnd = draws.length - 1 - i
    const w = weightedHit(fromEnd)
    for (const n of d.numbers) {
      appearances[n].push(d.round)
      weighted[n] += w
      if (i >= from) recent[n]++
    }
  })

  const total = draws.length
  const stats: NumberStat[] = []

  for (let n = 1; n <= MAX_N; n++) {
    const apps = appearances[n]
    const count = apps.length
    const gaps: number[] = []
    for (let i = 1; i < apps.length; i++) gaps.push(apps[i] - apps[i - 1])
    const avgGap = gaps.length ? mean(gaps) : total / Math.max(1, count)
    const lastRound = apps.length ? apps[apps.length - 1] : 0
    const gap = lastRound ? latest - lastRound : latest
    const overdue = avgGap > 0 ? gap / avgGap : 0

    stats.push({
      n,
      count,
      rate: count / total,
      lastRound,
      gap,
      avgGap,
      overdue,
      recentCount: recent[n],
      weightedScore: weighted[n],
    })
  }

  return stats
}

export function computePairStats(draws: Draw[], top = 20): PairStat[] {
  const map = new Map<string, PairStat>()
  for (const d of draws) {
    const nums = d.numbers
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const a = nums[i]
        const b = nums[j]
        const key = `${a}-${b}`
        const cur = map.get(key) ?? { a, b, count: 0 }
        cur.count++
        map.set(key, cur)
      }
    }
  }
  return [...map.values()].sort((x, y) => y.count - x.count).slice(0, top)
}

export function computePatterns(draws: Draw[]): PatternSummary {
  const oddEven: Record<string, number> = {}
  const highLow: Record<string, number> = {}
  const consecutive: Record<number, number> = {}
  const acBuckets: Record<string, number> = { '0-3': 0, '4-6': 0, '7-9': 0, '10+': 0 }
  const sections = [0, 0, 0, 0, 0]
  const sums: number[] = []

  for (const d of draws) {
    const o = oddCount(d.numbers)
    const e = PICK - o
    const keyOE = `${o}:${e}`
    oddEven[keyOE] = (oddEven[keyOE] ?? 0) + 1

    const h = highCount(d.numbers)
    const l = PICK - h
    const keyHL = `${l}:${h}`
    highLow[keyHL] = (highLow[keyHL] ?? 0) + 1

    const c = consecutivePairs(d.numbers)
    consecutive[c] = (consecutive[c] ?? 0) + 1

    const ac = arithmeticComplexity(d.numbers)
    if (ac <= 3) acBuckets['0-3']++
    else if (ac <= 6) acBuckets['4-6']++
    else if (ac <= 9) acBuckets['7-9']++
    else acBuckets['10+']++

    const secs = sectionCounts(d.numbers)
    for (let i = 0; i < 5; i++) sections[i] += secs[i]
    sums.push(sumOf(d.numbers))
  }

  const sortedSums = [...sums].sort((a, b) => a - b)
  const buckets = [
    { label: '초저합', min: 21, max: 80 },
    { label: '저합', min: 81, max: 110 },
    { label: '중합', min: 111, max: 150 },
    { label: '고합', min: 151, max: 180 },
    { label: '초고합', min: 181, max: 255 },
  ].map((b) => ({
    ...b,
    count: sums.filter((s) => s >= b.min && s <= b.max).length,
  }))

  // annotate with percentiles for UI
  void percentile(sortedSums, 0.5)

  return {
    oddEven,
    highLow,
    sumBuckets: buckets,
    consecutive,
    acBuckets,
    sections,
  }
}

export function sumStats(draws: Draw[]) {
  const sums = draws.map((d) => sumOf(d.numbers)).sort((a, b) => a - b)
  return {
    mean: mean(sums),
    std: stddev(sums),
    p10: percentile(sums, 0.1),
    p50: percentile(sums, 0.5),
    p90: percentile(sums, 0.9),
    min: sums[0] ?? 0,
    max: sums[sums.length - 1] ?? 0,
  }
}

export function chiSquareUniform(
  stats: NumberStat[],
  drawCount: number,
): { chi2: number; expected: number } {
  // Each draw picks 6 of 45; expected count per number = draws * 6/45
  const exp = (drawCount * PICK) / MAX_N
  let chi2 = 0
  for (const s of stats) {
    chi2 += (s.count - exp) ** 2 / exp
  }
  return { chi2, expected: exp }
}

export function topBottom(stats: NumberStat[], k = 6) {
  const byCount = [...stats].sort((a, b) => b.count - a.count)
  const byRecent = [...stats].sort((a, b) => b.recentCount - a.recentCount)
  const byOverdue = [...stats].sort((a, b) => b.overdue - a.overdue)
  const byWeighted = [...stats].sort((a, b) => b.weightedScore - a.weightedScore)
  return {
    hottest: byCount.slice(0, k),
    coldest: byCount.slice(-k).reverse(),
    recentHot: byRecent.slice(0, k),
    overdue: byOverdue.slice(0, k),
    weighted: byWeighted.slice(0, k),
  }
}

export function formatOddEven(nums: number[]): string {
  const o = oddCount(nums)
  return `${o}홀 ${PICK - o}짝`
}

export function formatHighLow(nums: number[]): string {
  const h = highCount(nums)
  return `${PICK - h}저 ${h}고`
}
