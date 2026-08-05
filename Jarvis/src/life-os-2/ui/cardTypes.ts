/**
 * Life OS 2.0 structured assistant cards — payload only (no DOM from skills).
 */

export type LifeOs2CardType =
  | 'context_summary'
  | 'priority_recommendation'
  | 'prediction'
  | 'focus_session'
  | 'habit_candidate'
  | 'automation_plan'
  | 'automation_result'
  | 'goal_coach'
  | 'knowledge_results'
  | 'morning_brief'
  | 'evening_summary'
  | 'warning'
  | 'unavailable'

export type LifeOs2CardStatus =
  | 'ready'
  | 'active'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled'
  | 'info'

/** Allowlisted card button actions (executed in main via data-los2-action). */
export type LifeOs2CardActionType =
  | 'OPEN_ROUTE'
  | 'SHOW_CARD'
  | 'START_FOCUS'
  | 'STOP_FOCUS'
  | 'SAVE_AUTOMATION'
  | 'RUN_AUTOMATION'
  | 'CANCEL_AUTOMATION'
  | 'OPEN_SAFE_EXTERNAL_URL'
  | 'DISMISS_CARD'
  | 'CONFIRM_HABIT'
  | 'REJECT_HABIT'
  | 'IGNORE_HABIT_ONCE'
  | 'TOGGLE_EXPAND'
  | 'SEND_HINT'

export type LifeOs2CardAction = {
  id: string
  type: LifeOs2CardActionType
  label: string
  payload?: Record<string, string>
}

export type LifeOs2CardItem = {
  id: string
  label: string
  detail?: string
  meta?: string
}

export type LifeOs2UiCard = {
  id: string
  type: LifeOs2CardType
  title: string
  summary: string
  status: LifeOs2CardStatus
  items: LifeOs2CardItem[]
  /** Hidden until expand (keep first viewport short). */
  moreItems?: LifeOs2CardItem[]
  actions: LifeOs2CardAction[]
  metadata: Record<string, string | number | boolean | null>
  createdAt: string
  collapsedByDefault?: boolean
}
