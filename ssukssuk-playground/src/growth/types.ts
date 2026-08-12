/** Phase 14–17 — Growth Engine + parent report data (no harsh FAIL UX). */

export type GrowthSkill =
  | 'quantity_1_5'
  | 'quantity_6_10'
  | 'color_recognition'
  | 'shape_matching'
  | 'spatial_reasoning'
  | 'sequence_understanding'
  | 'fine_motor_control'
  | 'attention_duration'
  | 'hint_dependency'
  | 'retry_behavior'

export type GrowthEvent = {
  id: string
  at: number
  activity:
    | 'assemble'
    | 'paint'
    | 'wash'
    | 'repair'
    | 'drive'
    | 'fire_mission'
    | 'reward'
  skill: GrowthSkill
  /** 0..1 success / engagement signal — not a shame score */
  signal: number
  hintsUsed: number
  retries: number
  noteKo?: string
}

export type ParentReportLine = {
  at: number
  textKo: string
  skills: GrowthSkill[]
}

export type GrowthState = {
  events: GrowthEvent[]
  unlockedRewards: string[]
}

export const GROWTH_SKILLS: GrowthSkill[] = [
  'quantity_1_5',
  'quantity_6_10',
  'color_recognition',
  'shape_matching',
  'spatial_reasoning',
  'sequence_understanding',
  'fine_motor_control',
  'attention_duration',
  'hint_dependency',
  'retry_behavior',
]
