import type { AppLocale } from '../i18n'
import type { ActionResult, BrainReply, View } from '../types'

/** Core Brain intent catalog (see docs/AIZIO_INTENT_CATALOG.md). */
export type CoreIntent =
  | 'general_chat'
  | 'ask_information'
  | 'summarize'
  | 'translate'
  | 'play_music'
  | 'control_music'
  | 'create_note'
  | 'search_note'
  | 'create_todo'
  | 'update_todo'
  | 'list_todo'
  | 'create_calendar_event'
  | 'list_calendar'
  | 'project_status'
  | 'project_planning'
  | 'app_navigation'
  | 'change_setting'
  | 'help'
  | 'remember_relationship'
  | 'update_relationship'
  | 'forget_relationship'
  | 'list_relationships'
  | 'create_reminder'
  | 'update_reminder'
  | 'cancel_reminder'
  | 'list_reminders'
  | 'snooze_reminder'
  | 'mark_reminder_complete'
  | 'ask_person_schedule'
  | 'unknown'

export type BrainSource = 'text' | 'voice' | 'system'

export type BrainStatus = 'success' | 'partial' | 'failed' | 'needs_user_action' | 'fallback_legacy'

export type SkillStatus = 'completed' | 'partial' | 'unavailable' | 'needs_user_action' | 'failed' | 'cancelled'

export type SafetyLevel = 1 | 2 | 3

export type UiActionType =
  | 'OPEN_ROUTE'
  | 'SHOW_MUSIC_PLAYER'
  | 'OPEN_EXTERNAL_URL'
  | 'SHOW_TOAST'
  | 'CLEAR_CHAT'
  | 'RUN_ACTION'

export type BrainErrorCode =
  | 'invalid_input'
  | 'intent_failed'
  | 'no_skill_available'
  | 'skill_timeout'
  | 'skill_failed'
  | 'ai_unavailable'
  | 'network_offline'
  | 'user_action_required'
  | 'unsafe_action'
  | 'cancelled'
  | 'unexpected_error'

export interface BrainHistoryItem {
  role: string
  text: string
}

export interface BrainAppContext {
  activeView?: View
  online?: boolean
  musicActive?: boolean
  selectedProject?: string | null
  lastIntent?: CoreIntent | null
  lastEntities?: Record<string, unknown>
}

export interface CoreBrainRequest {
  requestId: string
  text: string
  normalizedText: string
  locale: AppLocale
  conversationId?: string
  source: BrainSource
  timestamp: string
  history: BrainHistoryItem[]
  attachments: unknown[]
  appContext: BrainAppContext
  signal?: AbortSignal
}

export interface IntentClassification {
  intent: CoreIntent
  confidence: number
  source: 'local' | 'ai' | 'default'
  entities: Record<string, unknown>
}

export interface ExecutionStep {
  skillId: string
  intent: CoreIntent
  reason: string
}

export type UiAction =
  | { type: 'OPEN_ROUTE'; payload: { view: View; arcadeId?: string } }
  | { type: 'SHOW_MUSIC_PLAYER'; payload: { playUrl?: string | null; needsGesture?: boolean } }
  | { type: 'OPEN_EXTERNAL_URL'; payload: { url: string; label?: string } }
  | { type: 'SHOW_TOAST'; payload: { message: string } }
  | { type: 'CLEAR_CHAT'; payload?: Record<string, never> }
  | { type: 'RUN_ACTION'; payload: { run: () => Promise<ActionResult | void> | ActionResult | void } }

export interface SkillResult {
  success: boolean
  status: SkillStatus
  data: Record<string, unknown>
  message: string
  speakText?: string
  uiActions?: UiAction[]
  /** When set, maps directly onto existing BrainReply fields. */
  brainPatch?: Partial<BrainReply>
  error?: { code: BrainErrorCode; detail?: string } | null
}

export interface SkillContext {
  request: CoreBrainRequest
  intent: CoreIntent
  entities: Record<string, unknown>
  signal?: AbortSignal
}

export interface AizioSkill {
  id: string
  displayName: string
  supportedIntents: CoreIntent[]
  /** Metadata-only until loaded. */
  available: boolean
  timeoutMs: number
  safetyLevel: SafetyLevel
  /** Lazy loader — skill body imported on demand. */
  load: () => Promise<{
    isAvailable: () => boolean
    canHandle: (ctx: SkillContext) => boolean
    execute: (ctx: SkillContext) => Promise<SkillResult>
  }>
}

export interface CoreBrainResult {
  requestId: string
  intent: CoreIntent
  confidence: number
  entities: Record<string, unknown>
  selectedSkills: string[]
  executionPlan: ExecutionStep[]
  results: SkillResult[]
  responseText: string
  speakText: string
  status: BrainStatus
  warnings: string[]
  latencyMs: number
  /** When true, caller should run the pre-Core-Brain `think` pipeline. */
  fallbackLegacy: boolean
  /** Ready-to-use reply for main.ts (preserves BrainReply shape). */
  brainReply?: BrainReply
  errorCode?: BrainErrorCode
}
