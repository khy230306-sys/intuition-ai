/**
 * Map short follow-up utterances onto the active Task Session slots.
 * Delegates multi-slot parsing to shared extractor (travel/hotel/restaurant/…).
 */

import { extractDateFromUtterance, resolveKoreanDate } from './dates'
import {
  DESTINATION_PLACES,
  extractMultiSlots,
  isActiveTaskFollowUpAction,
  mergeExtractedSlots,
  ORIGIN_PLACES,
} from './multiSlotExtractor'
import type { SearchResultItem, TaskSession, TaskSlots } from './types'

const ORIGIN_MAP = ORIGIN_PLACES

export function looksLikeFollowUp(text: string): boolean {
  const t = text.trim()
  if (!t || t.length > 80) return false
  if (isActiveTaskFollowUpAction(t)) return true
  // Absolute dates / place answers
  if (/\d{1,2}\s*월\s*\d{1,2}/.test(t)) return true
  if (Object.keys(DESTINATION_PLACES).some((k) => t.replace(/\s+/g, '').includes(k))) return true
  return (
    /^(오전|오후|저녁|아침)\s*걸로?$/.test(t) ||
    /^(왕복|편도)$/.test(t) ||
    /^\d+\s*명/.test(t) ||
    /^(두\s*번째|세\s*번째|첫\s*번째|가운데|\d+\s*번)/.test(t) ||
    /^(그걸로|이걸로|그\s*호텔|그거)/.test(t) ||
    /^(근처로|조용한\s*곳|조금\s*싼\s*곳)$/.test(t) ||
    /호텔도|렌터카도/.test(t) ||
    /일정에\s*넣|알림도|출발\s*.*전에\s*알려/.test(t) ||
    /^(김포|인천|부산|서울|제주|김해)(에서|로)?$/.test(t) ||
    /^[월화수목금토일]요일$/.test(t) ||
    /까지$/.test(t) ||
    /^\d+만\s*원/.test(t) ||
    /^가격대/.test(t) ||
    Object.keys(ORIGIN_MAP).some((k) => t === k || t === `${k}에서`)
  )
}

export function parseSelectionIndex(text: string): number | null {
  const t = text.trim()
  if (/첫\s*번째|1\s*번|^1$/.test(t)) return 1
  if (/두\s*번째|2\s*번|가운데|^2$/.test(t)) return 2
  if (/세\s*번째|3\s*번|^3$/.test(t)) return 3
  if (/네\s*번째|4\s*번|^4$/.test(t)) return 4
  if (/다섯\s*번째|5\s*번|^5$/.test(t)) return 5
  const m = t.match(/(\d+)\s*번/)
  if (m) return Number(m[1])
  return null
}

