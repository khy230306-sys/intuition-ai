/** Action Agent V1 — Task Session + Action Plan types */

export type TaskType =
  | 'travel.flight'
  | 'travel.hotel'
  | 'travel.plan'
  | 'restaurant.search'
  | 'reminder.create'
  | 'calendar.create'
  | 'todo.create'
  | 'navigation'

export type TaskStatus =
  | 'idle'
  | 'collecting'
  | 'ready'
  | 'executing'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'blocked'
  | 'needs_confirmation'
  | 'needs_provider'
  | 'suspended'

export type ActionState = TaskStatus

export type RiskLevel = 'read' | 'low_write' | 'external_commit' | 'financial'

export type SearchAvailability =
  | 'READY_FOR_SEARCH'
  | 'NEEDS_PROVIDER'
  | 'SEARCH_AVAILABLE'
  | 'SEARCH_UNAVAILABLE'

export type ResolvedDate = {
  originalText: string
  resolvedDate: string // ISO YYYY-MM-DD
}

export type SlotSource =
  | 'explicit_correction'
  | 'expected_question'
  | 'explicit_semantic'
  | 'multi_slot'
  | 'generic_fallback'

export type SlotMeta = {
  source: SlotSource
  confidence: number
  updatedAt: string
  explicit?: boolean
  expectedByQuestion?: string
}

export type SlotParseFailure = {
  slotParseFailure: true
  expectedSlot: string
  rawInput: string
  normalizedInput: string
  count: number
}

export type SlotTurnDiag = {
  expectedSlot: string | null
  pendingQuestion: string | null
  rawInput: string
  normalizedInput: string
  extractedSlots: Record<string, unknown>
  appliedSlots: Array<{ key: string; value: unknown; source: string }>
  rejectedSlotUpdates: Array<{ key: string; value: unknown; reason: string }>
  missingSlots: string[]
  nextQuestion: string | null
  parseFailed?: boolean
  validationError?: string | null
}

export type SearchResultItem = {
  id: string // result_1 …
  rank: number
  title: string
  subtitle?: string
  meta?: Record<string, unknown>
  stale?: boolean
}

export type TaskSlots = {
  origin?: string
  destination?: string
  departureDate?: ResolvedDate | null
  returnDate?: ResolvedDate | null
  tripType?: 'one_way' | 'round_trip' | 'unknown'
  passengers?: number
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'night' | 'unknown'
  checkIn?: ResolvedDate | null
  checkOut?: ResolvedDate | null
  budgetMax?: number
  location?: string
  date?: ResolvedDate | null
  time?: string
  partySize?: number
  category?: string
  preference?: string
  selectedResultId?: string
  reminderOffsetMinutes?: number
  calendarTitle?: string
  [key: string]: unknown
}

export type PlannedAction = {
  id: string
  kind: string
  riskLevel: RiskLevel
  state: ActionState
  taskSessionId: string
  sourceResultId?: string
  payload?: Record<string, unknown>
  searchAvailability?: SearchAvailability
  userPrompt?: string
}

export type ActionResult = {
  ok: boolean
  state: ActionState
  message: string
  searchAvailability?: SearchAvailability
  results?: SearchResultItem[]
  data?: unknown
  errorCode?: string
}

export type TaskSession = {
  id: string
  type: TaskType
  status: TaskStatus
  slots: TaskSlots
  missingSlots: string[]
  results: SearchResultItem[]
  resultsStale: boolean
  plannedAction?: PlannedAction | null
  lastActionResult?: ActionResult | null
  createdAt: string
  updatedAt: string
  label: string
  /** Legacy alias — same as expectedSlot for travel questions */
  pendingQuestion?: string | null
  /** Slot the next user answer must fill */
  expectedSlot?: string | null
  /** Stable id for the current question (retry tracking) */
  questionId?: string | null
  /** Per-slot provenance / confidence */
  slotMeta?: Record<string, SlotMeta>
  /** Consecutive parse failure for the same expected slot */
  lastParseFailure?: SlotParseFailure | null
  /** Last turn diagnostics (dev panel) */
  lastDiag?: SlotTurnDiag | null
}

export type ActionAgentDiag = {
  currentIntent: string
  activeMode: string
  activeTask: TaskSession | null
  suspendedCount: number
  collectedSlots: string[]
  missingSlots: string[]
  plannedAction: string | null
  lastActionResult: string | null
  expectedSlot?: string | null
  pendingQuestion?: string | null
  lastTurn?: SlotTurnDiag | null
}

export type ActionAgentTurnResult = {
  handled: boolean
  replyText: string
  speak?: boolean
  task?: TaskSession | null
  /** When true, caller should fall through to weather/legacy handlers */
  fallthrough?: boolean
  interruptKind?: 'weather' | 'city' | 'other'
}
