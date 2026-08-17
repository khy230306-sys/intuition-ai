import type {
  Combination,
  GeneratorMode,
  LottoDraw,
} from '../domain/types'
import { MAX_N, PICK } from '../domain/types'
import { validateCombination } from '../domain/validate'
import { drawsBefore } from '../data/provider'
import { buildCombinationDNA } from '../dna/dna'
import { diversifyGames, scoreCoverage } from '../coverage/coverage'
import { masterEngine } from '../engines/master/masterEngine'
import { ENGINE_BY_ID } from '../engines/index'
import { mulberry32, sampleUnique, weightedPick } from '../math/random'
import { jaccard, oddCount } from '../math/stats'
import { defaultWeights } from '../strategy/strategy'

export interface GenerateOptions {
  draws: LottoDraw[]
  asOfDrawNumber?: number
  datasetVersion: string
  mode: GeneratorMode
  gameCount: number
  fixed: number[]
  excluded: number[]
  watch: number[]
  seed?: number
  masterScores?: Record<number, number>
  pairLift?: Map<string, number>
}

export class GeneratorValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeneratorValidationError'
  }
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function validateConstraints(fixed: number[], excluded: number[]): void {
  if (fixed.length > PICK) {
    throw new GeneratorValidationError(`fixed numbers exceed ${PICK}`)
  }
  const exSet = new Set(excluded)
  for (const n of fixed) {
    if (exSet.has(n)) {
      throw new GeneratorValidationError(`number ${n} is both fixed and excluded`)
    }
    if (!Number.isInteger(n) || n < 1 || n > MAX_N) {
      throw new GeneratorValidationError(`invalid fixed number: ${n}`)
    }
  }
  for (const n of excluded) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_N) {
      throw new GeneratorValidationError(`invalid excluded number: ${n}`)
    }
  }
}

function structureWarnings(nums: number[]): string[] {
  const warnings: string[] = []
  const sorted = [...nums].sort((a, b) => a - b)
  const odd = oddCount(sorted)
  if (odd === 0 || odd === PICK) {
    warnings.push(`extreme odd/even: ${odd}:${PICK - odd}`)
  }
  const sum = sorted.reduce((a, b) => a + b, 0)
  if (sum < 75) warnings.push(`low sum: ${sum}`)
  if (sum > 210) warnings.push(`high sum: ${sum}`)
  const low = sorted.filter((n) => n <= 22).length
  if (low === 0 || low === PICK) {
    warnings.push(`extreme low/high: ${low}:${PICK - low}`)
  }
  return warnings
}

function scoreRelation(nums: number[], pairLift?: Map<string, number>): number {
  if (!pairLift || pairLift.size === 0) return 50
  let total = 0
  let count = 0
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      const lift = pairLift.get(pairKey(nums[i]!, nums[j]!)) ?? 1
      total += Math.min(100, lift * 50)
      count++
    }
  }
  return count ? total / count : 50
}

function scoreCombo(
  nums: number[],
  numberScores: Record<number, number>,
  historical: LottoDraw[],
  existingGames: number[][],
  watch: number[],
  pairLift?: Map<string, number>,
): Combination['scoreComponents'] & { total: number; diversity: number } {
  const componentScore =
    nums.reduce((s, n) => s + (numberScores[n] ?? 50), 0) / PICK
  const dna = buildCombinationDNA(nums, historical)
  const structuralScore = dna.structuralPercentile
  const relationScore = scoreRelation(nums, pairLift)

  let diversityScore = 100
  for (const g of existingGames) {
    const sim = jaccard(nums, g)
    diversityScore = Math.min(diversityScore, (1 - sim) * 100)
  }

  let overlapPenalty = 0
  for (const g of existingGames) {
    const inter = nums.filter((n) => g.includes(n)).length
    if (inter >= 4) overlapPenalty += (inter - 3) * 8
  }

  let constraintScore = 100
  const watchHits = watch.filter((w) => nums.includes(w)).length
  constraintScore += watchHits * 5
  constraintScore = Math.min(100, constraintScore)

  const total =
  (componentScore * 0.35 +
    structuralScore * 0.2 +
    relationScore * 0.15 +
    diversityScore * 0.15 +
    constraintScore * 0.1) -
  overlapPenalty * 0.05

  return {
    componentScore,
    structuralScore,
    relationScore,
    diversityScore,
    overlapPenalty,
    constraintScore,
    total: Math.max(0, Math.min(100, total)),
    diversity: diversityScore,
  }
}

