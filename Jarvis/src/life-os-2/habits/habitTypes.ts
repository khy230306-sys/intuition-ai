export type HabitType = 'sleep' | 'wake' | 'commute' | 'music' | 'focus' | 'routine' | 'custom'

export type HabitStatus = 'candidate' | 'confirmed' | 'ignored' | 'disabled'

export type HabitRecord = {
  id: string
  type: HabitType
  label: string
  pattern: { hourHint?: number; weekdayOnly?: boolean; phrase?: string }
  confidence: number
  observationCount: number
  lastObservedAt: string
  status: HabitStatus
  userConfirmed: boolean
}

export type HabitObservation = {
  id: string
  type: HabitType
  hour: number
  label: string
  at: string
}

export const MIN_HABIT_OBSERVATIONS = 3
