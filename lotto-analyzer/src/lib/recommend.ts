import { flowScores } from './flow'
import {
  MAX_N,
  PICK,
  arithmeticComplexity,
  consecutivePairs,
  formatHighLow,
  formatOddEven,
  highCount,
  oddCount,
  sumOf,
  sumStats,
} from './stats'
import type { Draw, NumberStat, PairStat, PickResult, Strategy } from './types'

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function weightedSample(
  items: { n: number; w: number }[],
  k: number,
  rand: () => number,
): number[] {
  const pool = items.filter((x) => x.w > 0).map((x) => ({ ...x }))
  const picked: number[] = []
  while (picked.length < k && pool.length) {
    const total = pool.reduce((s, x) => s + x.w, 0)
    let r = rand() * total
    let idx = 0
    for (; idx < pool.length; idx++) {
      r -= pool[idx].w
      if (r <= 0) break
    }
    idx = Math.min(idx, pool.length - 1)
    picked.push(pool[idx].n)
    pool.splice(idx, 1)
  }
  return picked.sort((a, b) => a - b)
}

function affinityBoost(
  candidate: number,
  selected: number[],
  pairMap: Map<string, number>,
): number {
  if (!selected.length) return 1
  let boost = 0
  for (const s of selected) {
    const a = Math.min(candidate, s)
    const b = Math.max(candidate, s)
    boost += pairMap.get(`${a}-${b}`) ?? 0
  }
  // normalize softly
  return 1 + boost / (selected.length * 40)
}

function buildWeights(
  stats: NumberStat[],
  strategy: Strategy,
  selected: number[],
  pairMap: Map<string, number>,
  flowMap?: Map<number, number>,
): { n: number; w: number }[] {
  const maxW = Math.max(...stats.map((s) => s.weightedScore), 1e-9)
  const maxC = Math.max(...stats.map((s) => s.count), 1)
  const maxO = Math.max(...stats.map((s) => s.overdue), 1e-9)
  const maxR = Math.max(...stats.map((s) => s.recentCount), 1)
  const maxF = flowMap
    ? Math.max(...[...flowMap.values()], 1e-9)
    : 1

  return stats
    .filter((s) => !selected.includes(s.n))
    .map((s) => {
      let base = 1
      switch (strategy) {
        case 'hot':
          base = 0.3 + (s.recentCount / maxR) * 2.2 + (s.weightedScore / maxW)
          break
        case 'cold':
          base = 0.4 + (1 - s.count / maxC) * 2.5 + (s.overdue / maxO) * 0.6
          break
        case 'overdue':
          base = 0.35 + (s.overdue / maxO) * 2.8 + (1 - s.recentCount / maxR)
          break
        case 'pair':
          base =
            0.5 +
            (s.weightedScore / maxW) * 1.2 +
            (s.count / maxC) * 0.8
          break
        case 'flow': {
          const f = (flowMap?.get(s.n) ?? 0.35) / maxF
          base =
            0.35 +
            f * 2.6 +
            (s.overdue / maxO) * 0.45 +
            (s.weightedScore / maxW) * 0.35
          break
        }
        case 'balanced':
        default:
          base =
            0.55 +
            (s.weightedScore / maxW) * 1.1 +
            (s.overdue / maxO) * 0.9 +
            (s.count / maxC) * 0.35 -
            (s.recentCount / maxR) * 0.15
          break
      }
      const aff = affinityBoost(s.n, selected, pairMap)
      // mild section diversity: avoid stuffing one decade
      const decade = Math.ceil(s.n / 10)
      const sameDecade = selected.filter((x) => Math.ceil(x / 10) === decade).length
      const diversity = sameDecade >= 2 ? 0.45 : sameDecade === 1 ? 0.75 : 1
      return { n: s.n, w: Math.max(0.05, base * aff * diversity) }
    })
}

function patternScore(
  nums: number[],
  draws: Draw[],
  sums: ReturnType<typeof sumStats>,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0
  const o = oddCount(nums)
  const h = highCount(nums)
  const sum = sumOf(nums)
  const cons = consecutivePairs(nums)
  const ac = arithmeticComplexity(nums)

  // Odd/even: historically 3:3 and 4:2 / 2:4 dominate
  if (o === 3) {
    score += 18
    reasons.push('홀짝 3:3 — 역대 최빈 패턴')
  } else if (o === 2 || o === 4) {
    score += 14
    reasons.push(`홀짝 ${o}:${PICK - o} — 고빈도 패턴`)
  } else if (o === 1 || o === 5) {
    score += 5
    reasons.push(`홀짝 ${o}:${PICK - o} — 드문 패턴`)
  } else {
    score -= 4
    reasons.push(`홀짝 ${o}:${PICK - o} — 매우 희귀`)
  }

  // High/low
  if (h === 3) {
    score += 14
    reasons.push('저고 3:3 균형')
  } else if (h === 2 || h === 4) {
    score += 10
  }

  // Sum near historical mean
  const z = Math.abs(sum - sums.mean) / (sums.std || 1)
  if (z <= 0.75) {
    score += 16
    reasons.push(`합계 ${sum} — 평균대(μ≈${sums.mean.toFixed(0)})`)
  } else if (z <= 1.5) {
    score += 8
    reasons.push(`합계 ${sum} — 허용 구간`)
  } else {
    score -= 2
    reasons.push(`합계 ${sum} — 평균에서 벗어남`)
  }

  // Consecutive
  if (cons === 1) {
    score += 10
    reasons.push('연속수 1쌍 — 흔한 구성')
  } else if (cons === 0) {
    score += 6
    reasons.push('연속수 없음')
  } else if (cons === 2) {
    score += 4
  } else {
    score -= 3
  }

  // AC
  if (ac >= 7 && ac <= 10) {
    score += 10
    reasons.push(`AC ${ac} — 분산 양호`)
  } else if (ac >= 4) {
    score += 5
  }

  // Avoid exact historical duplicates
  const key = nums.join(',')
  const dup = draws.some((d) => d.numbers.join(',') === key)
  if (dup) {
    score -= 40
    reasons.push('역대 당첨 조합과 동일 — 제외 권장')
  }

  // Mild uniqueness vs last draw
  const last = draws[draws.length - 1]
  if (last) {
    const overlap = nums.filter((n) => last.numbers.includes(n)).length
    if (overlap >= 4) {
      score -= 8
      reasons.push(`직전 회차와 ${overlap}개 중복`)
    } else if (overlap === 0) {
      score += 3
    }
  }

  return { score, reasons }
}

