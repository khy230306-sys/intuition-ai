/**
 * Expected-slot resolver — pendingQuestion / expectedSlot beats generic extractors.
 */

import { extractAbsoluteMonthDaySlots, extractMultiSlots } from './multiSlotExtractor'
import { extractDateFromUtterance, resolveKoreanDate } from './dates'
import { normalizeTripType } from './tripTypeNormalize'
import type { SlotUpdateProposal } from './slotMerge'
import type { ResolvedDate, TaskSession, TaskSlots } from './types'

export type ExpectedResolveResult = {
  ok: boolean
  proposals: SlotUpdateProposal[]
  /** Soft error shown to user (e.g. return before departure) */
  validationError?: string
  /** Hard parse failure for the expected slot */
  parseFailed?: boolean
  normalizedInput?: string
  extractedPreview?: Record<string, unknown>
}

function parseSingleDate(text: string, now = new Date()): ResolvedDate | null {
  const abs = extractAbsoluteMonthDaySlots(text, now)
  // Prefer range → caller handles; for single answer use departureDate field as the parsed date
  if (abs.returnDate && abs.departureDate) {
    // Range in expected single-slot context: still return first for departure, both via multi
    return abs.departureDate
  }
  if (abs.departureDate) return abs.departureDate
  return extractDateFromUtterance(text, now) || resolveKoreanDate(text, now)
}

function parseDateRange(text: string, now = new Date()): { dep?: ResolvedDate; ret?: ResolvedDate } {
  const abs = extractAbsoluteMonthDaySlots(text, now)
  return { dep: abs.departureDate, ret: abs.returnDate }
}

function isExplicitDepartureCorrection(text: string): boolean {
  return /출발\s*(은|을|를|일)?\s*.*바꾸|출발\s*(날짜|일).*바꾸|출발은\s*.*로/.test(text)
}

function isExplicitReturnPhrase(text: string): boolean {
  return /오는\s*날|귀국|돌아오는\s*(날|날짜)|리턴|return/i.test(text)
}

/** Detect explicit corrections that outrank expectedSlot. */
export function extractExplicitCorrections(text: string, existing: TaskSlots): SlotUpdateProposal[] {
  const t = text.trim()
  const out: SlotUpdateProposal[] = []
  if (isExplicitDepartureCorrection(t)) {
    const d = parseSingleDate(t)
    if (d) {
      out.push({
        key: 'departureDate',
        value: d,
        source: 'explicit_correction',
        confidence: 1,
        explicit: true,
      })
    }
  }
  if (isExplicitReturnPhrase(t)) {
    const d = parseSingleDate(t)
    if (d) {
      out.push({
        key: 'returnDate',
        value: d,
        source: 'explicit_correction',
        confidence: 1,
        explicit: true,
      })
    }
  }
  // 「N명이 아니라 M명」
  const paxCorr = t.match(/(\d+)\s*명이\s*아니라\s*(\d+)\s*명/)
  if (paxCorr) {
    out.push({
      key: 'passengers',
      value: Number(paxCorr[2]),
      source: 'explicit_correction',
      confidence: 1,
      explicit: true,
    })
  }
  void existing
  return out
}

function validateReturnDate(
  ret: ResolvedDate,
  dep: ResolvedDate | null | undefined,
): string | null {
  if (!dep?.resolvedDate) return null
  if (ret.resolvedDate < dep.resolvedDate) {
    return '돌아오는 날짜가 출발일보다 빠릅니다. 돌아오는 날짜를 다시 알려주세요.'
  }
  return null
}

/**
 * Resolve user answer for the currently expected slot.
 * Does NOT clear pending — caller does that only on ok.
 */
