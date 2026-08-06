import { storyKey } from './stories'
import {
  GRADE_ENERGY,
  ORB_TARGET_ANGLE,
  angleDelta,
  gradeFromError,
  type OrbId,
  type RoundResult,
  type SyncGrade,
} from './types'

const ENERGY_KEY = 'orbis.demoEnergy.v1'

export function evaluateSync(orb: OrbId, markerAngle: number): RoundResult {
  const target = ORB_TARGET_ANGLE[orb]
  const error = angleDelta(markerAngle, target)
  const grade = gradeFromError(error)
  return {
    orb,
    grade,
    angleError: Number(error.toFixed(1)),
    energy: GRADE_ENERGY[grade],
    storyKey: storyKey(orb, grade),
  }
}

export function loadDemoEnergy(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(ENERGY_KEY)
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}

export function saveDemoEnergy(total: number): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ENERGY_KEY, String(Math.max(0, Math.floor(total))))
}

export function gradeLabel(grade: SyncGrade, language: 'ko' | 'en'): string {
  const map = {
    perfect: { ko: 'PERFECT', en: 'PERFECT' },
    great: { ko: 'GREAT', en: 'GREAT' },
    good: { ko: 'GOOD', en: 'GOOD' },
    miss: { ko: 'MISS', en: 'MISS' },
  } as const
  return map[grade][language]
}
