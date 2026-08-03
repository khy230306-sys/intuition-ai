import type { IsoDate } from '../types'

export type RoutineActionId =
  | 'summarize_tomorrow'
  | 'check_sleep_reminder'
  | 'prepare_calm_music'
  | 'today_schedule'
  | 'today_todos'
  | 'family_schedule'
  | 'goal_next_actions'
  | 'weather_if_available'

export type RoutineAction = {
  id: RoutineActionId
  label: string
  allowed: boolean
}

export type RoutineRecord = {
  id: string
  name: string
  triggerPhrases: string[]
  actions: RoutineAction[]
  enabled: boolean
  createdAt: IsoDate
  updatedAt: IsoDate
}

export type RoutineRunResult = {
  routineId: string
  results: Array<{ actionId: RoutineActionId; ok: boolean; detail: string }>
  allOk: boolean
}