async function resolveNumberScores(
  opts: GenerateOptions,
): Promise<Record<number, number>> {
  if (opts.masterScores) return { ...opts.masterScores }

  const context = {
    draws: opts.draws,
    asOfDrawNumber: opts.asOfDrawNumber,
    datasetVersion: opts.datasetVersion,
    seed: opts.seed,
  }

  if (opts.mode === 'RANDOM') {
    const engine = ENGINE_BY_ID.random
    if (!engine) throw new GeneratorValidationError('random engine missing')
    const result = await engine.analyze(context)
    return result.numberScores
  }

  const weights = defaultWeights(opts.mode)
  const result = await masterEngine.analyze({
    ...context,
    master: { weights },
  } as typeof context & { master: { weights: Record<string, number> } })
  return result.numberScores
}

function buildOneGame(
  numberScores: Record<number, number>,
  fixed: number[],
  excluded: number[],
  rand: () => number,
): number[] {
  const excludedSet = new Set(excluded)
  const fixedSorted = [...new Set(fixed)].sort((a, b) => a - b)
  const need = PICK - fixedSorted.length
  if (need < 0) throw new GeneratorValidationError('fixed exceeds pick count')

  const pool = Array.from({ length: MAX_N }, (_, i) => i + 1).filter(
    (n) => !excludedSet.has(n) && !fixedSorted.includes(n),
  )

  if (pool.length < need) {
    throw new GeneratorValidationError('not enough numbers after constraints')
  }

  const weighted = pool.map((n) => ({
    n,
    w: Math.max(0.01, (numberScores[n] ?? 50) / 100),
  }))

  const picked =
    need > 0 ? weightedPick(weighted, need, rand) : []
  return validateCombination([...fixedSorted, ...picked])
}

export async function generateCombinations(opts: GenerateOptions): Promise<Combination[]> {
  validateConstraints(opts.fixed, opts.excluded)

  const historical = drawsBefore(opts.draws, opts.asOfDrawNumber)
  const seed = opts.seed ?? Date.now()
  const rand = mulberry32(seed)
  const numberScores = await resolveNumberScores(opts)

  const rawGames: number[][] = []
  const rawScores: number[] = []
  const maxAttempts = opts.gameCount * 20
  let attempts = 0

  while (rawGames.length < opts.gameCount && attempts < maxAttempts) {
    attempts++
    try {
      const nums = buildOneGame(numberScores, opts.fixed, opts.excluded, rand)
      const scored = scoreCombo(
        nums,
        numberScores,
        historical,
        rawGames,
        opts.watch,
        opts.pairLift,
      )
      const dup = rawGames.some((g) => jaccard(g, nums) === 1)
      if (!dup) {
        rawGames.push(nums)
        rawScores.push(scored.total)
      }
    } catch {
      // retry on constraint failure
    }
  }

  let games = rawGames
  if (opts.mode === 'COVERAGE' && games.length > 1) {
    games = diversifyGames(games, rawScores, rand)
    const coverage = scoreCoverage(games)
    if (coverage.score < 40) {
      games = diversifyGames(games, rawScores.map((s) => s * 0.8), rand)
    }
  }

  const now = new Date().toISOString()
  const combinations: Combination[] = []

  for (let i = 0; i < games.length; i++) {
    const nums = games[i]!
    const scored = scoreCombo(
      nums,
      numberScores,
      historical,
      games.slice(0, i),
      opts.watch,
      opts.pairLift,
    )
    const dna = buildCombinationDNA(nums, historical)
    const warnings = structureWarnings(nums)

    combinations.push({
      id: `combo-${seed}-${i}-${nums.join('-')}`,
      numbers: nums,
      createdAt: now,
      strategy: opts.mode,
      score: scored.total,
      scoreComponents: {
        componentScore: scored.componentScore,
        structuralScore: scored.structuralScore,
        relationScore: scored.relationScore,
        diversityScore: scored.diversityScore,
        overlapPenalty: scored.overlapPenalty,
        constraintScore: scored.constraintScore,
      },
      dna,
      diversityScore: scored.diversity,
      source: 'generator',
      warnings: warnings.length ? warnings : undefined,
    })
  }

  combinations.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return combinations
}

/** Fallback pure-random games when engine path is not needed */
export function generateRandomGames(
  gameCount: number,
  fixed: number[],
  excluded: number[],
  seed: number,
): number[][] {
  validateConstraints(fixed, excluded)
  const rand = mulberry32(seed)
  const excludedSet = new Set(excluded)
  const fixedSorted = [...new Set(fixed)].sort((a, b) => a - b)
  const games: number[][] = []

  for (let g = 0; g < gameCount; g++) {
    const need = PICK - fixedSorted.length
    const pool = Array.from({ length: MAX_N }, (_, i) => i + 1).filter(
      (n) => !excludedSet.has(n) && !fixedSorted.includes(n),
    )
    const picked = need > 0 ? sampleUnique(pool, need, rand) : []
    games.push(validateCombination([...fixedSorted, ...picked]))
  }
  return games
}
