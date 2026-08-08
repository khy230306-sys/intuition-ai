/** Lightweight Korean date/time extraction for life-assistant rules. */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function nextWeekday(now: Date, targetDow: number, weekOffset: number): Date {
  const d = new Date(now)
  const day = d.getDay()
  if (weekOffset === 1) {
    // 「다음 주 X요일」: land on that weekday in the next Mon-start week
    const daysUntilNextMonday = ((1 - day + 7) % 7) || 7
    d.setDate(d.getDate() + daysUntilNextMonday)
    const fromMon = (targetDow - 1 + 7) % 7
    d.setDate(d.getDate() + fromMon)
    return d
  }
  // nearest upcoming (including today)
  const add = (targetDow - day + 7) % 7
  d.setDate(d.getDate() + add)
  return d
}

const DOW: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
}

export function extractKoreanDate(text: string, now = new Date()): string | undefined {
  const t = text.trim()
  if (/모레/.test(t)) {
    const d = new Date(now)
    d.setDate(d.getDate() + 2)
    return ymd(d)
  }
  if (/내일/.test(t)) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return ymd(d)
  }
  if (/오늘/.test(t)) return ymd(now)

  const nextDow = t.match(/다음\s*주\s*([월화수목금토일])(?:요일)?/)
  if (nextDow) {
    const dow = DOW[nextDow[1]!]
    if (dow != null) return ymd(nextWeekday(now, dow, 1))
  }
  const thisDow = t.match(/이번\s*주\s*([월화수목금토일])(?:요일)?/)
  if (thisDow) {
    const dow = DOW[thisDow[1]!]
    if (dow != null) {
      const d = new Date(now)
      const day = d.getDay()
      let add = (dow - day + 7) % 7
      d.setDate(d.getDate() + add)
      return ymd(d)
    }
  }
  if (/이번\s*주/.test(t)) return ymd(now)

  // Bare weekday 「월요일」→ upcoming that day (today if same weekday)
  const bareDow = t.match(/([월화수목금토일])요일/)
  if (bareDow) {
    const dow = DOW[bareDow[1]!]
    if (dow != null) {
      const d = new Date(now)
      const day = d.getDay()
      const add = (dow - day + 7) % 7
      d.setDate(d.getDate() + add)
      return ymd(d)
    }
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
  // 4시 반 / 오후 4시 반 — 하원·하교는 오후로 해석
  const half = t.match(/(오전|오후|아침|저녁|밤)?\s*(\d{1,2})\s*시\s*반/)
  if (half) {
    let h = Number(half[2])
    const period = half[1] || ''
    if (/오후|저녁|밤/.test(period) && h < 12) h += 12
    if (/오전|아침/.test(period) && h === 12) h = 0
    if (!period && /저녁/.test(t) && h < 12) h += 12
    if (!period && /(하원|하교|학원)/.test(t) && h > 0 && h <= 8) h += 12
    if (h >= 0 && h <= 23) return `${pad(h)}:30`
  }

  const ampm = t.match(/(오전|오후|아침|저녁|밤)?\s*(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/)
  if (ampm && /시/.test(t)) {
    let h = Number(ampm[2])
    const m = ampm[3] != null ? Number(ampm[3]) : 0
    let period = ampm[1] || ''
    if (!period && /저녁/.test(t)) period = '저녁'
    if (!period && /아침/.test(t)) period = '아침'
    if (/오후|저녁|밤/.test(period) && h < 12) h += 12
    if (/오전|아침/.test(period) && h === 12) h = 0
    if (!period && /(하원|하교|학원)/.test(t) && h > 0 && h <= 8 && m === 0) h += 12
    if (!period && /(하원|하교|학원)/.test(t) && h > 0 && h <= 8 && m > 0) h += 12
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${pad(h)}:${pad(m)}`
  }

  // 16시 30분
  const mil = t.match(/\b(\d{1,2})\s*시\s*(\d{1,2})\s*분/)
  if (mil) {
    const h = Number(mil[1])
    const m = Number(mil[2])
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
