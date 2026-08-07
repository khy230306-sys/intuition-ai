import type { LearningCategory } from '../data/learning'
import { CATEGORIES, getLearningMeta, LEARNING_GAMES } from '../data/learning'
import {
  DEFAULT_PARENT_SETTINGS,
  EMPTY_SKILL,
  emptyLearningProgress,
  type ActivityEntry,
  type LearningProgress,
  type ParentSettings,
  type SkillProgress,
} from './learningTypes'
import { getProfile, writeProfilePatch } from './store'
export { migrateLearningFields } from './migrateLearning'

export type { ActivityEntry, LearningProgress, ParentSettings, SkillProgress }
export { DEFAULT_PARENT_SETTINGS, EMPTY_SKILL, emptyLearningProgress }

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function weekStartKey() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function getLearningProgress(): LearningProgress {
  return getProfile().learningProgress || emptyLearningProgress()
}

export function getParentSettings(): ParentSettings {
  return getProfile().parentSettings || { ...DEFAULT_PARENT_SETTINGS }
}

export function setParentSettings(patch: Partial<ParentSettings>) {
  const p = getProfile()
  p.parentSettings = { ...(p.parentSettings || DEFAULT_PARENT_SETTINGS), ...patch }
  writeProfilePatch(p)
}

export type RecordInput = {
  gameId: string
  category?: LearningCategory
  skill?: string
  success: boolean
  duration?: number
  score?: number
}

