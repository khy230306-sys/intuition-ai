/**
 * Action Agent pipeline (priority order):
 * normalize → translation mode → task cancel/switch →
 * pending-question / multi-slot (active task) → follow-up action →
 * explicit standalone intent → planner → executor → response
 *
 * Active Task + Pending Question + Existing Slots beat standalone Intent Router.
 */

import type { CommandRouterResult } from '../commandRouter/types'
import { detectGlobalCommand } from '../commandRouter/globalCommands'
import { getActiveMode } from '../commandRouter/session'
import { isClearWeatherQuery } from '../commandRouter/weatherQuery'
import { executeGlobalCommandReset } from '../conversationReset'
import { executePlannedAction, formatResultsList } from './executor'
import {
  isActiveTaskFollowUpAction,
  isBarePlaceUtterance,
  isExplicitCityInfoQuery,
} from './multiSlotExtractor'
import {
  clarifyQuestion,
  computeMissingSlots,
  nextQuestion,
  planCrossAction,
  planSearchAction,
  taskLabel,
} from './planner'
import {
  applyFollowUpSlots,
  extractInitialTravelSlots,
  extractRestaurantSlots,
  looksLikeFollowUp,
} from './slotResolver'
import {
  applyTaskUpdate,
  cancelActiveTask,
  clearAllTasks,
  createTaskSession,
  getActiveTask,
  getSuspendedTasks,
  markResultsStale,
  resumeTravelTask,
  saveTask,
  suspendActiveForInterrupt,
} from './sessionStore'
import type { ActionAgentDiag, ActionAgentTurnResult, TaskSession } from './types'

export type PipelineOpts = {
  allowFixtures?: boolean
  /** Force Action Agent to own travel/restaurant (default true in chat path) */
  ownTravel?: boolean
}

function isResumeUtterance(t: string): boolean {
  return (
    /아까\s*(여행|비행기|호텔|작업)?\s*(계속|이어서)/.test(t) ||
    /여행\s*계속|비행기\s*계속|이어서\s*알아|계속\s*알아봐/.test(t)
  )
}

function isCancelUtterance(t: string): boolean {
  return (
    /^(취소|그만|취소해)$/.test(t) ||
    /아까\s*여행\s*취소|여행\s*취소|비행기\s*찾던\s*건\s*취소|작업\s*취소/.test(t)
  )
}

function wantsHotelAdd(t: string): boolean {
  return /호텔도|숙소도|호텔\s*(알아|찾|검색)/.test(t)
}

function wantsCalendar(t: string): boolean {
  return /일정에\s*넣|캘린더에\s*넣|일정\s*만들/.test(t)
}

function wantsReminderFromTrip(t: string): boolean {
  return /출발\s*.*전.*알려|전에\s*알려|알림도\s*해/.test(t)
}

function wantsNavigation(t: string): boolean {
  return /길찾기|내비|어떻게\s*가/.test(t)
}

function switchToReminder(t: string): boolean {
  return /취소하고.*알림|알림\s*잡아|전화할\s*거\s*알림/.test(t)
}

function isTravelDomainIntent(intent: string): boolean {
  return intent.startsWith('travel.')
}

function summarizeTask(task: TaskSession): string {
  const s = task.slots
  const lines = [task.label]
  if (s.origin || s.destination) lines.push(`${s.origin || '?'} → ${s.destination || '?'}`)
  // Always render departure / return as independent fields (never a single overwritten date)
  if (s.departureDate) lines.push(`출발: ${s.departureDate.resolvedDate}`)
  if (s.returnDate) lines.push(`귀국: ${s.returnDate.resolvedDate}`)
  if (s.passengers) lines.push(`${s.passengers}명`)
  if (s.tripType && s.tripType !== 'unknown') lines.push(s.tripType === 'round_trip' ? '왕복' : '편도')
  if (task.status === 'needs_provider') lines.push('제공자 연결 필요')
  else if (task.status === 'collecting') lines.push('정보 수집 중')
  else if (task.results.length && !task.resultsStale) lines.push(`후보 ${task.results.length}개`)
  return lines.join('\n')
}

