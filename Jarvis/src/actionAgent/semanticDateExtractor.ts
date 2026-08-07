/**
 * Role-aware Korean date extraction for Action Agent.
 * Generic dates are unknownDate — never auto-labeled departureDate.
 */

import { resolveAbsoluteMonthDay, extractDateFromUtterance, resolveKoreanDate } from './dates'
import type { ResolvedDate } from './types'

export type DateRole =
  | 'departureDate'
  | 'returnDate'
  | 'checkIn'
  | 'checkOut'
  | 'eventDate'
  | 'reminderDate'
  | 'unknownDate'

export type SemanticDate = {
  value: string // ISO YYYY-MM-DD
  role: DateRole
  sourceText: string
  confidence: number
  originalText: string
  resolved: ResolvedDate
}

function toResolved(iso: string, originalText: string): ResolvedDate {
  return { originalText, resolvedDate: iso }
}

function yearForMonth(month: number, day: number, now: Date): number {
  let year = now.getFullYear()
  const candidate = new Date(year, month - 1, day, 12)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (candidate < startOfToday) year += 1
  return year
}

function mdToIso(month: number, day: number, now: Date): string {
  const y = yearForMonth(month, day, now)
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function pushDate(
  out: SemanticDate[],
  iso: string,
  role: DateRole,
  sourceText: string,
  confidence: number,
  originalText: string,
): void {
  out.push({
    value: iso,
    role,
    sourceText,
    confidence,
    originalText,
    resolved: toResolved(iso, originalText),
  })
}

/** Explicit return / come-back phrases. */
const RETURN_CUE =
  /돌아오는\s*날짜|돌아오는\s*날|오는\s*날|귀국|돌아올|돌아와|돌아\s*올|까지\s*있을|리턴/i

/** Explicit departure / leave phrases. */
const DEPART_CUE =
  /출발|떠날|떠나는|가는\s*날|갈\s*거야|갈거야|갈꺼야|여행\s*갈|여행갈|떠나|출국|떠날게|갈게/

/**
 * Extract all dates with semantic roles from one utterance.
 * Never assigns the same lone date to both departure and return.
 */
export function extractSemanticDates(text: string, now = new Date()): SemanticDate[] {
  const t = text.trim()
  const out: SemanticDate[] = []
  if (!t) return out

  // Range: 「8월10일부터 14일까지」 / 「8월10부터 8월14까지」
  const compact = t.replace(/\s+/g, '')
  const range = compact.match(/(\d{1,2})월(\d{1,2})일?부터(?:(\d{1,2})월)?(\d{1,2})일?까지/)
  if (range) {
    const m1 = Number(range[1])
    const d1 = Number(range[2])
    const m2 = range[3] ? Number(range[3]) : m1
    const d2 = Number(range[4])
    const orig = range[0]
    pushDate(out, mdToIso(m1, d1, now), 'departureDate', orig, 1, `${m1}월${d1}일`)
    pushDate(out, mdToIso(m2, d2, now), 'returnDate', orig, 1, `${m2}월${d2}일`)
    return out
  }

  // Dual explicit: 「8월10일출발 … 8월14일 돌아올」 / 「8월10일 출발해서 8월14일 돌아와」
  const dual = t.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*(?:에\s*)?(?:출발|떠|가서|갈|여행)?[\s\S]{0,40}?(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*(?:에\s*)?(?:돌아|귀국|올|까지)/,
  )
  if (dual) {
    pushDate(
      out,
      mdToIso(Number(dual[1]), Number(dual[2]), now),
      'departureDate',
      dual[0],
      1,
      `${dual[1]}월${dual[2]}일`,
    )
    pushDate(
      out,
      mdToIso(Number(dual[3]), Number(dual[4]), now),
      'returnDate',
      dual[0],
      1,
      `${dual[3]}월${dual[4]}일`,
    )
    return out
  }

  // 「10일에 가서 14일에 와」 (same month implied)
  const dayDual = t.match(/(\d{1,2})\s*일에?\s*가서\s*(\d{1,2})\s*일에?\s*와/)
  if (dayDual) {
    const month = now.getMonth() + 1
    pushDate(out, mdToIso(month, Number(dayDual[1]), now), 'departureDate', dayDual[0], 0.85, `${dayDual[1]}일`)
    pushDate(out, mdToIso(month, Number(dayDual[2]), now), 'returnDate', dayDual[0], 0.85, `${dayDual[2]}일`)
    return out
  }

  // Collect month-day mentions with local context windows
  const re = /(\d{1,2})\s*월\s*(\d{1,2})\s*일?/g
  const matches: Array<{ month: number; day: number; index: number; text: string }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(t)) !== null) {
    matches.push({
      month: Number(m[1]),
      day: Number(m[2]),
      index: m.index,
      text: m[0].endsWith('일') ? m[0] : `${m[0]}일`,
    })
  }

  if (matches.length >= 2) {
    // First → departure, second → return when travel dual cues / "갔다가"
    const hasTravelDual = /갔다가|출발|돌아|귀국|여행/.test(t)
    if (hasTravelDual || DEPART_CUE.test(t) || RETURN_CUE.test(t)) {
      const a = matches[0]
      const b = matches[1]
      pushDate(out, mdToIso(a.month, a.day, now), 'departureDate', a.text, 0.95, a.text)
      pushDate(out, mdToIso(b.month, b.day, now), 'returnDate', b.text, 0.95, b.text)
      return out
    }
  }

  for (const hit of matches) {
    const iso = mdToIso(hit.month, hit.day, now)
    // Window around the match for role cues
    const start = Math.max(0, hit.index - 12)
    const end = Math.min(t.length, hit.index + hit.text.length + 24)
    const window = t.slice(start, end)
    const before = t.slice(Math.max(0, hit.index - 20), hit.index)
    const after = t.slice(hit.index, Math.min(t.length, hit.index + hit.text.length + 20))

    // Explicit return role
    if (
      RETURN_CUE.test(before) ||
      RETURN_CUE.test(window) ||
      /돌아와|돌아올|귀국|까지$/.test(after) ||
      /돌아오는날짜|오는날은|귀국은/.test(t.replace(/\s+/g, ''))
    ) {
      // Prefer return if the cue is clearly about return near this date
      if (
        /돌아오는\s*날짜|돌아오는날짜|오는\s*날|오는날|귀국|돌아올|돌아와/.test(
          t.replace(/\s+/g, '').includes('돌아오는날짜')
            ? t
            : before + after,
        ) ||
        RETURN_CUE.test(before) ||
        /돌아올|돌아와|귀국/.test(after)
      ) {
        pushDate(out, iso, 'returnDate', hit.text, 1, hit.text)
        continue
      }
    }

    // 「돌아오는날짜는 8월14일이야」 — date after return cue in full sentence
    if (/돌아오는\s*날짜\s*는|돌아오는날짜는|오는\s*날은|귀국은|오는날은/.test(t) && matches.length === 1) {
      pushDate(out, iso, 'returnDate', hit.text, 1, hit.text)
      continue
    }

    // Explicit departure role
    if (
      DEPART_CUE.test(after) ||
      /가는\s*날은|출발은|출발해서/.test(before) ||
      /출발|떠날|갈거야|갈꺼야|여행갈|여행\s*갈/.test(after) ||
      (/여행|비행기|갈거야|갈꺼야|갈게/.test(t) && matches.length === 1 && !RETURN_CUE.test(t))
    ) {
      pushDate(out, iso, 'departureDate', hit.text, 0.95, hit.text)
      continue
    }

    // 「8월10일 부산에서 호치민」 — date + route places ⇒ departure (not unknown)
    if (
      matches.length === 1 &&
      !RETURN_CUE.test(t) &&
      (/에서|으로|로\s*갈/.test(t) ||
        /호치민|제주|도쿄|오사카|부산|인천|서울|하노이|다낭|방콕/.test(t))
    ) {
      pushDate(out, iso, 'departureDate', hit.text, 0.9, hit.text)
      continue
    }

    // Relative / absolute without role → unknownDate (resolver assigns)
    pushDate(out, iso, 'unknownDate', hit.text, 0.5, hit.text)
  }

  if (out.length) return out

  // Relative phrases (내일, 다음 주 금요일) — unknown unless cue
  const rel = extractDateFromUtterance(t, now) || resolveKoreanDate(t, now)
  if (rel) {
    // Skip if absolute already handled via resolveAbsoluteMonthDay alone without month pattern... already covered
    if (RETURN_CUE.test(t)) {
      pushDate(out, rel.resolvedDate, 'returnDate', rel.originalText, 0.9, rel.originalText)
    } else if (DEPART_CUE.test(t) || /비행기|여행|갈/.test(t)) {
      pushDate(out, rel.resolvedDate, 'departureDate', rel.originalText, 0.85, rel.originalText)
    } else {
      pushDate(out, rel.resolvedDate, 'unknownDate', rel.originalText, 0.5, rel.originalText)
    }
  }

  return out
}

