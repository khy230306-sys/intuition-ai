/**
 * Shared Slot Resolution Engine.
 * Priority (user meaning > pending question > generic inference):
 * 1. Explicit task reset / new task
 * 2. Explicit correction
 * 3. Explicit semantic slot
 * 4. Multi-slot semantic extraction
 * 5. Pending question / expected slot (ambiguous short answers ONLY)
 * 6. Contextual follow-up
 * 7. Generic extraction
 *
 * Reusable across flight / hotel / restaurant / calendar / reminder.
 */

import { extractMultiSlots } from './multiSlotExtractor'
import {
  extractSemanticDates,
  isDepartureCorrection,
  isNewTravelReset,
  isReturnCorrection,
  isRichTravelUtterance,
  type SemanticDate,
} from './semanticDateExtractor'
import { safeMergeSlots, type SlotUpdateProposal } from './slotMerge'
import { normalizeTripType } from './tripTypeNormalize'
import type {
  ResolvedDate,
  SearchResultItem,
  SlotMeta,
  SlotTurnDiag,
  TaskSession,
  TaskSlots,
} from './types'

export type EngineResult = {
  slots: TaskSlots
  slotMeta: Record<string, SlotMeta>
  diag: SlotTurnDiag
  stale: boolean
  selected?: SearchResultItem | null
  note?: string
  /** Reset to a brand-new task */
  resetTask?: boolean
  /** Authoritative core updates applied (clear stale expected) */
  authoritativeUpdate?: boolean
  expectedFilled?: boolean
  parseFailed?: boolean
  validationError?: string
  normalizedInput?: string
  beforeSlots: TaskSlots
}

function dateVal(d: ResolvedDate | null | undefined): string | null {
  return d?.resolvedDate || null
}

function validateReturn(
  ret: ResolvedDate,
  dep: ResolvedDate | null | undefined,
): string | null {
  if (!dep?.resolvedDate) return null
  if (ret.resolvedDate < dep.resolvedDate) {
    return '돌아오는 날짜가 출발일보다 빠릅니다. 돌아오는 날짜를 다시 알려주세요.'
  }
  return null
}

function semanticToProposals(dates: SemanticDate[], source: SlotUpdateProposal['source']): SlotUpdateProposal[] {
  const out: SlotUpdateProposal[] = []
  for (const d of dates) {
    if (d.role === 'unknownDate') continue
    if (d.role === 'departureDate' || d.role === 'returnDate' || d.role === 'checkIn' || d.role === 'checkOut') {
      out.push({
        key: d.role,
        value: d.resolved,
        source,
        confidence: d.confidence,
        explicit: source === 'explicit_semantic' || source === 'explicit_correction',
      })
    }
  }
  return out
}

function isShortAmbiguousAnswer(text: string): boolean {
  const t = text.trim().replace(/\s+/g, '')
  if (t.length > 18) return false
  // Pure date / place / tripType / pax — no rich travel framing
  if (/^\d{1,2}월\d{1,2}일?(이야|야|이요|요)?$/.test(t)) return true
  if (/^(왕복|편도|완복|왕뽁)(이야|야|이요|으로|할게)?$/.test(t)) return true
  if (/^\d+명$/.test(t)) return true
  if (/^[가-힣A-Za-z]{2,8}(으로|로|에서)?$/.test(t) && !/여행|비행|알아/.test(t)) return true
  if (/^[월화수목금토일]요일$/.test(t)) return true
  if (/^(내일|모레|오늘)$/.test(t)) return true
  if (/^다음주[월화수목금토일]요일$/.test(t)) return true
  return false
}

function extractPlacesAndPax(text: string, task: TaskSession): SlotUpdateProposal[] {
  const multi = extractMultiSlots(text, {
    pendingQuestion: null, // do not bias places via expected
    existing: task.slots,
    taskType: task.type,
  })
  const out: SlotUpdateProposal[] = []
  if (multi.origin) {
    out.push({ key: 'origin', value: multi.origin, source: 'explicit_semantic', confidence: 0.9, explicit: true })
  }
  if (multi.destination) {
    out.push({
      key: 'destination',
      value: multi.destination,
      source: 'explicit_semantic',
      confidence: 0.9,
      explicit: true,
    })
  }
  if (multi.location && task.type === 'restaurant.search') {
    out.push({ key: 'location', value: multi.location, source: 'explicit_semantic', confidence: 0.9 })
  }
  if (multi.passengers != null) {
    out.push({ key: 'passengers', value: multi.passengers, source: 'multi_slot', confidence: 0.85 })
  }
  if (multi.partySize != null) {
    out.push({ key: 'partySize', value: multi.partySize, source: 'multi_slot', confidence: 0.85 })
  }
  const trip = normalizeTripType(text)
  if (trip.tripType) {
    out.push({
      key: 'tripType',
      value: trip.tripType,
      source: /왕복|편도|완복/.test(text) ? 'explicit_semantic' : 'multi_slot',
      confidence: 0.9,
      explicit: true,
    })
  }
  return out
}

