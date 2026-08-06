/** Core Reliability — shared execution + metrics types (no PII). */

export type ExecutionStatus = 'success' | 'partial' | 'needs_input' | 'blocked' | 'failed'

export type ActionExecutionResult = {
  success: boolean
  action: string
  intent: string
  status: ExecutionStatus
  userMessage: string
  data?: unknown
  errorCode?: string
  retryable?: boolean
  provider?: string
  durationMs?: number
  fallback?: boolean
}

export type ReliabilityMetricEvent = {
  id: string
  at: number
  intent: string
  action: string
  success: boolean
  status: ExecutionStatus
  durationMs: number
  fallback: boolean
  provider?: string
  retry: boolean
  errorCode?: string
  /** Category bucket for KPI — never raw user text */
  category: string
}

export type ReliabilityKpis = {
  total: number
  successRate: number
  avgDurationMs: number
  providerFailRate: number
  fallbackRate: number
  retrySuccessRate: number
  byCategory: Record<string, { total: number; success: number; rate: number }>
  recentErrorCodes: string[]
}

export type GoldenCase = {
  id: string
  input: string
  expectedIntent: string | RegExp
  expectedAction?: string | RegExp
  forbiddenActions?: string[]
  expectedModeTransition?: string
  requiredEntities?: string[]
  category: string
}

export type MultiTurnStep = {
  input: string
  expectIntent?: string | RegExp
  expectText?: RegExp
  forbidText?: RegExp
}

export type MultiTurnScenario = {
  id: string
  name: string
  category: string
  setup?: 'clear_all' | 'translation_en' | 'travel' | 'restaurant'
  steps: MultiTurnStep[]
}
