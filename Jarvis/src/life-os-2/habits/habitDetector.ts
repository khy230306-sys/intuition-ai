import { isLifeOs2Enabled } from '../featureFlags'
import { loadLos2Privacy } from '../privacyBoundary'
import { addObservation, loadHabits, loadObservations, saveHabits } from './habitRepository'
import { MIN_HABIT_OBSERVATIONS, type HabitRecord, type HabitType } from './habitTypes'
import { los2Id } from '../repository'

const SENSITIVE = /병원|약|우울|술|담배|체중|생리|임신|연애|외도/i

export function observeFromUtterance(text: string): void {
  if (!isLifeOs2Enabled('habitsEnabled') || !isLifeOs2Enabled('habitInferenceEnabled')) return
  if (!loadLos2Privacy().habitInference) return
  if (SENSITIVE.test(text)) return

  const hour = new Date().getHours()
  if (/출근|출근이야/.test(text)) addObservation('commute', '출근', hour)
  if (/잘\s*자|굿나잇|good\s*night/i.test(text)) addObservation('sleep', '취침', hour)
  if (/좋은\s*아침|굿모닝|good\s*morning/i.test(text)) addObservation('wake', '기상', hour)
  if (/집중\s*모드|집중\s*시작/.test(text)) addObservation('focus', '집중', hour)
  if (/음악\s*틀|잔잔한\s*음악|조용한\s*음악/.test(text)) addObservation('music', '음악', hour)
}

function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/** Build/update candidates from observations — never auto-confirm. */
export function refreshHabitCandidates(): HabitRecord[] {
  if (!isLifeOs2Enabled('habitsEnabled')) return loadHabits()
  const obs = loadObservations()
  const habits = loadHabits()
  const rejected = new Set(habits.filter((h) => h.status === 'ignored').map((h) => `${h.type}:${h.label}`))

  const byType = new Map<HabitType, typeof obs>()
  for (const o of obs) {
    const list = byType.get(o.type) || []
    list.push(o)
    byType.set(o.type, list)
  }

  for (const [type, list] of byType) {
    if (list.length < MIN_HABIT_OBSERVATIONS) continue
    const label = list[0].label
    const key = `${type}:${label}`
    if (rejected.has(key)) continue
    const hourHint = median(list.map((o) => o.hour))
    const existing = habits.find((h) => h.type === type && h.label === label)
    if (existing) {
      if (existing.status === 'ignored' || existing.status === 'disabled') continue
      existing.observationCount = list.length
      existing.lastObservedAt = list[0].at
      existing.confidence = Math.min(0.92, 0.4 + list.length * 0.08)
      existing.pattern = { ...existing.pattern, hourHint }
      if (existing.status === 'candidate') {
        /* stay candidate until user confirms */
      }
    } else {
      habits.unshift({
        id: los2Id('habit'),
        type,
        label,
        pattern: { hourHint, weekdayOnly: type === 'commute' },
        confidence: Math.min(0.85, 0.4 + list.length * 0.08),
        observationCount: list.length,
        lastObservedAt: list[0].at,
        status: 'candidate',
        userConfirmed: false,
      })
    }
  }
  saveHabits(habits)
  return habits
}

export function formatHabitList(habits?: HabitRecord[]): string {
  const list = habits || loadHabits()
  if (!list.length) return '저장된 습관 후보가 없습니다. (최소 관측 후 후보가 생깁니다.)'
  return [
    '【습관】',
    ...list.slice(0, 12).map((h) => {
      const hour = h.pattern.hourHint != null ? `${h.pattern.hourHint}시쯤` : ''
      return `• [${h.status}] ${h.label} ${hour} · 관측 ${h.observationCount} · 신뢰 ${Math.round(h.confidence * 100)}%`
    }),
  ].join('\n')
}
