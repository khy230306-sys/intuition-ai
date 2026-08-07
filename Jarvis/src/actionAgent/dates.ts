/**
 * Relative Korean date resolution for Action Agent.
 * Reuses travel date helpers; always preserves originalText.
 */

import { addDays, nextWeekday, toIsoDate } from '../travelAgent/dates'
import type { ResolvedDate } from './types'

const WEEKDAY: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
}

function resolveWeekday(t: string, now: Date, nextWeek: boolean, weekOffset = 0): Date | null {
  // 「금요일」·「금요」· bare 「금」(after 주) · 「금요」
  const key =
    Object.keys(WEEKDAY).find((k) => t.includes(`${k}요일`) || new RegExp(`${k}요(?:일)?`).test(t)) ||
    (t.match(/(?:주)\s*([월화수목금토일])(?:요일)?/) || [])[1] ||
    (t.match(/^([월화수목금토일])$/) || [])[1]
  if (!key || WEEKDAY[key] == null) return null
  let d = nextWeekday(now, WEEKDAY[key])
  if (nextWeek && d.getTime() - now.getTime() < 6 * 86400000) d = addDays(d, 7)
  if (!nextWeek && d.getTime() <= now.getTime()) d = addDays(d, 7)
  if (weekOffset > 0) d = addDays(d, weekOffset)
  return d
}

/** Resolve a relative Korean date phrase → ISO + original. */
export function resolveKoreanDate(text: string, now = new Date()): ResolvedDate | null {
  const t = String(text || '').trim()
  if (!t) return null
  const originalText = t

  if (/^오늘$|오늘\s*(하루|중)?$/.test(t) || (/\b오늘\b/.test(t) && !/내일|모레|다음|이번\s*주/.test(t))) {
    if (/오늘/.test(t) && !/내일|모레|다음\s*주|이번\s*주\s*[월화수목금토일]/.test(t)) {
      return { originalText, resolvedDate: toIsoDate(now) }
    }
  }
  if (/내일/.test(t) && !/모레/.test(t)) {
    return { originalText, resolvedDate: toIsoDate(addDays(now, 1)) }
  }
  if (/모레/.test(t)) {
    return { originalText, resolvedDate: toIsoDate(addDays(now, 2)) }
  }
  if (/이번\s*주말|다음\s*주말/.test(t)) {
    const next = /다음/.test(t)
    let sat = nextWeekday(now, 6)
    if (next && sat.getTime() - now.getTime() < 6 * 86400000) sat = addDays(sat, 7)
    if (!next && sat.getTime() <= now.getTime()) sat = addDays(sat, 7)
    return { originalText, resolvedDate: toIsoDate(sat) }
  }
  if (/이번\s*달\s*말|月末|말일/.test(t)) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12)
    return { originalText, resolvedDate: toIsoDate(d) }
  }
  if (/다음\s*달\s*(\d{1,2})\s*일/.test(t)) {
    const day = Number(t.match(/다음\s*달\s*(\d{1,2})\s*일/)![1])
    const d = new Date(now.getFullYear(), now.getMonth() + 1, day, 12)
    return { originalText, resolvedDate: toIsoDate(d) }
  }
  // 「다다음주 금」 = week after next (+14 from next-week baseline via weekOffset)
  if (/다다음\s*주/.test(t)) {
    const d = resolveWeekday(t, now, true, 7)
    if (d) return { originalText, resolvedDate: toIsoDate(d) }
  }
  if (/다음\s*주/.test(t)) {
    const d = resolveWeekday(t, now, true)
    if (d) return { originalText, resolvedDate: toIsoDate(d) }
  }
  if (/이번\s*주/.test(t)) {
    const d = resolveWeekday(t, now, false)
    if (d) return { originalText, resolvedDate: toIsoDate(d) }
  }
  // Bare weekday (일요일) — next occurrence
  const bare = resolveWeekday(t, now, false)
  if (bare && /[월화수목금토일]요/.test(t)) {
    return { originalText, resolvedDate: toIsoDate(bare) }
  }
  return null
}

/** Absolute 「8월10」 / 「8월 10일」 → ISO (year inferred from now). */
export function resolveAbsoluteMonthDay(text: string, now = new Date()): ResolvedDate | null {
  const compact = String(text || '').replace(/\s+/g, '')
  const m = compact.match(/(\d{1,2})월(\d{1,2})일?/)
  if (!m) return null
  const month = Number(m[1])
  const day = Number(m[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  let year = now.getFullYear()
  const candidate = new Date(year, month - 1, day, 12)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (candidate < startOfToday) year += 1
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const originalText = m[0].endsWith('일') ? m[0] : `${m[0]}일`
  return { originalText, resolvedDate: `${year}-${mm}-${dd}` }
}

/** Extract departure-like date from a longer utterance. */
export function extractDateFromUtterance(text: string, now = new Date()): ResolvedDate | null {
  const t = String(text || '').trim()
  // Absolute month/day before relative phrases (「8월10 호치민」)
  const abs = resolveAbsoluteMonthDay(t, now)
  if (abs) return abs
  const phrases = [
    t.match(/(다다음\s*주\s*[월화수목금토일](?:요일)?)/)?.[1],
    t.match(/(다음\s*주\s*[월화수목금토일](?:요일)?)/)?.[1],
    t.match(/(이번\s*주\s*[월화수목금토일](?:요일)?)/)?.[1],
    t.match(/(다음\s*달\s*\d{1,2}\s*일)/)?.[1],
    t.match(/(이번\s*달\s*말)/)?.[1],
    t.match(/(다음\s*주말|이번\s*주말)/)?.[1],
    t.match(/(모레|내일|오늘)/)?.[1],
    t.match(/([월화수목금토일]요일)/)?.[1],
  ].filter(Boolean) as string[]
  for (const p of phrases) {
    const r = resolveKoreanDate(p, now)
    if (r) return { ...r, originalText: p }
  }
  return resolveKoreanDate(t, now)
}
