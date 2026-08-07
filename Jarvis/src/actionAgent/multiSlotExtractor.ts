/**
 * Shared multi-slot extractor for Active Task context.
 * Used by travel / hotel / restaurant / calendar / reminder follow-ups.
 * Extracts ALL matching slots from one utterance (never first-only).
 */

import { extractDateFromUtterance, resolveKoreanDate } from './dates'
import type { ResolvedDate, TaskSlots } from './types'

/** Domestic / common origins (airports + cities). */
export const ORIGIN_PLACES: Record<string, string> = {
  김포: '김포',
  인천: '인천',
  부산: '부산',
  김해: '김해',
  제주: '제주',
  제주도: '제주',
  서울: '서울',
  대구: '대구',
  광주: '광주',
  대전: '대전',
  GMP: '김포',
  ICN: '인천',
  CJU: '제주',
  PUS: '김해',
}

/** Destinations (includes overseas). Longer keys first when matching. */
export const DESTINATION_PLACES: Record<string, string> = {
  호치민: '호치민',
  하노이: '하노이',
  다낭: '다낭',
  방콕: '방콕',
  싱가포르: '싱가포르',
  오사카: '오사카',
  도쿄: '도쿄',
  동경: '도쿄',
  후쿠오카: '후쿠오카',
  오키나와: '오키나와',
  타이베이: '타이베이',
  홍콩: '홍콩',
  마닐라: '마닐라',
  세부: '세부',
  발리: '발리',
  괌: '괌',
  사이판: '사이판',
  파리: '파리',
  런던: '런던',
  뉴욕: '뉴욕',
  베이징: '베이징',
  상하이: '상하이',
  제주도: '제주',
  제주: '제주',
  부산: '부산',
  서울: '서울',
  대구: '대구',
  광주: '광주',
  대전: '대전',
  울산: '울산',
  강릉: '강릉',
  여수: '여수',
  베트남: '베트남',
  일본: '일본',
  태국: '태국',
}

const DEST_KEYS = Object.keys(DESTINATION_PLACES).sort((a, b) => b.length - a.length)
const ORIGIN_KEYS = Object.keys(ORIGIN_PLACES).sort((a, b) => b.length - a.length)

/** Strip quotative / case particles so 「호치민이라고」「부산에서」 resolve to place names. */
export function normalizePlaceAnswer(text: string): string {
  let t = text.trim().replace(/\s+/g, '')
  if (!t) return t
  // Longest discourse / quotative endings first
  t = t.replace(/(이라고요|이라고|라고요|라고|인데요|이요|예요|에요|이야요|이야)$/u, '')
  // Direction / case particles (including 「행」 as in 호치민행)
  t = t.replace(/(으로|로|에서|에게|에|을|를|은|는|이|가|행)$/u, '')
  return t
}

export type SlotExtractContext = {
  pendingQuestion?: string | null
  existing?: TaskSlots
  taskType?: string
}

/** Explicit city-info lookup (not a destination slot answer). */
export function isExplicitCityInfoQuery(text: string): boolean {
  const t = text.trim()
  return (
    /에\s*대해\s*(알려|말해|설명)/.test(t) ||
    /정보\s*(좀\s*)?(보여|알려|찾아)/.test(t) ||
    /은\s*어떤\s*도시/.test(t) ||
    /어떤\s*(도시|곳)\s*(야|인가요|이에요)/.test(t) ||
    /도시\s*정보/.test(t) ||
    /알려줘\s*$/.test(t) && /에\s*대해|정보/.test(t)
  )
}

/** Bare / travel-bound place mention (should NOT force city.info while task active). */
export function isBarePlaceUtterance(text: string): boolean {
  const t = text.trim().replace(/\s+/g, '')
  if (isExplicitCityInfoQuery(text)) return false
  if (/날씨|기온|습도|미세먼지/.test(text)) return false
  const normalized = normalizePlaceAnswer(t)
  for (const k of DEST_KEYS) {
    if (
      t === k ||
      normalized === k ||
      t === `${k}으로` ||
      t === `${k}로` ||
      t === `${k}에` ||
      t === `${k}행` ||
      t === `${k}이라고` ||
      t === `${k}라고` ||
      new RegExp(`^${k}(으로|로)?갈(거야|꺼야|래요|게)$`).test(t)
    ) {
      return true
    }
  }
  return false
}

function yearForMonth(month: number, day: number, now: Date): number {
  const y = now.getFullYear()
  const candidate = new Date(y, month - 1, day, 12)
  // If the calendar day already passed this year, use next year
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (candidate < startOfToday) return y + 1
  return y
}

function toResolved(month: number, day: number, originalText: string, now: Date): ResolvedDate {
  const year = yearForMonth(month, day, now)
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return { originalText, resolvedDate: `${year}-${mm}-${dd}` }
}