export function applyFollowUpSlots(
  task: TaskSession,
  text: string,
): { slots: TaskSlots; stale: boolean; selected?: SearchResultItem | null; note?: string } {
  const t = text.trim()
  let slots: TaskSlots = { ...task.slots }
  let stale = false
  let selected: SearchResultItem | null = null
  let note: string | undefined

  // Corrections / cancel
  if (/취소|그만|그만둘|비행기\s*찾던\s*건\s*취소/.test(t) && !/알림/.test(t)) {
    return { slots, stale, note: '__cancel__' }
  }
  if (/김포\s*말고\s*부산|부산에서/.test(t) && /부산/.test(t)) {
    slots.origin = '부산'
    stale = true
    note = 'origin_changed'
  }
  if (/날짜를\s*토요일로|토요일로\s*바꿔/.test(t)) {
    const d = resolveKoreanDate('토요일')
    if (d) {
      slots.departureDate = d
      stale = true
    }
  }
  if (/(\d+)\s*명이\s*아니라\s*(\d+)\s*명/.test(t)) {
    const m = t.match(/(\d+)\s*명이\s*아니라\s*(\d+)\s*명/)
    if (m) {
      slots.passengers = Number(m[2])
      stale = true
    }
  }
  if (/호텔은\s*빼|호텔\s*빼/.test(t)) {
    note = 'drop_hotel'
  }

  // Core: extract ALL slots from this utterance (pending-aware)
  const extracted = extractMultiSlots(t, {
    pendingQuestion: task.pendingQuestion,
    existing: slots,
    taskType: task.type,
  })
  const before = JSON.stringify({
    o: slots.origin,
    d: slots.destination,
    dep: slots.departureDate?.resolvedDate,
    ret: slots.returnDate?.resolvedDate,
    p: slots.passengers,
  })
  slots = mergeExtractedSlots(slots, extracted)
  const after = JSON.stringify({
    o: slots.origin,
    d: slots.destination,
    dep: slots.departureDate?.resolvedDate,
    ret: slots.returnDate?.resolvedDate,
    p: slots.passengers,
  })
  if (before !== after) stale = Boolean(task.results.length) || stale

  // Legacy relative 「까지」 / weekday when extractor missed return date
  if (/까지$/.test(t) || /^[월화수목금토일]요일$/.test(t)) {
    const d = extractDateFromUtterance(t) || resolveKoreanDate(t)
    if (d) {
      if (task.pendingQuestion === 'returnDate' || slots.tripType === 'round_trip') {
        if (!slots.returnDate || task.pendingQuestion === 'returnDate') slots.returnDate = d
        else if (!slots.departureDate) slots.departureDate = d
      } else if (!slots.departureDate) {
        slots.departureDate = d
      }
      stale = Boolean(task.results.length) || stale
    }
  }

  // Budget
  const budget = t.match(/(\d+)\s*만\s*원/)
  if (budget) slots.budgetMax = Number(budget[1]) * 10000
  if (/1박\s*(\d+)\s*만/.test(t)) {
    const m = t.match(/1박\s*(\d+)\s*만/)
    if (m) slots.budgetMax = Number(m[1]) * 10000
  }

  // Preferences
  if (/근처로/.test(t)) slots.preference = 'nearby'
  if (/조용한\s*곳/.test(t)) slots.preference = 'quiet'
  if (/조금\s*싼\s*곳|싼\s*곳/.test(t)) slots.preference = 'cheap'

  // Selection
  const idx = parseSelectionIndex(t)
  if (idx != null && task.results.length) {
    const hit = task.results.find((r) => r.rank === idx) || task.results[idx - 1]
    if (hit && !hit.stale) {
      selected = hit
      slots.selectedResultId = hit.id
    }
  }
  if (/그걸로|이걸로|그\s*호텔|아까\s*두\s*번째/.test(t) && task.results.length) {
    if (/두\s*번째/.test(t)) {
      selected = task.results.find((r) => r.rank === 2) || null
    } else if (slots.selectedResultId) {
      selected = task.results.find((r) => r.id === slots.selectedResultId) || null
    } else {
      selected = task.results[0]
    }
    if (selected) slots.selectedResultId = selected.id
  }

  // Reminder offset
  const rem = t.match(/(\d+)\s*시간\s*전/) || t.match(/출발\s*두\s*시간\s*전|두\s*시간\s*전/)
  if (rem) {
    if (/두\s*시간|2\s*시간/.test(t)) slots.reminderOffsetMinutes = 120
    else if (rem[1]) slots.reminderOffsetMinutes = Number(rem[1]) * 60
  }
  if (/알림도|알려줘/.test(t) && /전/.test(t)) {
    slots.reminderOffsetMinutes = slots.reminderOffsetMinutes || 120
  }

  return { slots, stale, selected, note }
}

export function extractInitialTravelSlots(text: string): TaskSlots {
  return extractMultiSlots(text, { taskType: 'travel.flight' })
}

export function extractRestaurantSlots(text: string): TaskSlots {
  const t = text.trim()
  const slots = extractMultiSlots(t, { taskType: 'restaurant.search', pendingQuestion: 'location' })
  // Extra local places / categories not in travel destination map
  const places = ['울산', '수원', '지리산', '삼산', '해운대', '강남', '홍대']
  for (const p of places) {
    if (t.includes(p) && !slots.location) {
      slots.location = p
      break
    }
  }
  if (/근처/.test(t) && !slots.location) slots.location = '근처'
  if (/고기집|고기/.test(t)) slots.category = '고기집'
  if (/이탈리안|파스타/.test(t)) slots.category = '이탈리안'
  if (/카페/.test(t)) slots.category = '카페'
  if (/한식/.test(t)) slots.category = '한식'
  if (/가족/.test(t)) slots.preference = 'family'
  if (/저녁/.test(t)) slots.time = 'evening'
  if (/점심/.test(t)) slots.time = 'lunch'
  if (slots.destination && !slots.location) slots.location = slots.destination
  if (slots.passengers && !slots.partySize) slots.partySize = slots.passengers
  return slots
}
