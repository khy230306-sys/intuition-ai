/** Lightweight Korean date/time extraction for life-assistant rules. */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function extractKoreanDate(text: string, now = new Date()): string | undefined {
  const t = text.trim()
  if (/오늘/.test(t)) return ymd(now)
  if (/내일/.test(t)) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return ymd(d)
  }
  if (/모레/.test(t)) {
    const d = new Date(now)
    d.setDate(d.getDate() + 2)
    return ymd(d)
  }
  if (/이번\s*주/.test(t)) return ymd(now)
  if (/다음\s*주\s*월요일|다음주\s*월요일/.test(t)) {
    const d = new Date(now)
    const day = d.getDay()
    const add = ((1 + 7 - day) % 7) + 7
    d.setDate(d.getDate() + (add === 7 ? 7 : add))
    return ymd(d)
  }
  const md = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (md) {
    const m = Number(md[1])
    const day = Number(md[2])
    if (m >= 1 && m <= 12 && day >= 1 && day <= 31) {
      return `${now.getFullYear()}-${pad(m)}-${pad(day)}`
    }
  }
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return undefined
}

export function extractKoreanTime(text: string): string | undefined {
  const t = text.trim()
  const ampm = t.match(/(오전|오후|아침|저녁|밤)?\s*(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/)
  if (ampm) {
    let h = Number(ampm[2])
    const m = ampm[3] != null ? Number(ampm[3]) : 0
    const period = ampm[1] || ''
    if (/오후|저녁|밤/.test(period) && h < 12) h += 12
    if (/오전|아침/.test(period) && h === 12) h = 0
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${pad(h)}:${pad(m)}`
  }
  const hm = t.match(/\b(\d{1,2}):(\d{2})\b/)
  if (hm) {
    const h = Number(hm[1])
    const m = Number(hm[2])
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${pad(h)}:${pad(m)}`
  }
  return undefined
}

export function extractReminderOffset(text: string): string | undefined {
  const m = text.match(/(\d+)\s*분\s*(뒤|후)/)
  if (m) return `${m[1]}m`
  const h = text.match(/(\d+)\s*시간\s*(뒤|후)/)
  if (h) return `${h[1]}h`
  return undefined
}

export function offsetToWhenAt(offset: string, now = Date.now()): number | null {
  const m = offset.match(/^(\d+)m$/i)
  if (m) return now + Number(m[1]) * 60_000
  const h = offset.match(/^(\d+)h$/i)
  if (h) return now + Number(h[1]) * 3_600_000
  return null
}
