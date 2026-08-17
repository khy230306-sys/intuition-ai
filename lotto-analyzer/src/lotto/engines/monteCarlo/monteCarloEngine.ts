import type { AnalysisContext, EngineResult, LottoDraw } from '../../domain/types'
import { MAX_N, PICK } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import {
  clamp01,
  consecutivePairs,
  lowCount,
  mean,
  normalizeMap,
  oddCount,
  sectionCounts,
} from '../../math/stats'
import { mulberry32, sampleUnique } from '../../math/random'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'
const DEFAULT_SIMULATIONS = 5000

export type MonteCarloMode = 'fast' | 'standard' | 'deep'

const MODE_COUNTS: Record<MonteCarloMode, number> = {
  fast: 5000,
  standard: 50000,
  deep: 100000,
}

interface StructureProfile {
  oddMean: number
  lowMean: number
  sectionMeans: number[]
  sumMean: number
  consMean: number
}

function buildStructureProfile(draws: LottoDraw[]): StructureProfile {
  const odds: number[] = []
  const lows: number[] = []
  const sections: number[][] = []
  const sums: number[] = []
  const cons: number[] = []

  for (const d of draws) {
    odds.push(oddCount(d.numbers))
    lows.push(lowCount(d.numbers))
    sections.push(sectionCounts(d.numbers))
    sums.push(d.numbers.reduce((a, b) => a + b, 0))
    cons.push(consecutivePairs(d.numbers))
  }

  return {
    oddMean: mean(odds),
    lowMean: mean(lows),
    sectionMeans: [0, 1, 2, 3, 4].map((i) => mean(sections.map((s) => s[i] ?? 0))),
    sumMean: mean(sums),
    consMean: mean(cons),
  }
}

function frequencyMap(draws: LottoDraw[]): number[] {
  const counts = new Array(MAX_N + 1).fill(0)
  for (const d of draws) for (const n of d.numbers) counts[n]!++
  const total = draws.length || 1
  return counts.map((c, i) => (i === 0 ? 0 : c / total))
}

function comboScore(
  nums: number[],
  freq: number[],
  profile: StructureProfile,
): number {
  const odd = oddCount(nums)
  const low = lowCount(nums)
  const secs = sectionCounts(nums)
  const sum = nums.reduce((a, b) => a + b, 0)
  const cons = consecutivePairs(nums)

  const freqPart = mean(nums.map((n) => freq[n]!))
  const oddFit = 1 - Math.abs(odd - profile.oddMean) / PICK
  const lowFit = 1 - Math.abs(low - profile.lowMean) / PICK
  let secFit = 0
  for (let i = 0; i < 5; i++) {
    secFit += 1 - Math.abs(secs[i]! - profile.sectionMeans[i]!) / 2
  }
  secFit /= 5
  const sumFit = 1 - Math.abs(sum - profile.sumMean) / (profile.sumMean + 50)
  const consFit = 1 - Math.abs(cons - profile.consMean) / 3

  return freqPart * 0.35 + oddFit * 0.15 + lowFit * 0.15 + secFit * 0.2 + sumFit * 0.1 + consFit * 0.05
}

export const monteCarloEngine: AnalysisEngine = {
  id: 'monte',
  name: 'Monte Carlo',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const seed = context.seed ?? 42
    const rand = mulberry32(seed)
    const mode: MonteCarloMode =
      (context as AnalysisContext & { monteMode?: MonteCarloMode }).monteMode ?? 'fast'
    const simulations = MODE_COUNTS[mode]
    const profile = buildStructureProfile(draws)
    const freq = frequencyMap(draws)
    const pool = Array.from({ length: MAX_N }, (_, i) => i + 1)

    const scored: { nums: number[]; score: number }[] = []
    for (let i = 0; i < simulations; i++) {
      const nums = sampleUnique(pool, PICK, rand)
      scored.push({ nums, score: comboScore(nums, freq, profile) })
    }

    scored.sort((a, b) => b.score - a.score)
    const topCut = Math.max(50, Math.floor(simulations * 0.1))
    const top = scored.slice(0, topCut)

    const counts = new Array(MAX_N + 1).fill(0)
    for (const c of top) for (const n of c.nums) counts[n]!++

    const raw = emptyScores()
    for (let n = 1; n <= MAX_N; n++) raw[n] = counts[n]!

    const numberScores = normalizeMap(raw)
    const confidence = draws.length >= 30 ? clamp01(topCut / simulations) : 0.2

    return {
      engineId: 'monte',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence,
      evidence: {
        seed,
        mode,
        simulations,
        topCut,
        topComboSample: top.slice(0, 3).map((x) => x.nums),
      },
      metadata: {
        drawCount: draws.length,
        defaultSimulations: DEFAULT_SIMULATIONS,
        modes: MODE_COUNTS,
        heuristic: 'structure-plus-frequency',
      },
    }
  },
}
