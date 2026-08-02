import { MAX_N, PICK, mean, oddCount, sumOf, sumStats } from './stats'
import type { Draw } from './types'

export interface OverlapSummary {
  avg: number
  dist: { k: number; count: number; rate: number }[]
}

export interface SumFlow {
  mean: number
  lastSum: number
  lastDelta: number
  /** P(next sum rises | previous rose) */
  pUpAfterUp: number
  /** P(next sum rises | previous fell) */
  pUpAfterDown: number
  /** Suggested direction for next sum relative to last */
  nextBias: 'up' | 'down' | 'neutral'
  nextBiasStrength: number
  recentSums: { round: number; sum: number; delta: number }[]
}

export interface PositionCorridor {
  index: number
  label: string
  mean: number
  p20: number
  p80: number
}

export interface TransitionHit {
  from: number
  to: number
  count: number
  /** lift vs unconditional next-draw rate */
  lift: number
}

export interface FlowReport {
  overlap: OverlapSummary
  sumFlow: SumFlow
  positions: PositionCorridor[]
  /** From latest draw numbers → historically frequent next numbers */
  nextFromLatest: TransitionHit[]
  /** Strong global transitions (lift > 1.1) */
  topTransitions: TransitionHit[]
  /** Reappearance lag after a hit */
  reappear: { mean: number; median: number; p75: number }
  /** Odd-count chain: after k odds, next odd-count distribution */
  oddChain: { after: number; next: Record<string, number> }[]
  narrative: string[]
}

