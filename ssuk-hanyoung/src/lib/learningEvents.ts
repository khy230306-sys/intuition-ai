import { getLearningMeta } from '../data/learning'
import type { ActivityKind } from './learningTypes'
import { recordLearningActivity } from './learningProgress'

type Opts = { duration?: number; score?: number }

export function recordSuccess(gameId: string, opts: Opts = {}) {
  return recordLearningActivity({ gameId, success: true, duration: opts.duration, score: opts.score, kind: 'success' })
}

export function recordFailure(gameId: string, opts: Opts = {}) {
  return recordLearningActivity({ gameId, success: false, duration: opts.duration ?? 2, score: opts.score ?? 0, kind: 'failure' })
}

export function recordRetry(gameId: string) {
  return recordLearningActivity({ gameId, success: false, duration: 1, score: 0, kind: 'retry', countAttempt: false })
}

export function recordAbandon(gameId: string, duration = 0) {
  return recordLearningActivity({ gameId, success: false, duration, score: 0, kind: 'abandon', countAttempt: false })
}

export function recordComplete(gameId: string, opts: Opts = {}) {
  return recordLearningActivity({ gameId, success: true, duration: opts.duration, score: opts.score, kind: 'complete' })
}

export function learningLabel(gameId: string) {
  return getLearningMeta(gameId)?.title || gameId
}

export type { ActivityKind }
