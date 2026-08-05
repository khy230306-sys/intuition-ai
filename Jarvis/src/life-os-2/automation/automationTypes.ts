export type AutomationTriggerKind =
  | 'manual'
  | 'time'
  | 'before_event'
  | 'after_event'
  | 'app_open'
  | 'location_arrive'
  | 'nav_end'
  | 'focus_end'
  | 'habit_window'
  | 'phrase'

export type AutomationActionKind =
  | 'show_brief'
  | 'create_reminder'
  | 'prepare_music'
  | 'prepare_navigation'
  | 'open_project'
  | 'show_todos'
  | 'show_family'
  | 'start_focus'
  | 'noop_blocked'

export type AutomationAction = {
  kind: AutomationActionKind
  label: string
  payload?: Record<string, string>
}

export type AutomationV2 = {
  id: string
  name: string
  trigger: { kind: AutomationTriggerKind; phrase?: string }
  actions: AutomationAction[]
  enabled: boolean
  approved: boolean
  createdAt: string
  lastRunAt: string | null
}

export type AutomationRun = {
  id: string
  automationId: string
  at: string
  results: Array<{ action: AutomationActionKind; ok: boolean; message: string }>
  overall: 'success' | 'partial' | 'failed'
}
