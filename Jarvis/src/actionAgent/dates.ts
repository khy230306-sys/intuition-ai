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

function resolveWeekday(t: string, now: Date, nextWeek: boolean): Date | null {
  const key = Object.keys(WEEKDAY).find((k) => t.includes(`${k}요일`) || new RegExp(`${k}요(?:일)?`).test(t))
  if (!key) return null
  let d = nextWeekday(now, WEEKDAY[key])
  if (nextWeek && d.getTime() - now.getTime() < 6 * 86400000) d = addDays(d, 7)
  if (!nextWeek && d.getTime() <= now.getTime()) d = addDays(d, 7)
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

/** Extract departure-like date from a longer utterance. */
export function extractDateFromUtterance(text: string, now = new Date()): ResolvedDate | null {
  const t = String(text || '').trim()
  const phrases = [
    t.match(/(다음\s*주\s*[월화수목금토일]요일)/)?.[1],
    t.match(/(이번\s*주\s*[월화수목금토일]요일)/)?.[1],
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
