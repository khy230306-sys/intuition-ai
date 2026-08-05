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
  'remember_preference',
  'update_preference',
  'forget_preference',
  'show_dna',
  'create_goal',
  'update_goal',
  'list_goals',
  'complete_goal',
  'create_project_item',
  'save_idea',
  'search_ideas',
  'run_ai_meeting',
  'create_routine',
  'run_routine',
  'show_timeline',
  'add_timeline_event',
  'family_overview',
  'emergency_help',
  'health_log',
  'finance_log',
  'create_travel_plan',
  'create_learning_plan',
  'list_skills',
  'enable_skill',
  'disable_skill',
  'life_today_brief',
  'ask_current_context',
  'ask_priority',
  'ask_prediction',
  'show_habits',
  'confirm_habit',
  'reject_habit',
  'start_focus',
  'stop_focus',
  'focus_status',
  'save_relationship_ext',
  'search_relationship_ext',
  'search_knowledge',
  'create_automation',
  'run_automation',
  'stop_automation',
  'goal_coaching',
  'morning_brief',
  'evening_summary',
  'show_recommendations',
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
