import type { CoreIntent, IntentClassification } from './types'

/** Intents Core Brain should execute via Skills (not legacy fallback). */
const SKILL_OWNED: CoreIntent[] = [
  'play_music',
  'control_music',
  'translate',
  'create_note',
  'search_note',
  'create_todo',
  'list_todo',
  'update_todo',
  'create_calendar_event',
  'list_calendar',
  'project_status',
  'project_planning',
  'app_navigation',
  'change_setting',
  'remember_relationship',
  'update_relationship',
  'forget_relationship',
  'list_relationships',
  'create_reminder',
  'update_reminder',
  'cancel_reminder',
  'list_reminders',
  'snooze_reminder',
  'mark_reminder_complete',
  'ask_person_schedule',
  // `help` → legacy think (full helpText with 투자/생활/…)
]

const MIN_CONFIDENCE = 0.72

export function shouldExecuteViaSkills(c: IntentClassification): boolean {
  if (!SKILL_OWNED.includes(c.intent)) return false
  if (c.confidence < MIN_CONFIDENCE) return false
  // ask_information / general_chat / summarize / unknown → legacy
  return true
}

export function isLowConfidence(c: IntentClassification): boolean {
  return c.confidence < MIN_CONFIDENCE
}
