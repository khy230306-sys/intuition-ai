/**
 * Map follow-up utterances onto active Task Session slots.
 * Priority: explicit correction → expectedSlot → multi-slot → generic.
 */

import {
  extractExplicitCorrections,
  multiSlotToProposals,
  resolveExpectedSlot,
} from './expectedSlotResolver'
import {
  DESTINATION_PLACES,
  isActiveTaskFollowUpAction,
  ORIGIN_PLACES,
} from './multiSlotExtractor'
import { extractMultiSlots } from './multiSlotExtractor'
import { safeMergeSlots, type SlotUpdateProposal } from './slotMerge'
import { normalizeTripType } from './tripTypeNormalize'
import type { SearchResultItem, SlotTurnDiag, TaskSession, TaskSlots } from './types'

const ORIGIN_MAP = ORIGIN_PLACES

export function looksLikeFollowUp(text: string): boolean {
  const t = text.trim()
  if (!t || t.length > 80) return false
  if (isActiveTaskFollowUpAction(t)) return true
  if (/\d{1,2}\s*월\s*\d{1,2}/.test(t)) return true
  if (normalizeTripType(t).tripType) return true
  if (Object.keys(DESTINATION_PLACES).some((k) => t.replace(/\s+/g, '').includes(k))) return true
  return (
    /^(오전|오후|저녁|아침)\s*걸로?$/.test(t) ||
    /^(왕복|편도|완복)$/.test(t) ||
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

export type ApplySlotsResult = {
  slots: TaskSlots
  stale: boolean
  selected?: SearchResultItem | null
  note?: string
  /** true when expected slot was answered successfully */
  expectedFilled?: boolean
  /** expected slot parse failed — keep pending */
  parseFailed?: boolean
  validationError?: string
  normalizedInput?: string
  diag: SlotTurnDiag
  slotMeta: NonNullable<TaskSession['slotMeta']>
}

export function applyFollowUpSlots(task: TaskSession, text: string): ApplySlotsResult {
  const t = text.trim()
  const expected = task.expectedSlot || task.pendingQuestion || null
  let stale = false
  let selected: SearchResultItem | null = null
  let note: string | undefined
  const proposals: SlotUpdateProposal[] = []

  const diag: SlotTurnDiag = {
    expectedSlot: expected,
    pendingQuestion: task.pendingQuestion || null,
    rawInput: t,
    normalizedInput: t,
    extractedSlots: {},
    appliedSlots: [],
    rejectedSlotUpdates: [],
    missingSlots: [],
    nextQuestion: null,
  }

  // Cancel
  if (/취소|그만|그만둘|비행기\s*찾던\s*건\s*취소/.test(t) && !/알림/.test(t)) {
    return {
      slots: { ...task.slots },
      stale: false,
      note: '__cancel__',
      diag,
      slotMeta: task.slotMeta || {},
    }
  }

  // 1) Explicit corrections (highest priority)
  const corrections = extractExplicitCorrections(t, task.slots)
  proposals.push(...corrections)
  if (/김포\s*말고\s*부산/.test(t) && /부산/.test(t)) {
    proposals.push({
      key: 'origin',
      value: '부산',
      source: 'explicit_correction',
      confidence: 1,
      explicit: true,
    })
    note = 'origin_changed'
  }
  if (/호텔은\s*빼|호텔\s*빼/.test(t)) note = 'drop_hotel'

  // 2) Expected slot resolver (beats generic multi-slot date routing)
  let expectedFilled = false
  let parseFailed = false
  let validationError: string | undefined

  if (expected) {
    const resolved = resolveExpectedSlot(task, t)
    diag.normalizedInput = resolved.normalizedInput || t
    if (resolved.extractedPreview) {
      diag.extractedSlots = { ...diag.extractedSlots, ...resolved.extractedPreview }
    }
    if (resolved.validationError) {
      validationError = resolved.validationError
      // Keep pending — do not apply invalid return date; may still apply other corrections
    } else if (resolved.ok && resolved.proposals.length) {
      proposals.push(...resolved.proposals)
      expectedFilled = true
    } else if (resolved.parseFailed) {
      parseFailed = true
    }
  }

  // 3–4) Multi-slot / semantic extras (lower priority — safeMerge protects committed slots)
  // Skip multi-slot date proposals when we already filled expected date successfully,
  // or when parse/validation failed for expected date (avoid overwrite).
  const skipMultiDates =
    (expected === 'returnDate' || expected === 'departureDate') &&
    (expectedFilled || parseFailed || Boolean(validationError))

  if (!parseFailed || !expected) {
    const multi = multiSlotToProposals(t, task)
    for (const p of multi) {
      if (skipMultiDates && (p.key === 'departureDate' || p.key === 'returnDate')) continue
      // When expected filled tripType, don't let weaker multi overwrite — safeMerge handles it
      proposals.push(p)
    }
  }

  // Selection / prefs / budget (non-protected extras)
  const budget = t.match(/(\d+)\s*만\s*원/)
  if (budget) {
    proposals.push({
      key: 'budgetMax',
      value: Number(budget[1]) * 10000,
      source: 'multi_slot',
      confidence: 0.6,
    })
  }
  if (/근처로/.test(t)) {
    proposals.push({ key: 'preference', value: 'nearby', source: 'multi_slot', confidence: 0.6 })
  }
  if (/조용한\s*곳/.test(t)) {
    proposals.push({ key: 'preference', value: 'quiet', source: 'multi_slot', confidence: 0.6 })
  }
  if (/조금\s*싼\s*곳|싼\s*곳/.test(t)) {
    proposals.push({ key: 'preference', value: 'cheap', source: 'multi_slot', confidence: 0.6 })
  }

  const idx = parseSelectionIndex(t)
  if (idx != null && task.results.length) {
    const hit = task.results.find((r) => r.rank === idx) || task.results[idx - 1]
    if (hit && !hit.stale) {
      selected = hit
      proposals.push({
        key: 'selectedResultId',
        value: hit.id,
        source: 'explicit_semantic',
        confidence: 1,
        explicit: true,
      })
    }
  }
  if (/그걸로|이걸로|그\s*호텔|아까\s*두\s*번째/.test(t) && task.results.length) {
    if (/두\s*번째/.test(t)) selected = task.results.find((r) => r.rank === 2) || null
    else if (task.slots.selectedResultId) {
      selected = task.results.find((r) => r.id === task.slots.selectedResultId) || null
    } else selected = task.results[0]
    if (selected) {
      proposals.push({
        key: 'selectedResultId',
        value: selected.id,
        source: 'explicit_semantic',
        confidence: 0.9,
      })
    }
  }

  const rem = t.match(/(\d+)\s*시간\s*전/) || t.match(/출발\s*두\s*시간\s*전|두\s*시간\s*전/)
  if (rem) {
    const mins = /두\s*시간|2\s*시간/.test(t) ? 120 : rem[1] ? Number(rem[1]) * 60 : 120
    proposals.push({
      key: 'reminderOffsetMinutes',
      value: mins,
      source: 'multi_slot',
      confidence: 0.7,
    })
  }

  const merged = safeMergeSlots(task.slots, task.slotMeta, proposals)
  diag.appliedSlots = merged.diag.applied
  diag.rejectedSlotUpdates = merged.diag.rejected
  if (merged.diag.applied.length) stale = Boolean(task.results.length)

  // Build extracted preview for diagnostics
  for (const p of proposals) {
    if (p.key === 'departureDate' || p.key === 'returnDate') {
      const d = p.value as { resolvedDate?: string }
      diag.extractedSlots[p.key] = d?.resolvedDate || p.value
    } else if (!(p.key in diag.extractedSlots)) {
      diag.extractedSlots[p.key] = p.value
    }
  }

  return {
    slots: merged.slots,
    stale,
    selected,
    note,
    expectedFilled,
    parseFailed,
    validationError,
    normalizedInput: diag.normalizedInput,
    diag,
    slotMeta: merged.meta,
  }
}

/** @deprecated use extractMultiSlots — kept for callers */
export function mergeExtractedSlots(existing: TaskSlots, extracted: TaskSlots): TaskSlots {
  const proposals: SlotUpdateProposal[] = Object.entries(extracted)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => ({
      key,
      value,
      source: 'multi_slot' as const,
      confidence: 0.7,
    }))
  return safeMergeSlots(existing, undefined, proposals).slots
}

export function extractInitialTravelSlots(text: string): TaskSlots {
  // Initial utterance: allow full multi-slot (no expected yet)
  const extracted = extractMultiSlots(text, { taskType: 'travel.flight' })
  const norm = normalizeTripType(text)
  if (norm.tripType) extracted.tripType = norm.tripType
  return extracted
}

export function extractRestaurantSlots(text: string): TaskSlots {
  const t = text.trim()
  const slots = extractMultiSlots(t, { taskType: 'restaurant.search', pendingQuestion: 'location' })
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
