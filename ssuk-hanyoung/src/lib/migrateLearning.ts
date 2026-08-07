import { CATEGORIES, getLearningMeta } from '../data/learning'
import {
  DEFAULT_PARENT_SETTINGS,
  emptyLearningProgress,
  type LearningProgress,
  type ParentSettings,
  type ActivityEntry,
} from './learningTypes'

type Migratable = {
  played?: Record<string, number>
  learningProgress?: LearningProgress
  activityLog?: ActivityEntry[]
  parentSettings?: ParentSettings
  playStreak?: number
  lastPlayDate?: string
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

/** Ensure Learning Core fields exist; seed skills from played counts without wiping stars/stickers */
export function migrateLearningFields<T extends Migratable>(p: T): T {
  const next = { ...p }
  if (!next.learningProgress) next.learningProgress = emptyLearningProgress()
  else {
    const base = emptyLearningProgress()
    for (const c of CATEGORIES) {
      next.learningProgress[c.id] = { ...base[c.id], ...(next.learningProgress[c.id] || {}) }
    }
  }
  if (!next.activityLog) next.activityLog = []
  if (!next.parentSettings) next.parentSettings = { ...DEFAULT_PARENT_SETTINGS }
  else {
    const prev = next.parentSettings as ParentSettings & { difficultyBias?: string }
    const merged: ParentSettings = {
      ...DEFAULT_PARENT_SETTINGS,
      ...prev,
      parentPinSalt: prev.parentPinSalt ?? null,
      parentRecoveryToken: prev.parentRecoveryToken ?? null,
      difficultyBias:
        (prev.difficultyBias as string) === 'balanced' ? 'auto' : (prev.difficultyBias as ParentSettings['difficultyBias']) || 'auto',
    }
    next.parentSettings = merged
  }
  if (next.playStreak == null) next.playStreak = 0
  if (!next.lastPlayDate) next.lastPlayDate = ''

  for (const [gameId, count] of Object.entries(next.played || {})) {
    if (!count) continue
    const meta = getLearningMeta(gameId)
    if (!meta) continue
    const bag = next.learningProgress[meta.category]
    if (!bag[meta.skill] || bag[meta.skill]!.attempts === 0) {
      const successes = Math.max(1, Math.floor(count * 0.7))
      const failures = Math.max(0, count - successes)
      const attempts = successes + failures
      const mastery = clamp(Math.round((successes / attempts) * 55), 5, 70)
      bag[meta.skill] = {
        attempts,
        successes,
        failures,
        successRate: successes / attempts,
        level: mastery >= 50 ? 2 : 1,
        lastPlayedAt: null,
        mastery,
        streak: 0,
      }
    }
  }
  return next
}
