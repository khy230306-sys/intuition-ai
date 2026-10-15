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
}

export type CategoryProgress = Record<string, SkillProgress>
export type LearningProgress = Record<LearningCategory, CategoryProgress>

export type ActivityEntry = {
  at: string
  gameId: string
  category: LearningCategory
  skill: string
  success: boolean
  durationSec: number
  score: number
}

export type ParentSettings = {
  screenTimeMinutes: number
  difficultyBias: 'easy' | 'balanced' | 'challenge'
  muteBgm: boolean
  parentPinEnabled: boolean
  parentPinHash: string | null
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
  difficultyBias: 'balanced',
  muteBgm: true,
  parentPinEnabled: false,
  parentPinHash: null,
}
