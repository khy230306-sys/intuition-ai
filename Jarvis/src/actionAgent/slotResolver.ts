/**
 * Follow-up slot application — delegates to Slot Resolution Engine.
 * Priority: user meaning > pending question > generic inference.
 */

import {
  DESTINATION_PLACES,
  extractMultiSlots,
  isActiveTaskFollowUpAction,
  ORIGIN_PLACES,
} from './multiSlotExtractor'
import { safeMergeSlots, type SlotUpdateProposal } from './slotMerge'
import { resolveSlotTurn } from './slotResolutionEngine'
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
  expectedFilled?: boolean
  parseFailed?: boolean
  validationError?: string
  normalizedInput?: string
  diag: SlotTurnDiag
  slotMeta: NonNullable<TaskSession['slotMeta']>
  resetTask?: boolean
  authoritativeUpdate?: boolean
  beforeSlots?: TaskSlots
}

export function applyFollowUpSlots(task: TaskSession, text: string): ApplySlotsResult {
  const engine = resolveSlotTurn(task, text)

  // Selection extras (results list)
  let selected: SearchResultItem | null = engine.selected || null
  const t = text.trim()
  const idx = parseSelectionIndex(t)
  const proposals: SlotUpdateProposal[] = []
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
  if (/그걸로|이걸로|그\s*호텔/.test(t) && task.results.length && !selected) {
    selected = task.results[0]
    if (selected) {
      proposals.push({
        key: 'selectedResultId',
        value: selected.id,
        source: 'explicit_semantic',
        confidence: 0.9,
      })
    }
  }

  let slots = engine.slots
  let slotMeta = engine.slotMeta
  let diag = engine.diag
  if (proposals.length) {
    const merged = safeMergeSlots(slots, slotMeta, proposals)
    slots = merged.slots
    slotMeta = merged.meta
    diag = {
      ...diag,
      appliedSlots: [...diag.appliedSlots, ...merged.diag.applied],
      rejectedSlotUpdates: [...diag.rejectedSlotUpdates, ...merged.diag.rejected],
    }
  }

  // Enrich diag for developer panel
  diag.extractedSlots = {
    ...diag.extractedSlots,
    _after: {
      departureDate: slots.departureDate?.resolvedDate,
      returnDate: slots.returnDate?.resolvedDate,
    },
  }

  return {
    slots,
    stale: engine.stale,
    selected,
    note: engine.note,
    expectedFilled: engine.expectedFilled,
    parseFailed: engine.parseFailed,
    validationError: engine.validationError,
    normalizedInput: engine.normalizedInput,
    diag,
    slotMeta,
    resetTask: engine.resetTask,
    authoritativeUpdate: engine.authoritativeUpdate,
    beforeSlots: engine.beforeSlots,
  }
}

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
  // Use engine against empty task for consistent semantics
  const empty = {
    id: 'tmp',
    type: 'travel.flight' as const,
    status: 'collecting' as const,
    slots: {} as TaskSlots,
    missingSlots: [],
    results: [],
    resultsStale: false,
    createdAt: '',
    updatedAt: '',
    label: '',
    pendingQuestion: null,
    expectedSlot: null,
  }
  return resolveSlotTurn(empty as TaskSession, text).slots
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
  // Also pull semantic dates into restaurant date slot
  const eng = resolveSlotTurn(
    {
      id: 'tmp',
      type: 'restaurant.search',
      status: 'collecting',
      slots,
      missingSlots: [],
      results: [],
      resultsStale: false,
      createdAt: '',
      updatedAt: '',
      label: '',
    } as TaskSession,
    t,
  )
  if (eng.slots.departureDate && !slots.date) slots.date = eng.slots.departureDate
  return slots
}
