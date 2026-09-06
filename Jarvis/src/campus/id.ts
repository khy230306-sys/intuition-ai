import type { CampusId, IsoDate } from './types'

export function nowIso(): IsoDate {
  return new Date().toISOString()
}

export function campusId(prefix: string): CampusId {
  const rnd =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${rnd}`
}

export function timeToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return NaN
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return NaN
  return h * 60 + min
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function parseKoreanTime(text: string): string | null {
  const colon = text.match(/(\d{1,2}):(\d{2})/)
  if (colon) {
    const h = Number(colon[1])
    const m = Number(colon[2])
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }
  const half = text.match(/(오전|오후)?\s*(\d{1,2})\s*시\s*(반|(\d{1,2})\s*분)?/)
  if (half) {
    let h = Number(half[2])
    let m = 0
    if (half[3] === '반') m = 30
    else if (half[4]) m = Number(half[4])
    if (half[1] === '오후' && h < 12) h += 12
    if (half[1] === '오전' && h === 12) h = 0
    if (!half[1] && /저녁|오후/.test(text) && h < 12) h += 12
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }
  return null
}

export function parseKoreanWeekday(text: string): number | null {
  const map: Array<[RegExp, number]> = [
    [/일요일|일요일에|^일\b|일요/, 0],
    [/월요일|월요일에|^월\b|월요/, 1],
    [/화요일|화요일에|^화\b|화요/, 2],
    [/수요일|수요일에|^수\b|수요/, 3],
    [/목요일|목요일에|^목\b|목요/, 4],
    [/금요일|금요일에|^금\b|금요/, 5],
    [/토요일|토요일에|^토\b|토요/, 6],
  ]
  for (const [re, d] of map) {
    if (re.test(text)) return d
  }
  return null
}

export function dDay(targetIso: string | null | undefined, now = new Date()): number | null {
  if (!targetIso) return null
  const t = new Date(targetIso)
  if (Number.isNaN(t.getTime())) return null
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function formatDateKo(d = new Date()): string {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  return `${days[d.getDay()]} · ${d.getMonth() + 1}월 ${d.getDate()}일`
}