/** Short natural ack of newly filled slots before the next question. */
function acknowledgeSlotDelta(
  before: TaskSession['slots'] | undefined,
  after: TaskSession['slots'],
): string {
  if (!before) return ''
  const parts: string[] = []
  if (after.destination && after.destination !== before.destination) {
    parts.push(`${after.destination} 목적지`)
  }
  if (after.origin && after.origin !== before.origin) {
    parts.push(`${after.origin} 출발`)
  }
  if (
    after.departureDate?.resolvedDate &&
    after.departureDate.resolvedDate !== before.departureDate?.resolvedDate
  ) {
    parts.push(`${after.departureDate.resolvedDate} 출발일`)
  }
  if (after.returnDate?.resolvedDate && after.returnDate.resolvedDate !== before.returnDate?.resolvedDate) {
    parts.push(`${after.returnDate.resolvedDate} 귀국일`)
  }
  if (after.tripType && after.tripType !== 'unknown' && after.tripType !== before.tripType) {
    parts.push(after.tripType === 'round_trip' ? '왕복' : '편도')
  }
  if (after.passengers && after.passengers !== before.passengers) {
    parts.push(`${after.passengers}명`)
  }
  if (!parts.length) return ''
  return `${parts.join(', ')}로 반영했어요.`
}

function setExpectedQuestion(task: TaskSession, expectedSlot: string | null): TaskSession {
  const questionId = expectedSlot ? `q_${task.id}_${expectedSlot}` : null
  return saveTask({
    ...task,
    pendingQuestion: expectedSlot,
    expectedSlot,
    questionId,
    // Clear parse failure when moving to a new question
    lastParseFailure:
      expectedSlot && task.lastParseFailure?.expectedSlot === expectedSlot
        ? task.lastParseFailure
        : null,
  })
}

async function runSearch(task: TaskSession, opts: PipelineOpts): Promise<ActionAgentTurnResult> {
  const action = planSearchAction(task)
  let next = saveTask({
    ...task,
    status: 'executing',
    plannedAction: action,
    missingSlots: [],
    pendingQuestion: null,
  })
  const result = await executePlannedAction(next, action, { allowFixtures: opts.allowFixtures })
  next = saveTask({
    ...next,
    status: result.state,
    results: result.results || [],
    resultsStale: false,
    lastActionResult: result,
    plannedAction: { ...action, state: result.state, searchAvailability: result.searchAvailability },
  })
  let text = result.message
  if (result.results?.length) {
    text += `\n\n${formatResultsList(result.results)}\n\n번호로 골라 주세요. 예: 「두 번째」`
  }
  text += `\n\n${summarizeTask(next)}`
  return { handled: true, replyText: text, speak: true, task: next }
}

async function collectOrSearch(
  task: TaskSession,
  opts: PipelineOpts,
  ackPrefix = '',
): Promise<ActionAgentTurnResult> {
  const missing = computeMissingSlots(task)
  let next = saveTask({ ...task, missingSlots: missing })
  if (missing.length) {
    const q = nextQuestion(next)
    const expected = q?.expectedSlot || null
    next = setExpectedQuestion(
      {
        ...next,
        status: 'collecting',
      },
      expected,
    )
    if (next.lastDiag) {
      next = saveTask({
        ...next,
        lastDiag: {
          ...next.lastDiag,
          missingSlots: missing,
          nextQuestion: q?.ask || null,
        },
      })
    }
    const head = [ackPrefix, q?.ask || '정보가 더 필요해요.'].filter(Boolean).join('\n')
    return {
      handled: true,
      replyText: `${head}\n\n${summarizeTask(next)}`,
      speak: true,
      task: next,
    }
  }
  next = saveTask({
    ...next,
    status: 'ready',
    pendingQuestion: null,
    expectedSlot: null,
    questionId: null,
    lastParseFailure: null,
  })
  const searched = await runSearch(next, opts)
  if (ackPrefix && searched.handled) {
    searched.replyText = `${ackPrefix}\n\n${searched.replyText}`
  }
  return searched
}

