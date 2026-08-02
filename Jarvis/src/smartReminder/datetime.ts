export type ParsedDateTime = {
  whenAt: number
  label: string
  past: boolean
  timezone: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'
  } catch {
    return 'Asia/Seoul'
  }
}

export function formatLocal(whenAt: number): string {
  const d = new Date(whenAt)
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatFriendly(whenAt: number, now = Date.now()): string {
  const d = new Date(whenAt)
  const n = new Date(now)
  const sameDay =
    d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
  const tom = new Date(n)
  tom.setDate(tom.getDate() + 1)
  const isTom =
    d.getFullYear() === tom.getFullYear() && d.getMonth() === tom.getMonth() && d.getDate() === tom.getDate()
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (sameDay) return `오늘 ${hm}`
  if (isTom) return `내일 ${hm}`
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${hm}`
}

/** Parse Korean relative/absolute times. Does NOT auto-roll past times to tomorrow. */
export function parseScheduleDateTime(text: string, now = Date.now()): ParsedDateTime | null {
  const t = text.trim()
  const timezone = detectTimezone()

  const relMin = t.match(/(\d+)\s*분\s*(?:뒤|후)/)
  if (relMin) {
    const whenAt = now + parseInt(relMin[1], 10) * 60_000
    return { whenAt, label: `${relMin[1]}분 뒤`, past: false, timezone }
  }
  const relHour = t.match(/(\d+)\s*시간\s*(?:뒤|후)/)
  if (relHour) {
    const whenAt = now + parseInt(relHour[1], 10) * 3_600_000
    return { whenAt, label: `${relHour[1]}시간 뒤`, past: false, timezone }
  }

  let dayOffset = 0
  if (/모레/.test(t)) dayOffset = 2
  else if (/내일/.test(t)) dayOffset = 1
  else if (/오늘/.test(t)) dayOffset = 0

  // 이번 주 / 다음 주 / 매주 + weekday
  const wd = t.match(/(이번\s*주|다음\s*주|매주)?\s*(월|화|수|목|금|토|일)요일/)
  if (wd) {
    const map: Record<string, number> = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 0 }
    const want = map[wd[2]!]!
    const base = new Date(now)
    const cur = base.getDay()
    let add = (want - cur + 7) % 7
    if (add === 0 && !/오늘/.test(t)) add = 7
    if (/다음\s*주/.test(wd[1] || '') || /다음\s*주/.test(t)) add += 7
    dayOffset = add
  }

  const abs =
    t.match(/(오전|오후|아침|저녁)?\s*(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/) || t.match(/(\d{1,2})\s*:\s*(\d{2})/)
  if (!abs && !relMin && !relHour) {
    // date-only without time
    if (/오늘|내일|모레|요일/.test(t)) {
      return null
    }
    return null
  }

  const base = new Date(now)
  let hour = 9
  let minute = 0
  if (abs) {
    if (abs[0].includes(':')) {
      hour = parseInt(abs[1], 10)
      minute = parseInt(abs[2], 10)
    } else {
      hour = parseInt(abs[2], 10)
      minute = abs[3] ? parseInt(abs[3], 10) : 0
      const meridiem = abs[1] || ''
      if (/오후|저녁/.test(meridiem) && hour < 12) hour += 12
      if (/오전|아침/.test(meridiem) && hour === 12) hour = 0
      if (!meridiem && /저녁/.test(t) && hour < 12) hour += 12
      // bare "2시" with 오후 elsewhere
      if (!meridiem && /오후/.test(t) && hour < 12) hour += 12
    }
  }

  const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, minute, 0, 0)
  const whenAt = target.getTime()
  const past = whenAt <= now
  return {
    whenAt,
    label: formatFriendly(whenAt, now),
    past,
    timezone,
  }
}

export function parseAdvanceMinutes(text: string): number | null {
  const m = text.match(/(\d+)\s*분\s*전/)
  if (m) return parseInt(m[1], 10)
  if (/한\s*시간\s*전|1\s*시간\s*전/.test(text)) return 60
  return null
}
