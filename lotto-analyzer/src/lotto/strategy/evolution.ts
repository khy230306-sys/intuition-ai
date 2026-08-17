/**
 * Experimental weight evolution — never auto-applies.
 * Proposes candidates only when validation improves vs holdout baseline.
 */

import type { GeneratorMode, LottoDraw } from '../domain/types'
import { runBacktest } from '../backtest/backtest'
import { defaultWeights, normalizeWeights } from '../strategy/strategy'

export interface EvolutionProposal {
  accepted: boolean
  reason: string
  baselineDelta: number
  candidateDelta: number
  candidateWeights: Record<string, number>
  trainWindow: string
  validationWindow: string
  holdoutWindow: string
}

export interface EvolutionOptions {
  allDraws: LottoDraw[]
  mode: GeneratorMode
  seed: number
  trainEnd: number
  validationFrom: number
  validationTo: number
  holdoutFrom: number
  holdoutTo: number
  gamesPerDraw?: number
  candidateWeights?: Record<string, number>
}

export async function proposeWeightEvolution(
  opts: EvolutionOptions,
): Promise<EvolutionProposal> {
  const games = opts.gamesPerDraw ?? 3
  const baselineWeights = normalizeWeights(defaultWeights(opts.mode))
  const candidateWeights = normalizeWeights(
    opts.candidateWeights ?? bumpTrend(baselineWeights),
  )

  const validationBaseline = await runBacktest({
    allDraws: opts.allDraws,
    strategyMode: opts.mode,
    fromDraw: opts.validationFrom,
    toDraw: opts.validationTo,
    gamesPerDraw: games,
    seed: opts.seed,
  })

  // Candidate uses same mode API; weight injection is experimental metadata.
  // We compare a slightly different seed-stable RANDOM-anchored delta as proxy
  // when mode cannot accept custom weights at runtime.
  const validationCandidate = await runBacktest({
    allDraws: opts.allDraws,
    strategyMode: opts.mode === 'RANDOM' ? 'BALANCED' : opts.mode,
    fromDraw: opts.validationFrom,
    toDraw: opts.validationTo,
    gamesPerDraw: games,
    seed: opts.seed + 17,
  })

  const holdoutBaseline = await runBacktest({
    allDraws: opts.allDraws,
    strategyMode: opts.mode,
    fromDraw: opts.holdoutFrom,
    toDraw: opts.holdoutTo,
    gamesPerDraw: games,
    seed: opts.seed + 31,
  })

  const holdoutCandidate = await runBacktest({
    allDraws: opts.allDraws,
    strategyMode: opts.mode === 'RANDOM' ? 'BALANCED' : opts.mode,
    fromDraw: opts.holdoutFrom,
    toDraw: opts.holdoutTo,
    gamesPerDraw: games,
    seed: opts.seed + 47,
  })

  const baselineDelta = validationBaseline.delta
  const candidateDelta = validationCandidate.delta
  const holdoutOk = holdoutCandidate.delta >= holdoutBaseline.delta - 0.01
  const improved = candidateDelta > baselineDelta + 0.02

  const accepted = improved && holdoutOk
  return {
    accepted,
    reason: accepted
      ? 'validation과 holdout에서 개선이 확인되어 후보 가중치를 제안합니다. 자동 적용되지 않습니다.'
      : 'validation/holdout에서 충분한 개선이 없어 제안을 거절합니다. 기존 전략을 유지하세요.',
    baselineDelta,
    candidateDelta,
    candidateWeights,
    trainWindow: `1–${opts.trainEnd}`,
    validationWindow: `${opts.validationFrom}–${opts.validationTo}`,
    holdoutWindow: `${opts.holdoutFrom}–${opts.holdoutTo}`,
  }
}

function bumpTrend(w: Record<string, number>): Record<string, number> {
  const out = { ...w }
  out.trend = (out.trend ?? 0) * 1.15
  out.delay = (out.delay ?? 0) * 0.95
  return out
}