export function resolveExpectedSlot(
  task: TaskSession,
  text: string,
  now = new Date(),
): ExpectedResolveResult {
  const expected = task.expectedSlot || task.pendingQuestion
  const t = text.trim()
  const proposals: SlotUpdateProposal[] = []
  const extractedPreview: Record<string, unknown> = {}

  if (!expected) {
    return { ok: false, proposals: [], parseFailed: false }
  }

  // Range always fills both when present (semantic multi)
  const range = parseDateRange(t, now)
  if (range.dep && range.ret && (expected === 'departureDate' || expected === 'returnDate')) {
    proposals.push({
      key: 'departureDate',
      value: range.dep,
      source: 'explicit_semantic',
      confidence: 0.95,
      expectedByQuestion: expected,
    })
    const verr = validateReturnDate(range.ret, range.dep)
    if (verr) {
      return {
        ok: false,
        proposals: [
          {
            key: 'departureDate',
            value: range.dep,
            source: 'explicit_semantic',
            confidence: 0.95,
            expectedByQuestion: expected,
          },
        ],
        validationError: verr,
        parseFailed: false,
        extractedPreview: { departureDate: range.dep, returnDate: range.ret },
      }
    }
    proposals.push({
      key: 'returnDate',
      value: range.ret,
      source: 'explicit_semantic',
      confidence: 0.95,
      expectedByQuestion: expected,
    })
    proposals.push({
      key: 'tripType',
      value: 'round_trip',
      source: 'explicit_semantic',
      confidence: 0.9,
    })
    extractedPreview.departureDate = range.dep.resolvedDate
    extractedPreview.returnDate = range.ret.resolvedDate
    return { ok: true, proposals, extractedPreview, normalizedInput: t }
  }

  if (expected === 'departureDate') {
    const d = parseSingleDate(t, now)
    if (!d) {
      return { ok: false, proposals: [], parseFailed: true, normalizedInput: t }
    }
    extractedPreview.date = d.resolvedDate
    proposals.push({
      key: 'departureDate',
      value: d,
      source: 'expected_question',
      confidence: 1,
      explicit: true,
      expectedByQuestion: 'departureDate',
    })
    return { ok: true, proposals, extractedPreview, normalizedInput: t }
  }

  if (expected === 'returnDate') {
    const d = parseSingleDate(t, now)
    if (!d) {
      return { ok: false, proposals: [], parseFailed: true, normalizedInput: t }
    }
    extractedPreview.date = d.resolvedDate
    const verr = validateReturnDate(d, task.slots.departureDate)
    if (verr) {
      return {
        ok: false,
        proposals: [],
        validationError: verr,
        parseFailed: false,
        extractedPreview,
        normalizedInput: t,
      }
    }
    // CRITICAL: apply ONLY returnDate — never departureDate
    proposals.push({
      key: 'returnDate',
      value: d,
      source: 'expected_question',
      confidence: 1,
      explicit: true,
      expectedByQuestion: 'returnDate',
    })
    return { ok: true, proposals, extractedPreview, normalizedInput: t }
  }

  if (expected === 'tripType') {
    const norm = normalizeTripType(t)
    if (!norm.tripType) {
      return {
        ok: false,
        proposals: [],
        parseFailed: true,
        normalizedInput: norm.normalizedInput,
      }
    }
    extractedPreview.tripType = norm.tripType
    proposals.push({
      key: 'tripType',
      value: norm.tripType,
      source: 'expected_question',
      confidence: 1,
      explicit: true,
      expectedByQuestion: 'tripType',
    })
    return {
      ok: true,
      proposals,
      extractedPreview,
      normalizedInput: norm.normalizedInput,
    }
  }

  if (expected === 'destination' || expected === 'origin' || expected === 'location') {
    const multi = extractMultiSlots(t, {
      pendingQuestion: expected,
      existing: task.slots,
      taskType: task.type,
    })
    const val =
      expected === 'destination'
        ? multi.destination
        : expected === 'origin'
          ? multi.origin
          : multi.location || multi.destination
    // Bare token fallback
    let resolved = val
    if (!resolved) {
      const m = t.match(/^([가-힣A-Za-z]{2,12})(으로|로|에서)?$/)
      if (m && !/명|월|일|편도|왕복|완복/.test(m[1])) resolved = m[1]
    }
    if (!resolved) {
      return { ok: false, proposals: [], parseFailed: true, normalizedInput: t }
    }
    extractedPreview[expected] = resolved
    proposals.push({
      key: expected,
      value: resolved,
      source: 'expected_question',
      confidence: 1,
      explicit: true,
      expectedByQuestion: expected,
    })
    return { ok: true, proposals, extractedPreview, normalizedInput: t }
  }

  if (expected === 'passengers' || expected === 'partySize') {
    const multi = extractMultiSlots(t, { pendingQuestion: expected, existing: task.slots })
    const pax = multi.passengers ?? multi.partySize
    if (pax == null) {
      return { ok: false, proposals: [], parseFailed: true, normalizedInput: t }
    }
    extractedPreview.passengers = pax
    proposals.push({
      key: expected === 'partySize' ? 'partySize' : 'passengers',
      value: pax,
      source: 'expected_question',
      confidence: 1,
      explicit: true,
      expectedByQuestion: expected,
    })
    if (expected === 'passengers') {
      /* ok */
    }
    return { ok: true, proposals, extractedPreview, normalizedInput: t }
  }

  // Unknown expected — fall through
  return { ok: false, proposals: [], parseFailed: false, normalizedInput: t }
}