/** Extract absolute Korean month/day dates + ranges. */
export function extractAbsoluteMonthDaySlots(
  text: string,
  now = new Date(),
): { departureDate?: ResolvedDate; returnDate?: ResolvedDate } {
  const compact = text.replace(/\s+/g, '')
  const out: { departureDate?: ResolvedDate; returnDate?: ResolvedDate } = {}

  const range = compact.match(
    /(\d{1,2})월(\d{1,2})일?부터(?:(\d{1,2})월)?(\d{1,2})일?까지/,
  )
  if (range) {
    const m1 = Number(range[1])
    const d1 = Number(range[2])
    const m2 = range[3] ? Number(range[3]) : m1
    const d2 = Number(range[4])
    const orig = `${m1}월${d1}일부터${m2 !== m1 ? `${m2}월` : ''}${d2}일까지`
    out.departureDate = toResolved(m1, d1, orig, now)
    out.returnDate = toResolved(m2, d2, orig, now)
    return out
  }

  const single = compact.match(/(\d{1,2})월(\d{1,2})일?/)
  if (single) {
    const m = Number(single[1])
    const d = Number(single[2])
    const orig = single[0].endsWith('일') ? single[0] : `${single[0]}일`
    out.departureDate = toResolved(m, d, orig, now)
  }
  return out
}

function extractPassengers(text: string): number | undefined {
  const t = text.trim()
  const pax = t.match(/(\d+)\s*명/)
  if (pax) return Number(pax[1])
  if (/둘이|두\s*명|2인/.test(t)) return 2
  if (/혼자|한\s*명/.test(t) && !/아니라/.test(t)) return 1
  if (/가족이랑|가족\s*4|네\s*명|4명/.test(t)) return 4
  if (/세\s*명|3명/.test(t)) return 3
  return undefined
}

function extractOrigin(text: string): string | undefined {
  const t = text.trim()
  for (const k of ORIGIN_KEYS) {
    if (new RegExp(`${k}\\s*에서`).test(t)) return ORIGIN_PLACES[k]
  }
  // Bare origin only when clearly short answer
  const compact = t.replace(/\s+/g, '')
  for (const k of ORIGIN_KEYS) {
    if (compact === k || compact === `${k}에서` || compact === `${k}로`) {
      return ORIGIN_PLACES[k]
    }
  }
  return undefined
}

function extractDestination(text: string, origin?: string): string | undefined {
  const t = text.trim()
  const compact = t.replace(/\s+/g, '')
  const normalized = normalizePlaceAnswer(compact)

  // Prefer particle-bound destination: X으로 / X로 / X행 / X 갈…
  for (const k of DEST_KEYS) {
    const canon = DESTINATION_PLACES[k]
    if (origin && canon === origin) continue
    if (
      new RegExp(`${k}\\s*(으로|로)(\\s*갈|$)`).test(t) ||
      new RegExp(`${k}\\s*행`).test(t) ||
      compact.includes(`${k}행`) ||
      new RegExp(`${k}(으로|로)?갈`).test(compact) ||
      new RegExp(`${k}\\s*갈(거야|꺼야|래요|게|까)`).test(t)
    ) {
      return canon
    }
  }

  // 「인천에서 호치민」 — place after 에서
  const afterOrigin = t.match(/에서\s*([가-힣A-Za-z]{2,12})/)
  if (afterOrigin) {
    const token = normalizePlaceAnswer(afterOrigin[1])
    for (const k of DEST_KEYS) {
      if (token === k || token.startsWith(k)) return DESTINATION_PLACES[k]
    }
  }

  // Bare destination token (short answers / 「제주 갈거야」 / 「호치민이라고」)
  for (const k of DEST_KEYS) {
    const canon = DESTINATION_PLACES[k]
    if (origin && canon === origin) continue
    if (
      compact === k ||
      normalized === k ||
      compact === `${k}으로` ||
      compact === `${k}로` ||
      compact === `${k}에` ||
      compact === `${k}행` ||
      compact === `${k}이라고` ||
      compact === `${k}라고` ||
      new RegExp(`(?:^|\\s)${k}(?:\\s|$)`).test(t)
    ) {
      // Avoid treating origin-only 「인천에서」 as destination
      if (new RegExp(`${k}\\s*에서`).test(t) && !new RegExp(`${k}\\s*(으로|로|갈|행)`).test(t)) {
        continue
      }
      return canon
    }
  }
  return undefined
}

/**
 * Extract every fillable slot from one user utterance.
 * Does not drop secondary slots after the first match.
 */
