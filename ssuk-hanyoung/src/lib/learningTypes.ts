import type { LearningCategory } from '../data/learning'

export type SkillProgress = {
  attempts: number
  successes: number
  failures: number
  successRate: number
  level: number
  lastPlayedAt: string | null
  mastery: number
  streak: number
  /** last 10 outcomes — true=success */
  recent?: boolean[]
  retries?: number
  abandons?: number
}

export type CategoryProgress = Record<string, SkillProgress>
export type LearningProgress = Record<LearningCategory, CategoryProgress>

export type ActivityKind = 'success' | 'failure' | 'retry' | 'abandon' | 'complete'

export type ActivityEntry = {
  at: string
  gameId: string
  category: LearningCategory
  skill: string
  success: boolean
  durationSec: number
  score: number
  kind?: ActivityKind
}

export type DifficultyBias = 'easy' | 'auto' | 'challenge'

export type ParentSettings = {
  screenTimeMinutes: number
  difficultyBias: DifficultyBias
  muteBgm: boolean
  parentPinEnabled: boolean
  parentPinHash: string | null
  parentPinSalt: string | null
  /** recovery token for parent-settings-only reset */
  parentRecoveryToken: string | null
}

export const EMPTY_SKILL = (): SkillProgress => ({
  attempts: 0,
  successes: 0,
  failures: 0,
  successRate: 0,
  level: 1,
  lastPlayedAt: null,
  mastery: 0,
  streak: 0,
  recent: [],
  retries: 0,
  abandons: 0,
})

export function emptyLearningProgress(): LearningProgress {
  return {
    language: {},
    math: {},
    cognition: {},
    science: {},
    creativity: {},
    music: {},
    life: {},
    exploration: {},
  }
}

export const DEFAULT_PARENT_SETTINGS: ParentSettings = {
  screenTimeMinutes: 30,
  difficultyBias: 'auto',
  muteBgm: true,
  parentPinEnabled: false,
  parentPinHash: null,
  parentPinSalt: null,
  parentRecoveryToken: null,
}