function buildPairMap(pairs: PairStat[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of pairs) m.set(`${p.a}-${p.b}`, p.count)
  return m
}

export function generatePicks(
  draws: Draw[],
  stats: NumberStat[],
  pairs: PairStat[],
  strategy: Strategy,
  count = 5,
  seed = Date.now(),
): PickResult[] {
  const rand = mulberry32(seed >>> 0)
  const pairMap = buildPairMap(pairs)
  const sums = sumStats(draws)
  const flowMap = strategy === 'flow' ? flowScores(draws) : undefined
  const results: PickResult[] = []
  const seen = new Set<string>()

  let attempts = 0
  while (results.length < count && attempts < count * 40) {
    attempts++
    const selected: number[] = []
    // sequential weighted picks so affinity can kick in
    for (let i = 0; i < PICK; i++) {
      const weights = buildWeights(stats, strategy, selected, pairMap, flowMap)
      const [n] = weightedSample(weights, 1, rand)
      if (n == null) break
      selected.push(n)
    }
    if (selected.length !== PICK) continue
    const numbers = [...selected].sort((a, b) => a - b)
    const key = numbers.join(',')
    if (seen.has(key)) continue
    seen.add(key)

    const { score, reasons } = patternScore(numbers, draws, sums)
    // strategy flavor bonus
    const stratBonus =
      strategy === 'balanced'
        ? 4
        : strategy === 'flow'
          ? 5
          : strategy === 'pair'
            ? 3
            : 2
    const flowReasons =
      strategy === 'flow'
        ? ['회차 전이·합계 흐름 가중치 반영']
        : []
    results.push({
      numbers,
      strategy,
      score: score + stratBonus + rand() * 3,
      reasons: [...flowReasons, ...reasons].slice(0, 4),
      pattern: {
        oddEven: formatOddEven(numbers),
        highLow: formatHighLow(numbers),
        sum: sumOf(numbers),
        consecutive: consecutivePairs(numbers),
        ac: arithmeticComplexity(numbers),
      },
    })
  }

  return results.sort((a, b) => b.score - a.score)
}

export function analyzeCombination(
  numbers: number[],
  draws: Draw[],
  stats: NumberStat[],
): {
  valid: boolean
  pattern: PickResult['pattern']
  score: number
  reasons: string[]
  numberInsights: { n: number; gap: number; overdue: number; rank: number }[]
} {
  const unique = [...new Set(numbers)].filter((n) => n >= 1 && n <= MAX_N)
  const sorted = unique.sort((a, b) => a - b)
  const valid = sorted.length === PICK
  const sums = sumStats(draws)
  const { score, reasons } = valid
    ? patternScore(sorted, draws, sums)
    : { score: 0, reasons: ['번호 6개를 선택하세요'] }

  const byCount = [...stats].sort((a, b) => b.count - a.count)
  const rankOf = (n: number) => byCount.findIndex((s) => s.n === n) + 1

  return {
    valid,
    pattern: {
      oddEven: formatOddEven(sorted),
      highLow: formatHighLow(sorted),
      sum: sumOf(sorted),
      consecutive: consecutivePairs(sorted),
      ac: arithmeticComplexity(sorted),
    },
    score,
    reasons,
    numberInsights: sorted.map((n) => {
      const s = stats.find((x) => x.n === n)!
      return {
        n,
        gap: s.gap,
        overdue: s.overdue,
        rank: rankOf(n),
      }
    }),
  }
}

export const STRATEGY_META: Record<
  Strategy,
  { label: string; blurb: string }
> = {
  balanced: {
    label: '균형 분석',
    blurb: '최근 가중 빈도 + 공백 회귀 + 패턴 적합도를 섞습니다.',
  },
  flow: {
    label: '흐름 추적',
    blurb: '직전 회차 전이·합계 평균회귀·이월 억제로 다음 흐름을 읽습니다.',
  },
  hot: {
    label: '핫넘버',
    blurb: '최근 52회에서 자주 나온 번호를 우선합니다.',
  },
  cold: {
    label: '콜드넘버',
    blurb: '누적 출현이 적은 번호를 중심으로 고릅니다.',
  },
  overdue: {
    label: '회귀 대기',
    blurb: '평균 간격 대비 오래 안 나온 번호에 가중치를 줍니다.',
  },
  pair: {
    label: '페어 친화',
    blurb: '역대 동반 출현이 많은 번호 쌍을 붙입니다.',
  },
}
