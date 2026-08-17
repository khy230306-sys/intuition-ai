import type { GeneratorMode, LottoDraw } from '../domain/types'
import { PICK } from '../domain/types'
import { drawsBefore } from '../data/provider'
import { generateCombinations, generateRandomGames } from '../generator/generator'
import { mean, stddev } from '../math/stats'

export interface BacktestReport {
  strategyMode: GeneratorMode
  fromDraw: number
  toDraw: number
  gamesPerDraw: number
  drawCount: number
  averageMatches: number
  matchHistogram: Record<number, number>
  bestMatch: number
  randomAverageMatches: number
  delta: number
  confidenceInterval: { low: number; high: number }
}

export interface WalkForwardFold {
  trainEnd: number
  validateFrom: number
  validateTo: number
}

export interface WalkForwardFoldResult {
  fold: WalkForwardFold
  report: BacktestReport
}

export interface WalkForwardReport {
  folds: WalkForwardFoldResult[]
  aggregate: BacktestReport
}

export interface RunBacktestOptions {
  allDraws: LottoDraw[]
  strategyMode: GeneratorMode
  fromDraw: number
  toDraw: number
  gamesPerDraw: number
  seed: number
  datasetVersion?: string
}

export class LookaheadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LookaheadError'
  }
}

/** Guard used by backtest and tests — rejects any draw with drawNumber >= asOf */
export function assertNoLookahead(usedDraws: LottoDraw[], asOfDrawNumber: number): void {
  for (const d of usedDraws) {
    if (d.drawNumber >= asOfDrawNumber) {
      throw new LookaheadError(
        `lookahead detected: draw ${d.drawNumber} used while evaluating ${asOfDrawNumber}`,
      )
    }
  }
}

function countMatches(pred: number[], actual: number[]): number {
  const set = new Set(actual)
  return pred.filter((n) => set.has(n)).length
}

function emptyHistogram(): Record<number, number> {
  const h: Record<number, number> = {}
  for (let i = 0; i <= PICK; i++) h[i] = 0
  return h
}

function roughConfidenceInterval(values: number[]): { low: number; high: number } {
  if (!values.length) return { low: 0, high: 0 }
  const m = mean(values)
  const sd = stddev(values)
  const margin = sd / Math.sqrt(values.length) * 1.96
  return { low: m - margin, high: m + margin }
}

async function evaluateDrawRange(
  allDraws: LottoDraw[],
  mode: GeneratorMode,
  fromDraw: number,
  toDraw: number,
  gamesPerDraw: number,
  seed: number,
  datasetVersion: string,
): Promise<{ matchValues: number[]; randomMatchValues: number[] }> {
  const evaluationDraws = allDraws.filter(
    (d) => d.drawNumber >= fromDraw && d.drawNumber <= toDraw,
  )
  const matchValues: number[] = []
  const randomMatchValues: number[] = []

  for (const target of evaluationDraws) {
    const history = drawsBefore(allDraws, target.drawNumber)
    assertNoLookahead(history, target.drawNumber)

    const drawSeed = seed + target.drawNumber * 997

    const combos = await generateCombinations({
      draws: allDraws,
      asOfDrawNumber: target.drawNumber,
      datasetVersion,
      mode,
      gameCount: gamesPerDraw,
      fixed: [],
      excluded: [],
      watch: [],
      seed: drawSeed,
    })

    let best = 0
    for (const c of combos) {
      best = Math.max(best, countMatches(c.numbers, target.numbers))
    }
    matchValues.push(best)

    const randomGames = generateRandomGames(gamesPerDraw, [], [], drawSeed + 1)
    let randomBest = 0
    for (const g of randomGames) {
      randomBest = Math.max(randomBest, countMatches(g, target.numbers))
    }
    randomMatchValues.push(randomBest)
  }

  return { matchValues, randomMatchValues }
}

function buildReport(
  mode: GeneratorMode,
  fromDraw: number,
  toDraw: number,
  gamesPerDraw: number,
  matchValues: number[],
  randomMatchValues: number[],
): BacktestReport {
  const histogram = emptyHistogram()
  for (const m of matchValues) histogram[m] = (histogram[m] ?? 0) + 1

  const averageMatches = matchValues.length ? mean(matchValues) : 0
  const randomAverageMatches = randomMatchValues.length ? mean(randomMatchValues) : 0

  return {
    strategyMode: mode,
    fromDraw,
    toDraw,
    gamesPerDraw,
    drawCount: matchValues.length,
    averageMatches,
    matchHistogram: histogram,
    bestMatch: matchValues.length ? Math.max(...matchValues) : 0,
    randomAverageMatches,
    delta: averageMatches - randomAverageMatches,
    confidenceInterval: roughConfidenceInterval(matchValues),
  }
}

export async function runBacktest(opts: RunBacktestOptions): Promise<BacktestReport> {
  const datasetVersion = opts.datasetVersion ?? `backtest|${opts.allDraws.length}`
  const { matchValues, randomMatchValues } = await evaluateDrawRange(
    opts.allDraws,
    opts.strategyMode,
    opts.fromDraw,
    opts.toDraw,
    opts.gamesPerDraw,
    opts.seed,
    datasetVersion,
  )

  return buildReport(
    opts.strategyMode,
    opts.fromDraw,
    opts.toDraw,
    opts.gamesPerDraw,
    matchValues,
    randomMatchValues,
  )
}

export interface WalkForwardOptions {
  allDraws: LottoDraw[]
  folds: WalkForwardFold[]
  strategyMode: GeneratorMode
  gamesPerDraw: number
  seed: number
  datasetVersion?: string
}

export async function walkForward(opts: WalkForwardOptions): Promise<WalkForwardReport> {
  const datasetVersion = opts.datasetVersion ?? `walkforward|${opts.allDraws.length}`
  const foldResults: WalkForwardFoldResult[] = []
  const allMatchValues: number[] = []
  const allRandomValues: number[] = []

  for (let i = 0; i < opts.folds.length; i++) {
    const fold = opts.folds[i]!
    const foldSeed = opts.seed + i * 7919
    const { matchValues, randomMatchValues } = await evaluateDrawRange(
      opts.allDraws,
      opts.strategyMode,
      fold.validateFrom,
      fold.validateTo,
      opts.gamesPerDraw,
      foldSeed,
      datasetVersion,
    )
    allMatchValues.push(...matchValues)
    allRandomValues.push(...randomMatchValues)

    foldResults.push({
      fold,
      report: buildReport(
        opts.strategyMode,
        fold.validateFrom,
        fold.validateTo,
        opts.gamesPerDraw,
        matchValues,
        randomMatchValues,
      ),
    })
  }

  const fromDraw = Math.min(...opts.folds.map((f) => f.validateFrom))
  const toDraw = Math.max(...opts.folds.map((f) => f.validateTo))

  return {
    folds: foldResults,
    aggregate: buildReport(
      opts.strategyMode,
      fromDraw,
      toDraw,
      opts.gamesPerDraw,
      allMatchValues,
      allRandomValues,
    ),
  }
}
