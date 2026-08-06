export type OrbId = 'blue' | 'gold' | 'violet'

export type RoundPhase = 'select' | 'ready' | 'running' | 'result'

export type SyncGrade = 'perfect' | 'great' | 'good' | 'miss'

export type RoundResult = {
  orb: OrbId
  grade: SyncGrade
  angleError: number
  energy: number
  storyKey: string
}

export const ORB_TARGET_ANGLE: Record<OrbId, number> = {
  blue: 0,
  gold: 120,
  violet: 240,
}

export const GRADE_ENERGY: Record<SyncGrade, number> = {
  perfect: 100,
  great: 70,
  good: 40,
  miss: 10,
}

export function normalizeAngle(degrees: number): number {
  const value = degrees % 360
  return value < 0 ? value + 360 : value
}

export function angleDelta(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b)) % 360
  return diff > 180 ? 360 - diff : diff
}

export function gradeFromError(error: number): SyncGrade {
  if (error <= 12) return 'perfect'
  if (error <= 28) return 'great'
  if (error <= 48) return 'good'
  return 'miss'
}