function percentileSorted(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

function overlapSummary(draws: Draw[]): OverlapSummary {
  const counts = new Array(7).fill(0)
  let total = 0
  let sum = 0
  for (let i = 1; i < draws.length; i++) {
    const a = new Set(draws[i - 1].numbers)
    let o = 0
    for (const n of draws[i].numbers) if (a.has(n)) o++
    counts[o]++
    sum += o
    total++
  }
  const dist = counts
    .map((count, k) => ({ k, count, rate: total ? count / total : 0 }))
    .filter((d) => d.count > 0)
  return { avg: total ? sum / total : 0, dist }
}

function sumFlowOf(draws: Draw[]): SumFlow {
  const sums = draws.map((d) => sumOf(d.numbers))
  const deltas: number[] = []
  for (let i = 1; i < sums.length; i++) deltas.push(sums[i] - sums[i - 1])

  let upUp = 0
  let upN = 0
  let dnUp = 0
  let dnN = 0
  for (let i = 0; i < deltas.length - 1; i++) {
    if (deltas[i] > 0) {
      upN++
      if (deltas[i + 1] > 0) upUp++
    } else if (deltas[i] < 0) {
      dnN++
      if (deltas[i + 1] > 0) dnUp++
    }
  }

  const pUpAfterUp = upN ? upUp / upN : 0.5
  const pUpAfterDown = dnN ? dnUp / dnN : 0.5
  const lastDelta = deltas[deltas.length - 1] ?? 0
  const lastSum = sums[sums.length - 1] ?? 0
  const m = mean(sums)

  // Mean-reversion bias: after a rise, historically more likely to fall next
  let nextBias: SumFlow['nextBias'] = 'neutral'
  let nextBiasStrength = 0
  if (lastDelta > 0) {
    const pDown = 1 - pUpAfterUp
    nextBias = pDown > 0.55 ? 'down' : 'neutral'
    nextBiasStrength = pDown
  } else if (lastDelta < 0) {
    nextBias = pUpAfterDown > 0.55 ? 'up' : 'neutral'
    nextBiasStrength = pUpAfterDown
  }
  // Also pull toward long-run mean
  if (lastSum > m + 15 && nextBias !== 'up') {
    nextBias = 'down'
    nextBiasStrength = Math.max(nextBiasStrength, 0.6)
  } else if (lastSum < m - 15 && nextBias !== 'down') {
    nextBias = 'up'
    nextBiasStrength = Math.max(nextBiasStrength, 0.6)
  }

  const recentSums = draws.slice(-12).map((d, i, arr) => {
    const s = sumOf(d.numbers)
    const prev = i === 0 ? s : sumOf(arr[i - 1].numbers)
    return { round: d.round, sum: s, delta: i === 0 ? 0 : s - prev }
  })

  return {
    mean: m,
    lastSum,
    lastDelta,
    pUpAfterUp,
    pUpAfterDown,
    nextBias,
    nextBiasStrength,
    recentSums,
  }
}

function positionCorridors(draws: Draw[]): PositionCorridor[] {
  const cols: number[][] = Array.from({ length: PICK }, () => [])
  for (const d of draws) {
    const s = [...d.numbers].sort((a, b) => a - b)
    s.forEach((n, i) => cols[i].push(n))
  }
  return cols.map((col, index) => {
    const sorted = [...col].sort((a, b) => a - b)
    return {
      index,
      label: `${index + 1}번째`,
      mean: mean(col),
      p20: percentileSorted(sorted, 0.2),
      p80: percentileSorted(sorted, 0.8),
    }
  })
}

function buildFollowMatrix(draws: Draw[]): {
  follow: number[][]
  appear: number[]
  nextTotal: number[]
} {
  const follow = Array.from({ length: MAX_N + 1 }, () => new Array(MAX_N + 1).fill(0))
  const appear = new Array(MAX_N + 1).fill(0)
  const nextTotal = new Array(MAX_N + 1).fill(0)

  for (let i = 0; i < draws.length - 1; i++) {
    for (const n of draws[i].numbers) appear[n]++
    for (const m of draws[i + 1].numbers) nextTotal[m]++
    for (const n of draws[i].numbers) {
      for (const m of draws[i + 1].numbers) {
        if (n !== m) follow[n][m]++
      }
    }
  }
  return { follow, appear, nextTotal }
}

function transitionsFrom(
  draws: Draw[],
  fromNums: number[],
  top = 12,
): TransitionHit[] {
  const { follow, appear, nextTotal } = buildFollowMatrix(draws)
  const pairs = draws.length - 1
  const baseRate = (n: number) => (pairs ? nextTotal[n] / pairs : 0)
  const scores = new Map<number, { count: number; liftAcc: number; n: number }>()

  for (const from of fromNums) {
    if (appear[from] === 0) continue
    for (let to = 1; to <= MAX_N; to++) {
      if (fromNums.includes(to)) continue
      const count = follow[from][to]
      if (!count) continue
      const cond = count / appear[from]
      const base = baseRate(to) || 1e-9
      const lift = cond / base
      const cur = scores.get(to) ?? { count: 0, liftAcc: 0, n: 0 }
      cur.count += count
      cur.liftAcc += lift
      cur.n += 1
      scores.set(to, cur)
    }
  }

  return [...scores.entries()]
    .map(([to, v]) => ({
      from: fromNums[0] ?? 0,
      to,
      count: v.count,
      lift: v.liftAcc / v.n,
    }))
    .sort((a, b) => b.lift - a.lift || b.count - a.count)
    .slice(0, top)
}

function topGlobalTransitions(draws: Draw[], top = 10): TransitionHit[] {
  const { follow, appear, nextTotal } = buildFollowMatrix(draws)
  const pairs = draws.length - 1
  const hits: TransitionHit[] = []
  for (let from = 1; from <= MAX_N; from++) {
    if (appear[from] < 30) continue
    for (let to = 1; to <= MAX_N; to++) {
      if (from === to) continue
      const count = follow[from][to]
      if (count < 12) continue
      const cond = count / appear[from]
      const base = pairs ? nextTotal[to] / pairs : 0
      if (base <= 0) continue
      const lift = cond / base
      if (lift >= 1.12) hits.push({ from, to, count, lift })
    }
  }
  return hits.sort((a, b) => b.lift - a.lift).slice(0, top)
}

function reappearLags(draws: Draw[]) {
  const last = new Map<number, number>()
  const lags: number[] = []
  draws.forEach((d, i) => {
    for (const n of d.numbers) {
      if (last.has(n)) lags.push(i - (last.get(n) as number))
      last.set(n, i)
    }
  })
  const sorted = [...lags].sort((a, b) => a - b)
  return {
    mean: mean(lags),
    median: percentileSorted(sorted, 0.5),
    p75: percentileSorted(sorted, 0.75),
  }
}

function oddChains(draws: Draw[]) {
  const table = new Map<number, Record<number, number>>()
  for (let i = 0; i < draws.length - 1; i++) {
    const a = oddCount(draws[i].numbers)
    const b = oddCount(draws[i + 1].numbers)
    const row = table.get(a) ?? {}
    row[b] = (row[b] ?? 0) + 1
    table.set(a, row)
  }
  return [...table.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([after, next]) => ({
      after,
      next: Object.fromEntries(
        Object.entries(next).map(([k, v]) => [`${k}홀`, v]),
      ),
    }))
}

export function analyzeFlow(draws: Draw[]): FlowReport {
  const overlap = overlapSummary(draws)
  const sumFlow = sumFlowOf(draws)
  const positions = positionCorridors(draws)
  const latest = draws[draws.length - 1]
  const nextFromLatest = transitionsFrom(draws, latest.numbers, 12)
  const topTransitions = topGlobalTransitions(draws, 10)
  const reappear = reappearLags(draws)
  const oddChain = oddChains(draws)
  const sums = sumStats(draws)

  const narrative: string[] = []
  narrative.push(
    `직전 회차와 번호가 겹치는 평균은 ${overlap.avg.toFixed(2)}개입니다. 0~1개 이월이 전체의 ${(
      ((overlap.dist.find((d) => d.k === 0)?.rate ?? 0) +
        (overlap.dist.find((d) => d.k === 1)?.rate ?? 0)) *
      100
    ).toFixed(0)}%를 차지합니다.`,
  )
  narrative.push(
    `합계는 평균회귀 흐름이 강합니다. 직전이 올랐을 때 다음도 오를 확률 ${(sumFlow.pUpAfterUp * 100).toFixed(0)}%, 직전이 내렸을 때 다음이 오를 확률 ${(sumFlow.pUpAfterDown * 100).toFixed(0)}%.`,
  )
  if (sumFlow.nextBias === 'up') {
    narrative.push(
      `현재 합 ${sumFlow.lastSum}(Δ${sumFlow.lastDelta >= 0 ? '+' : ''}${sumFlow.lastDelta}) → 역사적으로 다음 합이 올라갈 편향 ${(sumFlow.nextBiasStrength * 100).toFixed(0)}% (장기 평균 ${sums.mean.toFixed(0)}).`,
    )
  } else if (sumFlow.nextBias === 'down') {
    narrative.push(
      `현재 합 ${sumFlow.lastSum}(Δ${sumFlow.lastDelta >= 0 ? '+' : ''}${sumFlow.lastDelta}) → 역사적으로 다음 합이 내려갈 편향 ${(sumFlow.nextBiasStrength * 100).toFixed(0)}% (장기 평균 ${sums.mean.toFixed(0)}).`,
    )
  }
  narrative.push(
    `정렬 순서(작은수→큰수) 평균 자리는 ${positions.map((p) => p.mean.toFixed(0)).join(' · ')}입니다. 번호 '순서'는 조합의 위치 골격으로 읽힙니다.`,
  )
  narrative.push(
    `한 번 나온 번호가 다시 나오기까지 중앙값 ${reappear.median.toFixed(0)}회, 평균 ${reappear.mean.toFixed(1)}회입니다.`,
  )
  if (nextFromLatest[0]) {
    const top = nextFromLatest.slice(0, 3).map((t) => t.to).join(', ')
    narrative.push(
      `${latest.round}회 번호 기준, 다음 회에서 역사적으로 따라붙는 후보 상위: ${top}.`,
    )
  }

  return {
    overlap,
    sumFlow,
    positions,
    nextFromLatest,
    topTransitions,
    reappear,
    oddChain,
    narrative,
  }
}

/** Per-number flow score used by the "흐름" strategy. */
export function flowScores(draws: Draw[]): Map<number, number> {
  const report = analyzeFlow(draws)
  const latest = draws[draws.length - 1]
  const scores = new Map<number, number>()
  for (let n = 1; n <= MAX_N; n++) scores.set(n, 0.35)

  // Boost transition targets from latest
  report.nextFromLatest.forEach((t, i) => {
    const boost = 1.8 - i * 0.08
    scores.set(t.to, (scores.get(t.to) ?? 0) + Math.max(0.4, boost) * t.lift)
  })

  // Soft-penalize exact carry from latest (overlap rarely >1-2)
  for (const n of latest.numbers) {
    scores.set(n, (scores.get(n) ?? 0) * 0.55)
  }

  // Sum-bias: prefer numbers that nudge sum in suggested direction
  const mid = 23
  for (let n = 1; n <= MAX_N; n++) {
    if (report.sumFlow.nextBias === 'up' && n >= mid) {
      scores.set(n, (scores.get(n) ?? 0) * 1.15)
    } else if (report.sumFlow.nextBias === 'down' && n < mid) {
      scores.set(n, (scores.get(n) ?? 0) * 1.15)
    }
  }

  // Position corridor attraction: numbers near empty corridor means
  // (light touch — favor numbers in typical sorted slots not just extremes)
  return scores
}
