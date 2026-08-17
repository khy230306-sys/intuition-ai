import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import { clamp01, normalizeMap } from '../../math/stats'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'
import { contrarianEngine } from '../contrarian/contrarianEngine'
import { cycleEngine } from '../cycle/cycleEngine'
import { delayEngine } from '../delay/delayEngine'
import { endingEngine } from '../ending/endingEngine'
import { gapEngine } from '../gap/gapEngine'
import { monteCarloEngine } from '../monteCarlo/monteCarloEngine'
import { networkEngine } from '../network/networkEngine'
import { pairEngine } from '../pair/pairEngine'
import { randomEngine } from '../random/randomEngine'
import { repeatEngine } from '../repeat/repeatEngine'
import { structureEngine } from '../structure/structureEngine'
import { trendEngine } from '../trend/trendEngine'
import { tripleEngine } from '../triple/tripleEngine'

const VERSION = '1.0.0'

export const DEFAULT_MASTER_WEIGHTS: Record<string, number> = {
  trend: 1.2,
  delay: 0.9,
  cycle: 0.8,
  pair: 1.0,
  triple: 0.85,
  network: 0.9,
  structure: 1.1,
  repeat: 0.75,
  ending: 0.7,
  gap: 0.8,
  contrarian: 0.95,
  monte: 1.0,
  random: 0,
}

const CHILD_ENGINES: AnalysisEngine[] = [
  trendEngine,
  delayEngine,
  cycleEngine,
  pairEngine,
  tripleEngine,
  networkEngine,
  structureEngine,
  repeatEngine,
  endingEngine,
  gapEngine,
  contrarianEngine,
  monteCarloEngine,
  randomEngine,
]

export interface MasterAnalyzeOptions {
  weights?: Record<string, number>
  precomputed?: EngineResult[]
}

export const masterEngine: AnalysisEngine = {
  id: 'master',
  name: 'Master',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const opts = (context as AnalysisContext & { master?: MasterAnalyzeOptions }).master
    const weights = { ...DEFAULT_MASTER_WEIGHTS, ...opts?.weights }

    const childResults =
      opts?.precomputed ??
      (await Promise.all(CHILD_ENGINES.map((e) => e.analyze(context))))

    const included = childResults.filter((r) => (weights[r.engineId] ?? 0) > 0)
    const raw = emptyScores()
    const breakdown: Record<number, Record<string, number>> = {}

    for (let n = 1; n <= MAX_N; n++) {
      breakdown[n] = {}
      let weightedSum = 0
      let weightTotal = 0

      for (const r of included) {
        const w = weights[r.engineId] ?? 0
        if (w <= 0) continue
        const score = r.numberScores[n] ?? 50
        breakdown[n]![r.engineId] = score
        weightedSum += score * w
        weightTotal += w
      }

      raw[n] = weightTotal > 0 ? weightedSum / weightTotal : 50
    }

    const numberScores = normalizeMap(raw)
    const perEngineTop: Record<string, number[]> = {}
    for (const r of included) {
      perEngineTop[r.engineId] = r.rankedNumbers.slice(0, 6)
    }

    const avgConfidence =
      included.length > 0
        ? included.reduce((s, r) => s + r.confidence, 0) / included.length
        : 0

    return {
      engineId: 'master',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence: clamp01(avgConfidence),
      evidence: {
        breakdown,
        perEngineTop,
        weights,
        childEngineIds: included.map((r) => r.engineId),
      },
      metadata: {
        drawCount: draws.length,
        childCount: included.length,
        usedPrecomputed: Boolean(opts?.precomputed),
      },
    }
  },
}

export { CHILD_ENGINES }