async function applySlotsAndContinue(
  active: TaskSession,
  text: string,
  opts: PipelineOpts,
): Promise<ActionAgentTurnResult> {
  // Always resolve against LATEST stored task (stale closure guard)
  const latest = getActiveTask()
  const base = latest && latest.id === active.id ? latest : active
  const expected = base.expectedSlot || base.pendingQuestion || null
  const applied = applyFollowUpSlots(base, text)

  if (applied.note === '__cancel__') {
    cancelActiveTask()
    return { handled: true, replyText: '작업을 취소했어요.', speak: true, task: null }
  }

  // Explicit new travel task reset
  if (applied.note === '__reset__' || applied.resetTask) {
    cancelActiveTask()
    const fresh = startFlightTask(text)
    return collectOrSearch(fresh, opts)
  }

  const enrichDiag = (diag: typeof applied.diag) => ({
    ...diag,
    beforeSlots: {
      departureDate: applied.beforeSlots?.departureDate?.resolvedDate,
      returnDate: applied.beforeSlots?.returnDate?.resolvedDate,
      origin: applied.beforeSlots?.origin,
      destination: applied.beforeSlots?.destination,
    },
    afterSlots: {
      departureDate: applied.slots.departureDate?.resolvedDate,
      returnDate: applied.slots.returnDate?.resolvedDate,
      origin: applied.slots.origin,
      destination: applied.slots.destination,
    },
    taskRevision: base.revision,
    semanticTrace: diag.extractedSlots?._semantic as Record<string, unknown> | undefined,
  })

  // Validation error ONLY when return phrase was wrong — not when user gave a new departure
  if (applied.validationError && !applied.authoritativeUpdate) {
    const next =
      applyTaskUpdate(base.id, (prev) => ({
        ...prev,
        slots: applied.slots,
        slotMeta: applied.slotMeta,
        lastDiag: {
          ...enrichDiag(applied.diag),
          validationError: applied.validationError,
          missingSlots: computeMissingSlots({ ...prev, slots: applied.slots }),
          nextQuestion: prev.pendingQuestion || expected,
        },
        pendingQuestion: expected,
        expectedSlot: expected,
      })) || base
    return {
      handled: true,
      replyText: `${applied.validationError}\n\n${summarizeTask(next)}`,
      speak: true,
      task: next,
    }
  }

  // Parse failure for expected slot — only when NOT an authoritative semantic update
  if (applied.parseFailed && expected && !applied.authoritativeUpdate) {
    const prevFail = base.lastParseFailure
    const count =
      prevFail?.expectedSlot === expected ? prevFail.count + 1 : 1
    const failure = {
      slotParseFailure: true as const,
      expectedSlot: expected,
      rawInput: text.trim(),
      normalizedInput: applied.normalizedInput || text.trim(),
      count,
    }
    const clarify = clarifyQuestion(expected)
    const next =
      applyTaskUpdate(base.id, (prev) => ({
        ...prev,
        slots: applied.slots,
        slotMeta: applied.slotMeta,
        pendingQuestion: expected,
        expectedSlot: expected,
        lastParseFailure: failure,
        lastDiag: {
          ...enrichDiag(applied.diag),
          parseFailed: true,
          missingSlots: computeMissingSlots({ ...prev, slots: applied.slots }),
          nextQuestion: clarify,
        },
      })) || base
    const prefix =
      count >= 2
        ? `${clarify}\n(입력 「${text.trim()}」을 이해하지 못했어요.)`
        : clarify
    return {
      handled: true,
      replyText: `${prefix}\n\n${summarizeTask(next)}`,
      speak: true,
      task: next,
    }
  }

  // Success / authoritative: clear pending when expected filled, authoritative, or no expected
  const clearPending =
    !expected ||
    Boolean(applied.expectedFilled) ||
    Boolean(applied.authoritativeUpdate) ||
    applied.diag.appliedSlots.some((a) => a.key === expected)

  let next =
    applyTaskUpdate(base.id, (prev) => {
      const draft: TaskSession = {
        ...prev,
        slots: applied.slots,
        slotMeta: applied.slotMeta,
        label: taskLabel(prev.type, applied.slots),
        lastDiag: enrichDiag(applied.diag),
        lastParseFailure: clearPending ? null : prev.lastParseFailure,
        pendingQuestion: clearPending ? null : expected,
        expectedSlot: clearPending ? null : expected,
      }
      return draft
    }) || base

  if (applied.stale && next.results.length) next = markResultsStale(next)

  if (applied.selected) {
    next =
      applyTaskUpdate(next.id, (prev) => ({
        ...prev,
        slots: { ...prev.slots, selectedResultId: applied.selected!.id },
      })) || next
    return {
      handled: true,
      replyText: `${applied.selected.rank}번을 선택했어요: ${applied.selected.title}`,
      speak: true,
      task: next,
    }
  }

  // Recompute missing from full latest task
  const ack = acknowledgeSlotDelta(applied.beforeSlots, applied.slots)
  return collectOrSearch(getActiveTask() || next, opts, ack)
}