/** Convert multi-slot extract into lower-priority proposals (never forces departure over return). */
export function multiSlotToProposals(
  text: string,
  task: TaskSession,
  now = new Date(),
): SlotUpdateProposal[] {
  const expected = task.expectedSlot || task.pendingQuestion
  const extracted = extractMultiSlots(text, {
    pendingQuestion: expected,
    existing: task.slots,
    taskType: task.type,
  })
  const out: SlotUpdateProposal[] = []

  // Date handling: if expected is returnDate, absolute single date must NOT become departureDate
  const abs = extractAbsoluteMonthDaySlots(text, now)
  if (abs.departureDate && abs.returnDate) {
    out.push({
      key: 'departureDate',
      value: abs.departureDate,
      source: 'multi_slot',
      confidence: 0.85,
    })
    out.push({
      key: 'returnDate',
      value: abs.returnDate,
      source: 'multi_slot',
      confidence: 0.85,
    })
    out.push({ key: 'tripType', value: 'round_trip', source: 'multi_slot', confidence: 0.8 })
  } else if (abs.departureDate) {
    if (expected === 'returnDate') {
      out.push({
        key: 'returnDate',
        value: abs.departureDate,
        source: 'multi_slot',
        confidence: 0.7,
        expectedByQuestion: 'returnDate',
      })
    } else if (expected === 'departureDate' || !task.slots.departureDate) {
      out.push({
        key: 'departureDate',
        value: abs.departureDate,
        source: 'multi_slot',
        confidence: 0.75,
      })
    }
    // If departure already set and not asking for date — do not propose departure overwrite
  }

  // Non-date fields from extractor (skip dates already handled)
  const skip = new Set(['departureDate', 'returnDate'])
  for (const [k, v] of Object.entries(extracted)) {
    if (skip.has(k)) continue
    if (v === undefined || v === null || v === '') continue
    // Trip type via normalize for aliases
    if (k === 'tripType') {
      const norm = normalizeTripType(text)
      if (norm.tripType) {
        out.push({ key: 'tripType', value: norm.tripType, source: 'multi_slot', confidence: 0.8 })
      }
      continue
    }
    out.push({ key: k, value: v, source: 'multi_slot', confidence: 0.7 })
  }

  // Also try trip type normalize even if extractor missed
  if (!out.some((p) => p.key === 'tripType')) {
    const norm = normalizeTripType(text)
    if (norm.tripType) {
      out.push({ key: 'tripType', value: norm.tripType, source: 'multi_slot', confidence: 0.75 })
    }
  }

  return out
}
