/**
 * AIZIO Intelligence Engine (AIE) — shared types.
 * AIE sits above Core Brain as an orchestrator; it does not replace skills.
 */

export type AieDecisionStep =
  | 'STEP1_EMERGENCY'
  | 'STEP2_IN_PROGRESS'
  | 'STEP3_USER_COMMAND'
  | 'STEP4_TODAY_SCHEDULE'
  | 'STEP5_PROJECT'
  | 'STEP6_FAMILY'
  | 'STEP7_ROUTINE'
  | 'STEP8_AI_PROVIDER'
  | 'STEP9_RECOMMENDATION'

export type AieSmartPriority =
  | 'hospital_appointment'
  | 'family_urgent'
  | 'urgent_alert'
  | 'user_command'
  | 'recommendation'

export type AieTaskKind =
  | 'calendar'
  | 'reminder'
  | 'music'
  | 'navigation'
  | 'family'
  | 'project'
  | 'idea'
  | 'routine'
  | 'chat'
  | 'unknown'

export type AiePlannedTask = {
  id: string
  order: number
  kind: AieTaskKind
  text: string
  reason: string
}

export type AieActionPlan = {
  original: string
  multiTask: boolean
  tasks: AiePlannedTask[]
}

export type AieRecommendation = {
  id: string
  kind: string
  message: string
  priority: number
  sourceStep: AieDecisionStep
  /** Stable key for learning / suppress */
  signalKey: string
}

export type AieDeviceState = {
  online: boolean
  locale?: string
  platform?: string
}

export type AieProviderState = {
  anyConfigured: boolean
  mode?: string
  fixedProvider?: string | null
}

export type AieMusicState = {
  status: string
  title: string | null
  provider: string
  query: string
}

export type AieNavigationState = {
  hasPendingCandidates: boolean
}

export type AieContext = {
  time: string
  date: string
  timezone: string
  location: { city: string; lat?: number; lon?: number; permission: 'unknown' | 'granted' | 'denied' | 'unavailable' }
  network: { online: boolean }
  currentScreen: string | null
  activeConversation: { recentTurns: number; lastUserText: string | null }
  todaySchedule: string[]
  familyEvents: string[]
  goalProgress: Array<{ title: string; progress: number }>
  projectProgress: Array<{ name: string; progress: number; stalledDays: number }>
  weather: string | null
  navigationState: AieNavigationState
  musicState: AieMusicState
  providerState: AieProviderState
  deviceState: AieDeviceState
  dnaSnippet: string
  availableSkills: string[]
  routinesDue: string[]
  emergencyHints: string[]
  generatedAt: number
}

export type AieDecision = {
  step: AieDecisionStep
  reason: string
  focus: string
  smartPriority: AieSmartPriority
}

export type AiePrepareInput = {
  text: string
  history?: { role: string; text: string }[]
  source?: 'text' | 'voice' | 'system'
  /** Skip multi-task splitting (used when executing a single planned task). */
  skipMultiTask?: boolean
  /** Skip recommendation append. */
  skipRecommend?: boolean
  activeView?: string
}

export type AiePrepareResult = {
  decision: AieDecision
  plan: AieActionPlan
  /** Full context only when needed; otherwise null (lazy). */
  context: AieContext | null
  recommendations: AieRecommendation[]
  /** True when orchestrator should run tasks sequentially via think(). */
  shouldRunMultiTask: boolean
}