function startFlightTask(text: string): TaskSession {
  const slots = extractInitialTravelSlots(text)
  const label = taskLabel('travel.plan', slots)
  // travel.plan for open-ended 「여행 준비」; flight search phrases still use travel.flight
  const type = /비행기|항공/.test(text) ? 'travel.flight' : 'travel.plan'
  return createTaskSession(type, label, slots)
}

function startHotelFromTravel(base: TaskSession): TaskSession {
  const slots = {
    ...base.slots,
    checkIn: base.slots.departureDate || base.slots.checkIn,
    checkOut: base.slots.returnDate || base.slots.checkOut,
    location: base.slots.destination,
  }
  return createTaskSession('travel.hotel', taskLabel('travel.hotel', slots), slots)
}

function startRestaurantTask(text: string): TaskSession {
  const slots = extractRestaurantSlots(text)
  return createTaskSession('restaurant.search', taskLabel('restaurant.search', slots), slots)
}

function activeTaskOwnsTurn(active: TaskSession | null, text: string): boolean {
  if (!active || active.status === 'cancelled') return false
  // needs_provider must NOT monopolize unrelated inputs (안녕 / 날씨 / …)
  // Only continue the task when the user is clearly following up on it.
  if (active.status === 'needs_provider') {
    return (
      looksLikeFollowUp(text) ||
      isActiveTaskFollowUpAction(text) ||
      isBarePlaceUtterance(text) ||
      /검색\s*다시|다시\s*(알아|검색|해)|제공자|연결해|항공\s*검색/.test(text)
    )
  }
  if (active.pendingQuestion) return true
  if (active.status === 'collecting' || active.status === 'ready') {
    return true
  }
  if (active.results.length) {
    return (
      looksLikeFollowUp(text) ||
      isActiveTaskFollowUpAction(text) ||
      /그걸로|이걸로|번|호텔도|일정에|알림/.test(text)
    )
  }
  if (looksLikeFollowUp(text) || isActiveTaskFollowUpAction(text) || isBarePlaceUtterance(text)) {
    return true
  }
  return false
}

/**
 * Main entry — returns handled turn or fallthrough for weather/legacy.
 */
