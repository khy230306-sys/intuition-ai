/** Only allowlisted local actions may run. */

import type { RoutineAction, RoutineActionId } from './routineTypes'

const CATALOG: Record<RoutineActionId, { label: string; allowed: boolean }> = {
  summarize_tomorrow: { label: '내일 일정 요약 준비', allowed: true },
  check_sleep_reminder: { label: '취침 알림 확인', allowed: true },
  prepare_calm_music: { label: '잔잔한 음악 준비 안내', allowed: true },
  today_schedule: { label: '오늘 일정', allowed: true },
  today_todos: { label: '오늘 할 일', allowed: true },
  family_schedule: { label: '가족 일정(로컬)', allowed: true },
  goal_next_actions: { label: '목표 다음 행동', allowed: true },
  weather_if_available: { label: '날씨(연결 시에만)', allowed: true },
}

export function isActionAllowed(id: RoutineActionId): boolean {
  return CATALOG[id]?.allowed === true
}

export function buildAction(id: RoutineActionId): RoutineAction {
  const c = CATALOG[id]
  return { id, label: c.label, allowed: c.allowed }
}

export const FORBIDDEN_AUTOMATION = [
  'send_external_message',
  'payment',
  'finance_transfer',
  'delete_files',
  'contacts_access',
  'force_system_settings',
  'silent_location_share',
] as const
