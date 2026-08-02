import type { AizioSkill, CoreIntent } from './types'

/** Metadata registry — skill modules load on demand. */
const SKILLS: AizioSkill[] = [
  {
    id: 'music',
    displayName: 'AIZIO Music',
    supportedIntents: ['play_music', 'control_music'],
    available: true,
    timeoutMs: 12_000,
    safetyLevel: 1,
    load: () => import('./skills/musicSkillAdapter'),
  },
  {
    id: 'translation',
    displayName: 'AIZIO Translation',
    supportedIntents: ['translate'],
    available: true,
    timeoutMs: 20_000,
    safetyLevel: 1,
    load: () => import('./skills/translationSkillAdapter'),
  },
  {
    id: 'note',
    displayName: 'AIZIO Notes',
    supportedIntents: ['create_note', 'search_note'],
    available: true,
    timeoutMs: 5_000,
    safetyLevel: 2,
    load: () => import('./skills/noteSkillAdapter'),
  },
  {
    id: 'todo',
    displayName: 'AIZIO Todos',
    supportedIntents: ['create_todo', 'update_todo', 'list_todo'],
    available: true,
    timeoutMs: 5_000,
    safetyLevel: 2,
    load: () => import('./skills/todoSkillAdapter'),
  },
  {
    id: 'calendar',
    displayName: 'AIZIO Calendar',
    supportedIntents: ['create_calendar_event', 'list_calendar'],
    available: true, // list partial; create reports unavailable inside skill
    timeoutMs: 5_000,
    safetyLevel: 2,
    load: () => import('./skills/calendarSkillAdapter'),
  },
  {
    id: 'project',
    displayName: 'AIZIO Projects',
    supportedIntents: ['project_status', 'project_planning'],
    available: false,
    timeoutMs: 3_000,
    safetyLevel: 1,
    load: () => import('./skills/projectSkillAdapter'),
  },
  {
    id: 'settings',
    displayName: 'AIZIO Settings',
    supportedIntents: ['change_setting'],
    available: true,
    timeoutMs: 3_000,
    safetyLevel: 2,
    load: () => import('./skills/settingsSkillAdapter'),
  },
  {
    id: 'navigation',
    displayName: 'AIZIO Navigation',
    supportedIntents: ['app_navigation'],
    available: true,
    timeoutMs: 3_000,
    safetyLevel: 1,
    load: () => import('./skills/navigationSkillAdapter'),
  },
  {
    id: 'help',
    displayName: 'AIZIO Help',
    supportedIntents: ['help'],
    available: true,
    timeoutMs: 3_000,
    safetyLevel: 1,
    load: () => import('./skills/helpSkillAdapter'),
  },
  {
    id: 'chat',
    displayName: 'AIZIO Chat',
    supportedIntents: ['general_chat', 'ask_information', 'summarize', 'unknown'],
    available: true,
    timeoutMs: 45_000,
    safetyLevel: 1,
    load: () => import('./skills/chatSkillAdapter'),
  },
]

export function listSkillMeta(): Array<{
  id: string
  displayName: string
  supportedIntents: CoreIntent[]
  available: boolean
}> {
  return SKILLS.map((s) => ({
    id: s.id,
    displayName: s.displayName,
    supportedIntents: s.supportedIntents,
    available: s.available,
  }))
}

export function findSkillsForIntent(intent: CoreIntent): AizioSkill[] {
  return SKILLS.filter((s) => s.supportedIntents.includes(intent))
}

export function getSkillById(id: string): AizioSkill | undefined {
  return SKILLS.find((s) => s.id === id)
}