export function extractMultiSlots(text: string, ctx: SlotExtractContext = {}, now = new Date()): TaskSlots {
  const t = text.trim()
  const slots: TaskSlots = {}
  if (!t) return slots

  // Absolute month/day (+ range). Single dates respect expected/pending slot.
  const abs = extractAbsoluteMonthDaySlots(t, now)
  const expected = ctx.pendingQuestion
  if (abs.departureDate && abs.returnDate) {
    slots.departureDate = abs.departureDate
    slots.returnDate = abs.returnDate
    slots.tripType = 'round_trip'
  } else if (abs.departureDate) {
    if (expected === 'returnDate') {
      // Never map a lone date onto departureDate while asking for return
      slots.returnDate = abs.departureDate
    } else if (expected === 'departureDate' || !ctx.existing?.departureDate) {
      slots.departureDate = abs.departureDate
    }
    // else: departure already set & not asking for date → leave dates alone
  }

  // Relative Korean dates when no absolute date assigned yet
  if (!slots.departureDate && !slots.returnDate) {
    const rel = extractDateFromUtterance(t, now) || resolveKoreanDate(t, now)
    if (rel) {
      if (expected === 'returnDate') slots.returnDate = rel
      else if (expected === 'departureDate' || !ctx.existing?.departureDate) {
        slots.departureDate = rel
      } else if (/까지$/.test(t)) {
        slots.returnDate = rel
      }
    }
  }

  // Trip type (exact substring; aliases handled in tripTypeNormalize)
  if (/왕복|완복|왕뽁/.test(t)) slots.tripType = 'round_trip'
  if (/편도/.test(t) && !/왕복|완복/.test(t)) slots.tripType = 'one_way'

  // Origin before destination so 「인천에서 호치민」 works
  const origin = extractOrigin(t)
  if (origin) {
    // Ambiguous bare city: respect pending question
    const bareOnly =
      ORIGIN_KEYS.some((k) => t.replace(/\s+/g, '') === k || t.replace(/\s+/g, '') === `${k}로`) &&
      !/에서/.test(t)
    if (bareOnly && ctx.pendingQuestion === 'destination') {
      /* leave for destination */
    } else if (bareOnly && ctx.pendingQuestion === 'location') {
      slots.location = origin
    } else {
      slots.origin = origin
    }
  }

  const dest = extractDestination(t, slots.origin || (ctx.existing?.origin as string | undefined))
  if (dest) {
    if (ctx.taskType === 'restaurant.search' || ctx.pendingQuestion === 'location') {
      slots.location = slots.location || dest
    } else {
      slots.destination = dest
      if (ctx.taskType === 'travel.hotel' || ctx.pendingQuestion === 'location') {
        slots.location = slots.location || dest
      }
    }
  }

  // Pending-question short answers for places not in maps
  if (!slots.destination && ctx.pendingQuestion === 'destination') {
    const token = normalizePlaceAnswer(t)
    if (
      token.length >= 2 &&
      token.length <= 12 &&
      !/명|월|일|편도|왕복|혼자|출발/.test(token) &&
      !ORIGIN_PLACES[token]
    ) {
      slots.destination = DESTINATION_PLACES[token] || token
    }
  }
  if (!slots.origin && ctx.pendingQuestion === 'origin') {
    const token = normalizePlaceAnswer(t)
    if (token.length >= 2 && token.length <= 12 && !/명|월|일|출발/.test(token)) {
      slots.origin = ORIGIN_PLACES[token] || token
    }
  }

  const pax = extractPassengers(t)
  if (pax != null) {
    slots.passengers = pax
    if (ctx.taskType === 'restaurant.search' || ctx.pendingQuestion === 'partySize') {
      slots.partySize = pax
    }
  }

  // Preferred time
  if (/오전\s*걸로|아침/.test(t)) slots.preferredTime = 'morning'
  if (/오후\s*걸로/.test(t)) slots.preferredTime = 'afternoon'
  if (/저녁\s*걸로|저녁\s*7시/.test(t)) slots.preferredTime = 'evening'

  return slots
}

/**
 * Merge extracted slots onto existing.
 * Protected travel slots already present are NOT overwritten by generic extract.
 */
export function mergeExtractedSlots(existing: TaskSlots, extracted: TaskSlots): TaskSlots {
  const protectedKeys = new Set([
    'departureDate',
    'returnDate',
    'origin',
    'destination',
    'tripType',
    'passengers',
  ])
  const next: TaskSlots = { ...existing }
  for (const [k, v] of Object.entries(extracted)) {
    if (v === undefined || v === null || v === '') continue
    const prev = next[k]
    const hasPrev =
      prev !== undefined && prev !== null && prev !== '' && prev !== 'unknown'
    if (hasPrev && protectedKeys.has(k)) {
      // Allow fill-only for returnDate when empty; never clobber departureDate
      if (k === 'returnDate' && !existing.returnDate) {
        next.returnDate = v as typeof next.returnDate
      }
      continue
    }
    ;(next as Record<string, unknown>)[k] = v
  }
  return next
}

/** Follow-up action on active travel (search/continue) — not a new standalone intent. */
export function isActiveTaskFollowUpAction(text: string): boolean {
  const t = text.trim()
  return (
    /비행기\s*(표|티켓)?\s*(좀\s*)?(알아|찾|검색|봐)/.test(t) ||
    /항공권\s*(좀\s*)?(알아|찾|검색)/.test(t) ||
    /호텔\s*(도\s*)?(알아|찾|검색)/.test(t) ||
    /표\s*(좀\s*)?(알아|봐)/.test(t) ||
    /이어서|계속\s*(알아|진행|해)/.test(t)
  )
}
