/** Relative Korean date helpers for Travel Agent. */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Next weekday: 0=Sun … 5=Fri */
export function nextWeekday(from: Date, weekday: number): Date {
  const d = new Date(from)
  d.setHours(12, 0, 0, 0)
  const delta = (weekday - d.getDay() + 7) % 7 || 7
  return addDays(d, delta)
}

const WEEKDAY: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
}

export function parseTravelDates(text: string, now = new Date()): {
  departureDate?: string
  returnDate?: string
  nights?: number
} {
  const t = text.trim()
  let departureDate: string | undefined
  let returnDate: string | undefined
  let nights: number | undefined

  const nightsMatch = t.match(/(\d+)\s*박\s*(\d+)\s*일/)
  if (nightsMatch) nights = Number(nightsMatch[1])

  const range = t.match(/(\d{1,2})\s*일\s*부터\s*(\d{1,2})\s*일/)
  if (range) {
    const y = now.getFullYear()
    let m = now.getMonth()
    if (/다음\s*달/.test(t)) m += 1
    // If session already implied next month via prior turn, caller may pass monthHint —
    // when only 「10일부터 13일」 arrives, prefer next month if current day is past the start day.
    if (!/다음\s*달|이번\s*달/.test(t) && Number(range[1]) < now.getDate()) {
      /* keep current month unless start day already passed — then next month */
      m += 1
    }
    const start = new Date(y, m, Number(range[1]), 12)
    const end = new Date(y, m, Number(range[2]), 12)
    if (end < start) end.setMonth(end.getMonth() + 1)
    departureDate = toIsoDate(start)
    returnDate = toIsoDate(end)
    nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
    return { departureDate, returnDate, nights }
  }

  if (/다음\s*주/.test(t)) {
    const wd = Object.keys(WEEKDAY).find((k) => t.includes(`${k}요일`) || t.includes(k + '요'))
    const day = wd ? WEEKDAY[wd] : 5
    // "다음 주" → at least 7 days ahead for that weekday
    let d = nextWeekday(now, day)
    if (d.getTime() - now.getTime() < 6 * 86400000) d = addDays(d, 7)
    departureDate = toIsoDate(d)
  } else if (/내일/.test(t)) {
    departureDate = toIsoDate(addDays(now, 1))
  } else if (/모레/.test(t)) {
    departureDate = toIsoDate(addDays(now, 2))
  } else if (/다음\s*달/.test(t) && /\d{1,2}\s*일/.test(t)) {
    /* day range handled above; bare 「다음 달」 alone does not invent a date */
  } else if (/오늘/.test(t) && /(비행|항공|출발)/.test(t)) {
    departureDate = toIsoDate(now)
  }

  const md = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (md) {
    departureDate = toIsoDate(new Date(now.getFullYear(), Number(md[1]) - 1, Number(md[2]), 12))
  }

  if (departureDate && nights && !returnDate) {
    returnDate = toIsoDate(addDays(new Date(departureDate + 'T12:00:00'), nights))
  } else if (departureDate && /왕복|다녀|여행/.test(t) && !returnDate && !nights) {
    nights = 3
    returnDate = toIsoDate(addDays(new Date(departureDate + 'T12:00:00'), 3))
  }

  return { departureDate, returnDate, nights }
}
