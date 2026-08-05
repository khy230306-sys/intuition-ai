import type { Severity } from '../types'

export type PredictionType =
  | 'departure'
  | 'deadline'
  | 'conflict'
  | 'stalled_project'
  | 'habit'
  | 'goal_delay'
  | 'missed_todo'

export type Prediction = {
  id: string
  type: PredictionType
  title: string
  reason: string
  confidence: number
  severity: Severity
  validUntil: string
  recommendedAction: { label: string; textHint?: string } | null
  sourceIds: string[]
  createdAt: string
}