/** Correction phrases that force departureDate update. */
export function isDepartureCorrection(text: string): boolean {
  return (
    /아니\s*.*출발|출발\s*(은|을|를|일|날짜)?\s*.*(바꾸|로\s*해|이야|야)|출발은\s*\d/.test(text) ||
    /가는\s*날은\s*\d/.test(text)
  )
}

export function isReturnCorrection(text: string): boolean {
  return /돌아오는\s*날짜|돌아오는날짜|오는\s*날|귀국은|오는날은/.test(text)
}

/** Rich new-travel utterance (not a short pending answer). */
export function isRichTravelUtterance(text: string): boolean {
  const t = text.trim()
  if (t.length < 8) return false
  const hasDate = /\d{1,2}\s*월\s*\d{1,2}/.test(t) || /내일|모레|다음\s*주/.test(t)
  const hasPlace = /호치민|제주|도쿄|오사카|부산|인천|서울|하노이|다낭|방콕|도쿄|일본|베트남/.test(t)
  const hasTravel =
    /여행|비행기|항공|표\s*알아|알아봐|갈거야|갈꺼야|갈게|떠나|출발/.test(t)
  return (hasDate && hasPlace) || (hasDate && hasTravel) || (hasPlace && hasTravel && hasDate)
}

/** Explicit new-task reset phrases. */
export function isNewTravelReset(text: string): boolean {
  const t = text.trim()
  return (
    /새로\s*여행|다른\s*여행|이번엔\s*.*갈|아까\s*거\s*말고|처음부터\s*다시|새\s*여행|여행\s*다시\s*알아|다시\s*여행\s*알아/.test(
      t,
    )
  )
}

export function semanticDateToResolved(d: SemanticDate): ResolvedDate {
  return d.resolved
}

/** Debug helper — keep resolveAbsoluteMonthDay reachable for tests. */
export function parseLoneAbsolute(text: string, now = new Date()): ResolvedDate | null {
  return resolveAbsoluteMonthDay(text, now)
}
