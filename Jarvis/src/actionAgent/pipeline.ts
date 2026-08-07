/**
 * Action Agent pipeline:
 * NORMALIZE → ACTIVE MODE → INTENT ROUTER → TASK SESSION →
 * SLOT RESOLVER → ACTION PLANNER → EXECUTOR → VALIDATOR → UI RESPONSE
 */

import type { CommandRouterResult } from '../commandRouter/types'
import { getActiveMode } from '../commandRouter/session'
import { isClearWeatherQuery } from '../commandRouter/weatherQuery'
import { executePlannedAction, formatResultsList } from './executor'
import { computeMissingSlots, nextQuestion, planCrossAction, planSearchAction, taskLabel } from './planner'
import {
  applyFollowUpSlots,
  extractInitialTravelSlots,
  extractRestaurantSlots,
  looksLikeFollowUp,
} from './slotResolver'
import {
  cancelActiveTask,
  clearAllTasks,
  createTaskSession,
  getActiveTask,
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

function summarizeTask(task: TaskSession): string {
  const s = task.slots
  const lines = [task.label]
  if (s.origin || s.destination) lines.push(`${s.origin || '?'} → ${s.destination || '?'}`)
  if (s.departureDate) {
    const ret = s.returnDate ? ` ~ ${s.returnDate.resolvedDate}` : ''
    lines.push(`${s.departureDate.resolvedDate}${ret}`)
  }
  if (s.passengers) lines.push(`${s.passengers}명`)
  if (s.tripType && s.tripType !== 'unknown') lines.push(s.tripType === 'round_trip' ? '왕복' : '편도')
  if (task.status === 'needs_provider') lines.push('제공자 연결 필요')
  else if (task.status === 'collecting') lines.push('정보 수집 중')
  else if (task.results.length && !task.resultsStale) lines.push(`후보 ${task.results.length}개`)
  return lines.join('\n')
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

async function collectOrSearch(task: TaskSession, opts: PipelineOpts): Promise<ActionAgentTurnResult> {
  const missing = computeMissingSlots(task)
  let next = saveTask({ ...task, missingSlots: missing })
  if (missing.length) {
    const q = nextQuestion(next)
    next = saveTask({
      ...next,
      status: 'collecting',
      pendingQuestion: q?.pending || null,
    })
    return {
      handled: true,
      replyText: `${q?.ask || '정보가 더 필요해요.'}\n\n${summarizeTask(next)}`,
      speak: true,
      task: next,
    }
  }
  next = saveTask({ ...next, status: 'ready', pendingQuestion: null })
  return runSearch(next, opts)
}

function startFlightTask(text: string): TaskSession {
  const slots = extractInitialTravelSlots(text)
  const label = taskLabel('travel.flight', slots)
  return createTaskSession('travel.flight', label, slots)
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

  // Resume suspended travel (before translation fallthrough — 「계속」 must not start translate)
  if (isResumeUtterance(t)) {
    const resumed = resumeTravelTask()
    if (!resumed) {
      return { handled: true, replyText: '이어서 할 여행 작업을 찾지 못했어요.', speak: true }
    }
    return collectOrSearch(resumed, opts)
  }

  // ACTIVE MODE: translation owns utterances
  if (mode === 'translation' || routed.intent.startsWith('translation.')) {
    return { handled: false, replyText: '', fallthrough: true }
  }

  // Explicit cancel
  if (isCancelUtterance(t)) {
    const c = cancelActiveTask()
    return {
      handled: true,
      replyText: c ? `${c.label} 작업을 취소했어요.` : '취소할 작업이 없어요.',
      speak: true,
      task: null,
    }
  }

  // Switch: cancel travel + reminder request → fallthrough after cancel
  if (switchToReminder(t)) {
    cancelActiveTask()
    return { handled: false, replyText: '', fallthrough: true }
  }

  // Weather interrupt — suspend & fallthrough
  if (routed.intent === 'weather.query' || isClearWeatherQuery(t)) {
    if (getActiveTask()) suspendActiveForInterrupt()
    return { handled: false, replyText: '', fallthrough: true, interruptKind: 'weather' }
  }

  let active = getActiveTask()

  // Hotel add-on from travel context
  if (active && active.type.startsWith('travel') && wantsHotelAdd(t)) {
    active = startHotelFromTravel(active)
    return collectOrSearch(active, opts)
  }

  // Cross-actions on selection
  if (active && wantsCalendar(t)) {
    const action = planCrossAction(active, 'calendar.create', 'low_write')
    const result = await executePlannedAction(active, action, { allowWrite: true })
    active = saveTask({ ...active, plannedAction: action, lastActionResult: result, status: result.state })
    return { handled: true, replyText: result.message, speak: true, task: active }
  }
  if (active && wantsReminderFromTrip(t)) {
    const applied = applyFollowUpSlots(active, t)
    active = saveTask({ ...active, slots: applied.slots })
    const action = planCrossAction(active, 'reminder.create', 'low_write')
    const result = await executePlannedAction(active, action, { allowWrite: true })
    active = saveTask({ ...active, plannedAction: action, lastActionResult: result, status: result.state })
    return { handled: true, replyText: result.message, speak: true, task: active }
  }
  if (active && wantsNavigation(t)) {
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

  // Follow-ups on active session
  if (active && active.status !== 'cancelled' && (looksLikeFollowUp(t) || active.pendingQuestion || active.status === 'collecting' || active.status === 'needs_provider' || active.results.length)) {
    // Don't steal clear new domain intents
    if (
      routed.intent === 'todo.create' ||
      routed.intent.startsWith('reminder.') ||
      routed.intent.startsWith('calendar.')
    ) {
      return { handled: false, replyText: '', fallthrough: true }
    }
    if (routed.intent.startsWith('travel.') && active.type === 'restaurant.search') {
      /* new travel below */
    } else if (routed.intent.startsWith('restaurant.') && active.type.startsWith('travel')) {
      /* allow new restaurant */
    } else {
      const applied = applyFollowUpSlots(active, t)
      if (applied.note === '__cancel__') {
        cancelActiveTask()
        return { handled: true, replyText: '작업을 취소했어요.', speak: true, task: null }
      }
      let next: TaskSession = {
        ...active,
        slots: applied.slots,
        label: taskLabel(active.type, applied.slots),
      }
      if (applied.stale && next.results.length) next = markResultsStale(next)
      else next = saveTask(next)

      if (applied.selected) {
        next = saveTask({
          ...next,
          slots: { ...next.slots, selectedResultId: applied.selected.id },
        })
        return {
          handled: true,
          replyText: `${applied.selected.rank}번을 선택했어요: ${applied.selected.title}`,
          speak: true,
          task: next,
        }
      }
      return collectOrSearch(next, opts)
    }
  }

  // New travel / restaurant from router
  if (routed.intent.startsWith('travel.flight') || routed.intent === 'travel.plan' || routed.intent === 'travel.unknown') {
    if (/예약하는\s*방법|어떻게\s*예약|예약\s*방법/.test(t)) {
      return { handled: false, replyText: '', fallthrough: true }
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

  return { handled: false, replyText: '', fallthrough: true }
}

export function getActionAgentDiag(currentIntent = ''): ActionAgentDiag {
  const active = getActiveTask()
  const mode = getActiveMode()
  return {
    currentIntent,
    activeMode: mode,
    activeTask: active,
    suspendedCount: 0,
    collectedSlots: active ? Object.keys(active.slots).filter((k) => active.slots[k] != null && active.slots[k] !== '' && active.slots[k] !== 'unknown') : [],
    missingSlots: active ? computeMissingSlots(active) : [],
    plannedAction: active?.plannedAction?.kind || null,
    lastActionResult: active?.lastActionResult?.state || null,
  }
}

export function resetActionAgentForTests(): void {
  clearAllTasks()
}