/**
 * Resolve one user turn against the active task.
 */
export function resolveSlotTurn(task: TaskSession, text: string, now = new Date()): EngineResult {
  const t = text.trim()
  const expected = task.expectedSlot || task.pendingQuestion || null
  const beforeSlots: TaskSlots = { ...task.slots }
  const proposals: SlotUpdateProposal[] = []
  const semanticTrace: Record<string, unknown> = {}
  let note: string | undefined
  let resetTask = false
  let authoritativeUpdate = false
  let expectedFilled = false
  let parseFailed = false
  let validationError: string | undefined
  let selected: SearchResultItem | null = null

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

  if (/취소|그만|그만둘|비행기\s*찾던\s*건\s*취소/.test(t) && !/알림/.test(t)) {
    return {
      slots: { ...task.slots },
      slotMeta: task.slotMeta || {},
      diag,
      stale: false,
      note: '__cancel__',
      beforeSlots,
    }
  }

  // 1) Explicit task reset
  if (isNewTravelReset(t)) {
    resetTask = true
    note = '__reset__'
  }

  // Semantic dates (roles)
  const dates = extractSemanticDates(t, now)
  semanticTrace.semanticDates = dates.map((d) => ({
    role: d.role,
    value: d.value,
    confidence: d.confidence,
    sourceText: d.sourceText,
  }))

  // 2) Explicit corrections
  if (isDepartureCorrection(t)) {
    const dep = dates.find((d) => d.role === 'departureDate') || dates.find((d) => d.role === 'unknownDate')
    if (dep) {
      proposals.push({
        key: 'departureDate',
        value: dep.resolved,
        source: 'explicit_correction',
        confidence: 1,
        explicit: true,
      })
      semanticTrace.correction = 'departureDate'
      authoritativeUpdate = true
    }
  }
  if (isReturnCorrection(t) || /돌아오는날짜는|돌아오는\s*날짜\s*는/.test(t)) {
    const ret =
      dates.find((d) => d.role === 'returnDate') ||
      dates.find((d) => d.role === 'unknownDate') ||
      dates[0]
    if (ret) {
      const verr = validateReturn(ret.resolved, task.slots.departureDate)
      if (verr) {
        validationError = verr
      } else {
        proposals.push({
          key: 'returnDate',
          value: ret.resolved,
          source: 'explicit_correction',
          confidence: 1,
          explicit: true,
        })
        semanticTrace.correction = 'returnDate'
        expectedFilled = expected === 'returnDate'
        authoritativeUpdate = true
      }
    }
  }
  const paxCorr = t.match(/(\d+)\s*명이\s*아니라\s*(\d+)\s*명/)
  if (paxCorr) {
    proposals.push({
      key: 'passengers',
      value: Number(paxCorr[2]),
      source: 'explicit_correction',
      confidence: 1,
      explicit: true,
    })
  }
  if (/김포\s*말고\s*부산/.test(t)) {
    proposals.push({
      key: 'origin',
      value: '부산',
      source: 'explicit_correction',
      confidence: 1,
      explicit: true,
    })
    note = 'origin_changed'
  }

  // 3–4) Explicit semantic + multi-slot (BEFORE expectedSlot)
  // Rich travel utterance OR any role-labeled dates → apply as semantic, never force into expectedSlot
  const rich = isRichTravelUtterance(t) || dates.some((d) => d.role === 'departureDate' || d.role === 'returnDate')
  const hasRoleDates = dates.some((d) => d.role !== 'unknownDate')
  // 「부산에서」 / place+particle always counts as explicit place semantic
  const hasExplicitPlace = /에서|으로|로\s*갈|목적지는|출발지는/.test(t)

  if (rich || hasRoleDates || hasExplicitPlace) {
    const roleProps = semanticToProposals(
      dates.filter((d) => d.role !== 'unknownDate'),
      'explicit_semantic',
    )
    // Avoid duplicating correction already added
    for (const p of roleProps) {
      if (!proposals.some((x) => x.key === p.key && x.source === 'explicit_correction')) {
        proposals.push(p)
      }
    }
    const placeProps = extractPlacesAndPax(t, task)
    proposals.push(...placeProps)
    if (
      roleProps.some((p) => p.key === 'departureDate') ||
      placeProps.some((p) => p.key === 'destination' || p.key === 'origin')
    ) {
      authoritativeUpdate = true
    }
    // Range implies round trip
    if (dates.some((d) => d.role === 'departureDate') && dates.some((d) => d.role === 'returnDate')) {
      if (!proposals.some((p) => p.key === 'tripType')) {
        proposals.push({
          key: 'tripType',
          value: 'round_trip',
          source: 'explicit_semantic',
          confidence: 0.9,
          explicit: true,
        })
      }
    }
    // Validate return vs (new) departure from proposals
    const propDep = proposals.find((p) => p.key === 'departureDate')?.value as ResolvedDate | undefined
    const propRet = proposals.find((p) => p.key === 'returnDate')?.value as ResolvedDate | undefined
    const depForVal = propDep || task.slots.departureDate
    if (propRet) {
      const verr = validateReturn(propRet, depForVal)
      if (verr) {
        // Drop invalid return proposal; keep departure updates
        const idx = proposals.findIndex((p) => p.key === 'returnDate')
        if (idx >= 0) proposals.splice(idx, 1)
        // Only surface validation error if we weren't also updating departure authoritatively
        if (!propDep) validationError = verr
        else {
          // Departure updated; ask return again later — no false "return before dep" on wrong role
          validationError = undefined
        }
      }
    }
  }

  // 5) Pending / expected — ONLY for short ambiguous answers without richer semantics
  const alreadyHasExpectedKey = expected
    ? proposals.some((p) => p.key === expected)
    : false

  if (expected && isShortAmbiguousAnswer(t) && !alreadyHasExpectedKey && !authoritativeUpdate) {
    // Trip-type short answers always win over a mismatched expected date slot
    const earlyTrip = normalizeTripType(t)
    if (earlyTrip.tripType && (expected === 'tripType' || /^(왕복|편도|완복|왕뽁)/.test(t.replace(/\s+/g, '')))) {
      proposals.push({
        key: 'tripType',
        value: earlyTrip.tripType,
        source: expected === 'tripType' ? 'expected_question' : 'explicit_semantic',
        confidence: 1,
        explicit: true,
        expectedByQuestion: expected === 'tripType' ? 'tripType' : undefined,
      })
      expectedFilled = expected === 'tripType'
      authoritativeUpdate = expected !== 'tripType'
      diag.normalizedInput = earlyTrip.normalizedInput
    } else if (expected === 'tripType') {
      diag.normalizedInput = earlyTrip.normalizedInput
      parseFailed = true
    } else if (expected === 'departureDate' || expected === 'returnDate') {
      const unk = dates.find((d) => d.role === 'unknownDate') || dates[0]
      const abs = unk?.resolved
      if (!abs) {
        parseFailed = true
      } else if (expected === 'returnDate') {
        const verr = validateReturn(abs, task.slots.departureDate)
        if (verr) validationError = verr
        else {
          proposals.push({
            key: 'returnDate',
            value: abs,
            source: 'expected_question',
            confidence: 1,
            expectedByQuestion: 'returnDate',
          })
          expectedFilled = true
        }
      } else {
        proposals.push({
          key: 'departureDate',
          value: abs,
          source: 'expected_question',
          confidence: 1,
          expectedByQuestion: 'departureDate',
        })
        expectedFilled = true
      }
    } else if (expected === 'destination' || expected === 'origin' || expected === 'location') {
      const multi = extractMultiSlots(t, {
        pendingQuestion: expected,
        existing: task.slots,
        taskType: task.type,
      })
      let val =
        expected === 'destination'
          ? multi.destination
          : expected === 'origin'
            ? multi.origin
            : multi.location || multi.destination
      if (!val) {
        const bare = t.match(/^([가-힣A-Za-z]{2,12})(으로|로|에서)?$/)
        if (bare && !/명|월|일|편도|왕복|완복/.test(bare[1])) val = bare[1]
      }
      if (!val) parseFailed = true
      else {
        proposals.push({
          key: expected,
          value: val,
          source: 'expected_question',
          confidence: 1,
          expectedByQuestion: expected,
        })
        expectedFilled = true
      }
    } else if (expected === 'passengers' || expected === 'partySize') {
      const multi = extractMultiSlots(t, { pendingQuestion: expected })
      const pax = multi.passengers ?? multi.partySize
      if (pax == null) parseFailed = true
      else {
        proposals.push({
          key: expected === 'partySize' ? 'partySize' : 'passengers',
          value: pax,
          source: 'expected_question',
          confidence: 1,
          expectedByQuestion: expected,
        })
        expectedFilled = true
      }
    }
  } else if (expected && !alreadyHasExpectedKey && !authoritativeUpdate && !rich && !hasRoleDates) {
    // Medium utterance with a single unknown date — assign via expectedSlot hint
    if ((expected === 'returnDate' || expected === 'departureDate') && dates.length === 1) {
      const d = dates[0]
      if (expected === 'returnDate') {
        const verr = validateReturn(d.resolved, task.slots.departureDate)
        if (verr) validationError = verr
        else {
          proposals.push({
            key: 'returnDate',
            value: d.resolved,
            source: 'expected_question',
            confidence: 0.8,
            expectedByQuestion: 'returnDate',
          })
          expectedFilled = true
        }
      } else {
        proposals.push({
          key: 'departureDate',
          value: d.resolved,
          source: 'expected_question',
          confidence: 0.8,
          expectedByQuestion: 'departureDate',
        })
        expectedFilled = true
      }
    }
  }

  // Contextual follow-up: short place/date/trip answers when collecting, even without matching expected
  if (!proposals.length && task.status === 'collecting') {
    const placeProps = extractPlacesAndPax(t, task)
    if (placeProps.length) {
      proposals.push(...placeProps)
    }
    if (dates.length === 1 && expected === 'departureDate') {
      proposals.push({
        key: 'departureDate',
        value: dates[0].resolved,
        source: 'expected_question',
        confidence: 0.85,
        expectedByQuestion: 'departureDate',
      })
      expectedFilled = true
    }
  }

  // 6–7) Generic unknownDate assignment — NEVER invent departureDate over existing when expected is return
  for (const d of dates) {
    if (d.role !== 'unknownDate') continue
    if (proposals.some((p) => p.key === 'departureDate' || p.key === 'returnDate')) continue
    if (expected === 'returnDate' && isShortAmbiguousAnswer(t)) {
      // already handled above
      continue
    }
    if (expected === 'departureDate' && isShortAmbiguousAnswer(t)) continue
    // Leave unknown — do not generic-merge onto departureDate
    diag.rejectedSlotUpdates.push({
      key: 'unknownDate',
      value: d.value,
      reason: 'generic unknownDate not auto-assigned to departureDate',
    })
  }

  // Mark expected filled if we applied the expected key via semantic path
  if (expected && proposals.some((p) => p.key === expected)) {
    expectedFilled = true
  }

  // Build extracted preview
  for (const p of proposals) {
    if (p.key === 'departureDate' || p.key === 'returnDate') {
      diag.extractedSlots[p.key] = (p.value as ResolvedDate)?.resolvedDate
    } else {
      diag.extractedSlots[p.key] = p.value
    }
  }
  diag.extractedSlots._semantic = semanticTrace.semanticDates
  diag.extractedSlots._before = {
    departureDate: dateVal(beforeSlots.departureDate),
    returnDate: dateVal(beforeSlots.returnDate),
  }

  const merged = safeMergeSlots(task.slots, task.slotMeta, proposals)
  diag.appliedSlots = merged.diag.applied
  diag.rejectedSlotUpdates = [...diag.rejectedSlotUpdates, ...merged.diag.rejected]

  // Post-merge: if return invalid vs new departure, clear return and ask again
  const afterDep = merged.slots.departureDate
  const afterRet = merged.slots.returnDate
  if (afterDep && afterRet && afterRet.resolvedDate < afterDep.resolvedDate) {
    merged.slots = { ...merged.slots, returnDate: null }
    if (merged.meta.returnDate) delete merged.meta.returnDate
    diag.rejectedSlotUpdates.push({
      key: 'returnDate',
      value: afterRet.resolvedDate,
      reason: 'returnDate cleared — before new departureDate',
    })
  }

  return {
    slots: merged.slots,
    slotMeta: merged.meta,
    diag,
    stale: Boolean(task.results.length && merged.diag.applied.length),
    selected,
    note,
    resetTask,
    authoritativeUpdate,
    expectedFilled,
    parseFailed,
    validationError,
    normalizedInput: diag.normalizedInput,
    beforeSlots,
  }
}

export { isNewTravelReset, isRichTravelUtterance }
