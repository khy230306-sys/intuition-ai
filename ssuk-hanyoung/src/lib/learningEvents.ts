import { getLearningMeta } from '../data/learning'
import type { ActivityKind } from './learningTypes'
import { recordLearningActivity } from './learningProgress'

type Opts = { duration?: number; score?: number; colorsUsed?: string[]; toolsUsed?: string[] }

/** Games graded by right/wrong */
export const QUIZ_GAMES = new Set([
  'color-follow',
  'car-puzzle',
  'wait-go',
  'car-parade',
  'color-mix',
  'hidden-cars',
  'rhythm-tap',
  'vroom-race',
  'color-garage',
  'parking',
  'find-color-car',
  'car-memory',
  'car-sounds',
  'shape-touch',
  'traffic-light',
  'bus-count',
  'color-quiz',
  'balloons',
  'car-builder',
  'car-wash',
  'maze-drive',
])

/** Free creative / sensory — no forced success/fail */
export const CREATIVE_GAMES = new Set([
  'finger-paint',
  'sand-play',
  'stamp-pad',
  'sticker-book',
  'bubble-pop',
  'pop-it',
  'sound-board',
  'car-paint',
  'story-tap',
])

export function isCreativeGame(gameId: string) {
  return CREATIVE_GAMES.has(gameId)
}

export function recordSuccess(gameId: string, opts: Opts = {}) {
  if (isCreativeGame(gameId)) return recordCreativeCompleted(gameId, opts)
  return recordLearningActivity({
    gameId,
    success: true,
    duration: opts.duration,
    score: opts.score,
    kind: 'success',
    colorsUsed: opts.colorsUsed,
    toolsUsed: opts.toolsUsed,
  })
}

export function recordFailure(gameId: string, opts: Opts = {}) {
  if (isCreativeGame(gameId)) return recordCreativeEngaged(gameId, opts)
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

/** Creative activity lifecycle — does not punish as failure */
export function recordCreativeStarted(gameId: string) {
  return recordLearningActivity({ gameId, success: true, duration: 0, score: 0, kind: 'complete', countAttempt: false })
}

export function recordCreativeEngaged(gameId: string, opts: Opts = {}) {
  return recordLearningActivity({
    gameId,
    success: true,
    duration: opts.duration ?? 5,
    score: opts.score ?? 0,
    kind: 'complete',
    countAttempt: true,
    colorsUsed: opts.colorsUsed,
    toolsUsed: opts.toolsUsed,
  })
}

export function recordCreativeCompleted(gameId: string, opts: Opts = {}) {
  return recordLearningActivity({
    gameId,
    success: true,
    duration: opts.duration ?? 20,
    score: opts.score ?? 1,
    kind: 'complete',
    countAttempt: true,
    colorsUsed: opts.colorsUsed,
    toolsUsed: opts.toolsUsed,
  })
}

export function learningLabel(gameId: string) {
  return getLearningMeta(gameId)?.title || gameId
}

export type { ActivityKind }
