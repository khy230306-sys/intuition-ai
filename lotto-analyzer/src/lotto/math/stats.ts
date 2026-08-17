export function mean(xs: number[]): number {
  if (!xs.length) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}

export function percentileRank(sortedAsc: number[], value: number): number {
  if (!sortedAsc.length) return 0
  let below = 0
  for (const v of sortedAsc) if (v < value) below++
  return below / sortedAsc.length
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

export function normalizeMap(scores: Record<number, number>): Record<number, number> {
  const vals = Object.values(scores)
  if (!vals.length) return scores
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const out: Record<number, number> = {}
  for (const [k, v] of Object.entries(scores)) {
    out[Number(k)] = ((v - min) / span) * 100
  }
  return out
}

export function jaccard(a: number[], b: number[]): number {
  const A = new Set(a)
  const B = new Set(b)
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  const union = A.size + B.size - inter
  return union ? inter / union : 0
}

export const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43])

export function oddCount(nums: number[]): number {
  return nums.filter((n) => n % 2 === 1).length
}

export function lowCount(nums: number[]): number {
  return nums.filter((n) => n <= 22).length
}

export function sectionCounts(nums: number[]): number[] {
  const s = [0, 0, 0, 0, 0]
  for (const n of nums) {
    if (n <= 10) s[0]!++
    else if (n <= 20) s[1]!++
    else if (n <= 30) s[2]!++
    else if (n <= 40) s[3]!++
    else s[4]!++
  }
  return s
}

export function consecutivePairs(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  let c = 0
  for (let i = 1; i < s.length; i++) if (s[i] === s[i - 1]! + 1) c++
  return c
}

export function gaps(nums: number[]): number[] {
  const s = [...nums].sort((a, b) => a - b)
  const g: number[] = []
  for (let i = 1; i < s.length; i++) g.push(s[i]! - s[i - 1]!)
  return g
}

export function endingDigits(nums: number[]): number[] {
  return nums.map((n) => n % 10)
}