export function recordLearningActivity(input: RecordInput) {
  const meta = getLearningMeta(input.gameId)
  const category = input.category || meta?.category || 'exploration'
  const skill = input.skill || meta?.skill || input.gameId
  const p = getProfile()
  if (!p.learningProgress) p.learningProgress = emptyLearningProgress()
  if (!p.activityLog) p.activityLog = []
  const bag = p.learningProgress[category] || (p.learningProgress[category] = {})
  const cur = bag[skill] || EMPTY_SKILL()
  const attempts = cur.attempts + 1
  const successes = cur.successes + (input.success ? 1 : 0)
  const failures = cur.failures + (input.success ? 0 : 1)
  const successRate = successes / attempts
  let mastery = cur.mastery
  if (input.success) mastery = clamp(mastery + (mastery < 40 ? 8 : mastery < 70 ? 5 : 2), 0, 100)
  else mastery = clamp(mastery - 4, 0, 100)
  const streak = input.success ? cur.streak + 1 : 0
  const level = mastery >= 80 ? 3 : mastery >= 45 ? 2 : 1
  bag[skill] = {
    attempts,
    successes,
    failures,
    successRate,
    level,
    lastPlayedAt: new Date().toISOString(),
    mastery,
    streak,
  }

  const durationSec = Math.max(0, Math.round(input.duration || 0))
  p.activityLog = [
    {
      at: new Date().toISOString(),
      gameId: input.gameId,
      category,
      skill,
      success: input.success,
      durationSec,
      score: input.score || 0,
    },
    ...p.activityLog,
  ].slice(0, 200)

  const t = todayKey()
  if (p.lastPlayDate !== t) {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`
    p.playStreak = p.lastPlayDate === yKey ? (p.playStreak || 0) + 1 : 1
    p.lastPlayDate = t
  }

  writeProfilePatch(p)
  return bag[skill]!
}

export type RecommendItem = {
  gameId: string
  title: string
  reason: string
  estimatedMinutes: number
  rewardStars: number
  category: LearningCategory
  mastery: number
}

export function getTodaysRecommendations(limit = 4): RecommendItem[] {
  const p = getProfile()
  const progress = p.learningProgress || emptyLearningProgress()
  const recentIds = (p.activityLog || []).slice(0, 8).map((a) => a.gameId)
  const bias = p.parentSettings?.difficultyBias || 'balanced'

  const scored = LEARNING_GAMES.filter((g) => g.id !== 'sticker-book').map((g) => {
    const skill = progress[g.category]?.[g.skill]
    const mastery = skill?.mastery ?? 0
    const attempts = skill?.attempts ?? 0
    const failRate = skill ? 1 - skill.successRate : 0
    const playedCount = p.played[g.id] || 0

    let score = 0
    const catAttempts = Object.values(progress[g.category] || {}).reduce((s, x) => s + x.attempts, 0)
    score += Math.max(0, 12 - catAttempts) * 2
    if (mastery >= 30 && mastery <= 70) score += 20
    else if (mastery < 30) score += 12
    else score += 4
    score += failRate * 15
    if (mastery > 85 && g.difficulty === 1) score -= 18
    if (recentIds.includes(g.id)) score -= 25
    score += Math.max(0, 8 - playedCount)
    if (bias === 'easy' && g.difficulty === 1) score += 6
    if (bias === 'challenge' && g.difficulty >= 2) score += 8
    if (bias === 'balanced' && g.difficulty === 2) score += 4
    if (attempts === 0) score += 10

    return { g, score, mastery }
  })

  scored.sort((a, b) => b.score - a.score)
  const picked: RecommendItem[] = []
  const usedCats = new Set<string>()
  for (const row of scored) {
    if (picked.length >= limit) break
    if (usedCats.has(row.g.category) && picked.length < limit - 1 && usedCats.size < 3) continue
    usedCats.add(row.g.category)
    picked.push({
      gameId: row.g.id,
      title: row.g.title,
      reason: row.g.recommendWhy,
      estimatedMinutes: row.g.estimatedMinutes,
      rewardStars: row.g.rewardStars,
      category: row.g.category,
      mastery: row.mastery,
    })
  }
  return picked
}

export function getCategoryMastery(cat: LearningCategory): number {
  const bag = getLearningProgress()[cat] || {}
  const vals = Object.values(bag)
  if (!vals.length) return 0
  return Math.round(vals.reduce((s, v) => s + v.mastery, 0) / vals.length)
}

export function getParentDashboard() {
  const p = getProfile()
  const log = p.activityLog || []
  const t = todayKey()
  const weekStart = weekStartKey()

  const todaySec = log
    .filter((a) => {
      const d = new Date(a.at)
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` === t
    })
    .reduce((s, a) => s + a.durationSec, 0)

  const weekSec = log
    .filter((a) => {
      const d = new Date(a.at)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      return key >= weekStart
    })
    .reduce((s, a) => s + a.durationSec, 0)

  const categoryStats = CATEGORIES.map((c) => ({
    id: c.id,
    ko: c.ko,
    short: c.short,
    accent: c.accent,
    mastery: getCategoryMastery(c.id),
  })).sort((a, b) => b.mastery - a.mastery)

  const strong = categoryStats.filter((c) => c.mastery >= 45).slice(0, 3)
  const needs = [...categoryStats].sort((a, b) => a.mastery - b.mastery).slice(0, 3)

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    const count = log.filter((a) => {
      const x = new Date(a.at)
      return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}` === key
    }).length
    return { date: key, count, label: `${d.getMonth() + 1}/${d.getDate()}` }
  })

  const topGames = Object.entries(p.played)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count, title: getLearningMeta(id)?.title || id }))

  return {
    todayMinutes: Math.round(todaySec / 60),
    weekMinutes: Math.round(weekSec / 60),
    totalActivities: log.length + Object.values(p.played).reduce((s, n) => s + n, 0),
    categoryStats,
    strong,
    needs,
    last7,
    topGames,
    recommendations: getTodaysRecommendations(3),
    playStreak: p.playStreak || 0,
    settings: p.parentSettings || DEFAULT_PARENT_SETTINGS,
  }
}

export function formatMinutes(m: number) {
  if (m <= 0) return '0분'
  if (m < 60) return `${m}분`
  return `${Math.floor(m / 60)}시간 ${m % 60}분`
}
