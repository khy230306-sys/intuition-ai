import type { AnalysisContext, EngineResult } from '../../domain/types'
import { MAX_N, PICK } from '../../domain/types'
import { drawsBefore } from '../../data/provider'
import { mulberry32, sampleUnique } from '../../math/random'
import type { AnalysisEngine } from '../types'
import { emptyScores, rankFromScores } from '../types'

const VERSION = '1.0.0'

export const randomEngine: AnalysisEngine = {
  id: 'random',
  name: 'Random',
  version: VERSION,

  async analyze(context: AnalysisContext): Promise<EngineResult> {
    const draws = drawsBefore(context.draws, context.asOfDrawNumber)
    const seed = context.seed ?? Date.now()
    const rand = mulberry32(seed)
    const pool = Array.from({ length: MAX_N }, (_, i) => i + 1)
    const samples: number[][] = []

    for (let i = 0; i < 5; i++) {
      samples.push(sampleUnique(pool, PICK, rand))
    }

    const numberScores = emptyScores()

    return {
      engineId: 'random',
      engineVersion: VERSION,
      numberScores,
      rankedNumbers: rankFromScores(numberScores),
      confidence: 0,
      evidence: { seed, sampleCombos: samples, note: 'uniform-unbiased-baseline' },
      metadata: { drawCount: draws.length, unbiased: true },
    }
  },
}
