/**
 * Session Context Engine V1.1 — structured refs for anaphora / follow-ups.
 */

import { parseSelectionIndex } from '../actionAgent/slotResolver'
import type { ToolResult } from './toolResult'
import type { EnginePlaceCandidate, EngineWeatherSnapshot } from './types'

export type GoalKind = 'outings_plan' | 'weather_only' | 'calendar_only' | 'idle'

export type DateTimeContext = {
  /** Absolute ms when known */
  whenAt?: number
  whenLabel?: string
  /** Relative day words resolved against "now" at set time */
  dayHint?: '오늘' | '내일' | '모레' | '이번주말' | '다음주말' | '토요일' | '일요일' | string
  timeHint?: string
  sourceUtterance?: string
}

export type SessionContext = {
  goal: GoalKind
  goalLabel?: string
  city?: string
  weather?: EngineWeatherSnapshot
  places: EnginePlaceCandidate[]
  placesQuery?: string
  selected?: EnginePlaceCandidate
  /** Last selected rank for 「그거/거기」 */
  selectedRank?: number
  dateTime: DateTimeContext
  /** Last tool results by toolId */
  lastTools: Record<string, ToolResult>
  /** Fingerprint of last executed request to prevent duplicate runs */
  lastRequestKey?: string
  lastRequestAt?: number
}

export function emptyContext(): SessionContext {
  return {
    goal: 'idle',
    places: [],
    dateTime: {},
    lastTools: {},
  }
}

export type ContextRef =
  | { kind: 'selected_place'; place: EnginePlaceCandidate }
  | { kind: 'place_by_rank'; place: EnginePlaceCandidate; rank: number }
  | { kind: 'date_time'; dateTime: DateTimeContext }
  | { kind: 'city'; city: string }
  | { kind: 'unresolved'; reason: string }

/** Resolve anaphora against structured context — not bare string match alone. */
export function resolveContextRef(text: string, ctx: SessionContext): ContextRef | null {
  const t = text.trim()
  if (!t) return null

  // Ordinal / 「아까 두 번째」
  const idx = parseSelectionIndex(t)
  if (
    idx != null &&
    (/번째|번\b|아까|그중에|그중|말한\s*곳|지난번/.test(t) ||
      /^(두\s*번째|첫\s*번째|세\s*번째|\d+\s*번)/.test(t))
  ) {
    const place = ctx.places.find((p) => p.rank === idx) || ctx.places[idx - 1]
    if (place) return { kind: 'place_by_rank', place, rank: idx }
    return { kind: 'unresolved', reason: 'no_place_at_rank' }
  }

  // 「거기 / 그거 / 아까 말한 곳 / 지난번」→ selected or sole place
  if (/거기|그거|그곳|그\s*장소|아까\s*말한\s*곳|지난번|그중에\s*그거|그걸로|이걸로/.test(t)) {
    if (ctx.selected) return { kind: 'selected_place', place: ctx.selected }
    if (ctx.places.length === 1) return { kind: 'selected_place', place: ctx.places[0]! }
    if (ctx.places.length > 1) return { kind: 'unresolved', reason: 'ambiguous_place' }
    return { kind: 'unresolved', reason: 'no_place' }
  }

  // 「그 시간 / 그 일정」
  if (/그\s*시간|그\s*일정|같은\s*시간/.test(t)) {
    if (ctx.dateTime.whenAt || ctx.dateTime.dayHint || ctx.dateTime.timeHint) {
      return { kind: 'date_time', dateTime: ctx.dateTime }
    }
    return { kind: 'unresolved', reason: 'no_datetime' }
  }

  return null
}

export function extractDateTimeHints(text: string): Partial<DateTimeContext> {
  const t = text.trim()
  const out: Partial<DateTimeContext> = { sourceUtterance: t }
  if (/다음\s*주말/.test(t)) out.dayHint = '다음주말'
  else if (/이번\s*주말|주말/.test(t) && !/다음/.test(t)) out.dayHint = '이번주말'
  else if (/모레/.test(t)) out.dayHint = '모레'
  else if (/내일/.test(t)) out.dayHint = '내일'
  else if (/오늘/.test(t)) out.dayHint = '오늘'
  else if (/토요일/.test(t)) out.dayHint = '토요일'
  else if (/일요일/.test(t)) out.dayHint = '일요일'

  const tm = t.match(/(오전|오후|아침|저녁)?\s*(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/)
  if (tm) out.timeHint = tm[0].trim()
  return out
}

/** Merge utterance date/time hints into context (later utterance wins). */
export function mergeDateTime(ctx: SessionContext, text: string): SessionContext {
  const hints = extractDateTimeHints(text)
  if (!hints.dayHint && !hints.timeHint) return ctx
  return {
    ...ctx,
    dateTime: {
      ...ctx.dateTime,
      ...hints,
      // keep whenAt until calendar tool resolves anew
    },
  }
}

export function updateGoal(ctx: SessionContext, kind: GoalKind, label?: string): SessionContext {
  return { ...ctx, goal: kind, goalLabel: label || ctx.goalLabel }
}

export function rememberTool(ctx: SessionContext, result: ToolResult): SessionContext {
  return {
    ...ctx,
    lastTools: { ...ctx.lastTools, [result.toolId]: result },
  }
}

export function requestFingerprint(kind: string, payload: string): string {
  return `${kind}::${payload.trim().toLowerCase().replace(/\s+/g, ' ')}`
}

export function isDuplicateRequest(ctx: SessionContext, key: string, windowMs = 2500): boolean {
  if (!ctx.lastRequestKey || ctx.lastRequestKey !== key) return false
  if (!ctx.lastRequestAt) return false
  return Date.now() - ctx.lastRequestAt < windowMs
}
