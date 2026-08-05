/**
 * AIE Decision / Smart Priority — documented ordering.
 * See docs/AIZIO_PRIORITY_SYSTEM.md
 */

import type { AieDecisionStep, AieSmartPriority } from './types'

/** Decision Engine STEP order (lower index = higher priority). */
export const DECISION_STEP_ORDER: AieDecisionStep[] = [
  'STEP1_EMERGENCY',
  'STEP2_IN_PROGRESS',
  'STEP3_USER_COMMAND',
  'STEP4_TODAY_SCHEDULE',
  'STEP5_PROJECT',
  'STEP6_FAMILY',
  'STEP7_ROUTINE',
  'STEP8_AI_PROVIDER',
  'STEP9_RECOMMENDATION',
]

/** Concurrent-event Smart Priority (lower index = higher priority). */
export const SMART_PRIORITY_ORDER: AieSmartPriority[] = [
  'hospital_appointment',
  'family_urgent',
  'urgent_alert',
  'user_command',
  'recommendation',
]

export function decisionStepRank(step: AieDecisionStep): number {
  const i = DECISION_STEP_ORDER.indexOf(step)
  return i < 0 ? 99 : i
}

export function smartPriorityRank(p: AieSmartPriority): number {
  const i = SMART_PRIORITY_ORDER.indexOf(p)
  return i < 0 ? 99 : i
}

export function compareSmartPriority(a: AieSmartPriority, b: AieSmartPriority): number {
  return smartPriorityRank(a) - smartPriorityRank(b)
}
