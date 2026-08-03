import { loadStoreList, saveStoreList } from '../lifeRepository'
import { lifeId, nowIso } from '../types'

export type LearningPlan = {
  id: string
  title: string
  level: string
  progress: number
  reviewDates: string[]
  createdAt: string
  updatedAt: string
}

const KEY = 'aizio_life_learning_v1'
const SCHEMA = 1

export function createLearningPlan(title: string, level = 'beginner'): LearningPlan {
  const now = nowIso()
  const plan: LearningPlan = {
    id: lifeId('lrn'),
    title: title.slice(0, 80),
    level,
    progress: 0,
    reviewDates: [],
    createdAt: now,
    updatedAt: now,
  }
  const items = loadStoreList<LearningPlan>(KEY, SCHEMA)
  items.unshift(plan)
  saveStoreList(KEY, SCHEMA, items, 40)
  return plan
}

export function formatLearningPlans(): string {
  const items = loadStoreList<LearningPlan>(KEY, SCHEMA)
  if (!items.length) return '학습 계획이 없습니다.'
  return [
    '【학습 계획】',
    ...items
      .slice(0, 10)
      .map((p) => `• ${p.title} · ${p.level} · 진행 ${Math.round(p.progress * 100)}%`),
  ].join('\n')
}