export async function processActionAgentTurn(
  text: string,
  routed: CommandRouterResult,
  opts: PipelineOpts = {},
): Promise<ActionAgentTurnResult> {
  const t = text.trim()
  const mode = getActiveMode()

  // 0) Global / System commands — terminal (also handled in brain before AA)
  {
    const hit = detectGlobalCommand(t)
    if (hit) {
      const result = executeGlobalCommandReset(hit.command)
      return {
        handled: true,
        replyText: result.message,
        speak: true,
        task: getActiveTask(),
        clearChat: result.clearedChat,
      }
    }
  }

  // 1) Resume suspended travel (before translation fallthrough — 「계속」 must not start translate)
  if (isResumeUtterance(t)) {
    const resumed = resumeTravelTask()
    if (!resumed) {
      return { handled: true, replyText: '이어서 할 여행 작업을 찾지 못했어요.', speak: true }
    }
    return collectOrSearch(resumed, opts)
  }

  // 2) ACTIVE MODE: translation owns utterances
  if (mode === 'translation' || routed.intent.startsWith('translation.')) {
    return { handled: false, replyText: '', fallthrough: true }
  }

  // 3) Explicit cancel
  if (isCancelUtterance(t)) {
    const c = cancelActiveTask()
    return {
      handled: true,
      replyText: c ? `${c.label} 작업을 취소했어요.` : '취소할 작업이 없어요.',
      speak: true,
      task: null,
    }
  }

  // 4) Switch: cancel travel + reminder request → fallthrough after cancel
  if (switchToReminder(t)) {
    cancelActiveTask()
    return { handled: false, replyText: '', fallthrough: true }
  }

  // 5) Explicit weather interrupt — suspend & fallthrough (task preserved in suspended stack)
  if (routed.intent === 'weather.query' || isClearWeatherQuery(t)) {
    if (getActiveTask()) suspendActiveForInterrupt()
    return { handled: false, replyText: '', fallthrough: true, interruptKind: 'weather' }
  }

  // 6) Explicit city.info — answer via geo, keep active travel task (do NOT suspend/delete)
  if (isExplicitCityInfoQuery(t)) {
    return { handled: false, replyText: '', fallthrough: true, interruptKind: 'city' }
  }

  let active = getActiveTask()

  // 7) Pending question + multi-slot + follow-up on ACTIVE TASK (before standalone router intents)
  if (active && activeTaskOwnsTurn(active, t)) {
    // Don't steal clear new domain intents (non-travel)
    if (
      routed.intent === 'todo.create' ||
      routed.intent.startsWith('reminder.') ||
      routed.intent.startsWith('calendar.')
    ) {
      return { handled: false, replyText: '', fallthrough: true }
    }
    // Domain switch: restaurant ↔ travel
    if (routed.intent.startsWith('travel.') && active.type === 'restaurant.search') {
      /* new travel below */
    } else if (routed.intent.startsWith('restaurant.') && active.type.startsWith('travel')) {
      /* allow new restaurant below — unless this is bare place / slot fill */
      if (!isBarePlaceUtterance(t) && !active.pendingQuestion && !/\d{1,2}\s*월/.test(t)) {
        /* fall through to restaurant create */
      } else {
        return applySlotsAndContinue(active, t, opts)
      }
    } else {
      // Hotel add-on
      if (active.type.startsWith('travel') && wantsHotelAdd(t)) {
        active = startHotelFromTravel(active)
        return collectOrSearch(active, opts)
      }
      // Cross-actions
      if (wantsCalendar(t)) {
        const action = planCrossAction(active, 'calendar.create', 'low_write')
        const result = await executePlannedAction(active, action, { allowWrite: true })
        active = saveTask({ ...active, plannedAction: action, lastActionResult: result, status: result.state })
        return { handled: true, replyText: result.message, speak: true, task: active }
      }
      if (wantsReminderFromTrip(t)) {
        const applied = applyFollowUpSlots(active, t)
        active = saveTask({ ...active, slots: applied.slots })
        const action = planCrossAction(active, 'reminder.create', 'low_write')
        const result = await executePlannedAction(active, action, { allowWrite: true })
        active = saveTask({ ...active, plannedAction: action, lastActionResult: result, status: result.state })
        return { handled: true, replyText: result.message, speak: true, task: active }
      }
      if (wantsNavigation(t)) {
        const sel = active.results.find((r) => r.id === active!.slots.selectedResultId)
        return {
          handled: true,
          replyText: sel
            ? `「${sel.title}」로 길찾기를 열 준비예요. 지도/내비 화면에서 이어서 안내할게요.`
            : '길찾기를 하려면 먼저 결과에서 장소를 골라 주세요.',
          speak: true,
          task: active,
        }
      }

      // Travel follow-up search (「비행기표좀알아봐줘」) — reuse existing slots, never reset dates
      if (
        active.type.startsWith('travel') &&
        (isActiveTaskFollowUpAction(t) || isTravelDomainIntent(routed.intent))
      ) {
        return applySlotsAndContinue(active, t, opts)
      }

      // Pending question / multi-slot fill (short answers, combined slots)
      return applySlotsAndContinue(active, t, opts)
    }
  }

  // 8) Standalone Intent — new travel / restaurant (only when no owning active task)
  if (routed.intent.startsWith('travel.flight') || routed.intent === 'travel.plan' || routed.intent === 'travel.unknown') {
    if (/예약하는\s*방법|어떻게\s*예약|예약\s*방법/.test(t)) {
      return { handled: false, replyText: '', fallthrough: true }
    }
    // If a travel task is already active, merge into it instead of creating a blank session
    const existing = getActiveTask()
    if (existing && existing.type.startsWith('travel') && existing.status !== 'cancelled') {
      return applySlotsAndContinue(existing, t, opts)
    }
    const task = startFlightTask(t)
    return collectOrSearch(task, opts)
  }
  if (routed.intent.startsWith('travel.hotel')) {
    const base = getActiveTask()
    const task = base?.type.startsWith('travel')
      ? startHotelFromTravel(base)
      : createTaskSession('travel.hotel', '호텔 찾기', extractInitialTravelSlots(t))
    return collectOrSearch(task, opts)
  }
  if (routed.intent.startsWith('restaurant.')) {
    // Simple 「지역 맛집」 → legacy lifestyle/map path (no multi-turn booking slots)
    if (
      /맛집/.test(t) &&
      !/(예약|몇\s*명|\d+\s*명|가족이랑|고기집|한식|이탈리안|주차|몇\s*분)/.test(t) &&
      !extractRestaurantSlots(t).date
    ) {
      return { handled: false, replyText: '', fallthrough: true }
    }
    const task = startRestaurantTask(t)
    return collectOrSearch(task, opts)
  }

  // 9) Bare place with active travel that somehow wasn't owned — still fill destination
  active = getActiveTask()
  if (active?.type.startsWith('travel') && isBarePlaceUtterance(t)) {
    return applySlotsAndContinue(active, t, opts)
  }

  return { handled: false, replyText: '', fallthrough: true }
}

export function getActionAgentDiag(currentIntent = ''): ActionAgentDiag {
  const active = getActiveTask()
  const mode = getActiveMode()
  return {
    currentIntent,
    activeMode: mode,
    activeTask: active,
    suspendedCount: getSuspendedTasks().length,
    collectedSlots: active
      ? Object.keys(active.slots).filter(
          (k) => active.slots[k] != null && active.slots[k] !== '' && active.slots[k] !== 'unknown',
        )
      : [],
    missingSlots: active ? computeMissingSlots(active) : [],
    plannedAction: active?.plannedAction?.kind || null,
    lastActionResult: active?.lastActionResult?.state || null,
    expectedSlot: active?.expectedSlot || active?.pendingQuestion || null,
    pendingQuestion: active?.pendingQuestion || null,
    lastTurn: active?.lastDiag || null,
  }
}

export function resetActionAgentForTests(): void {
  clearAllTasks()
}
