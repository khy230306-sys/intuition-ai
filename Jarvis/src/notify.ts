/**
 * Local reminders / alerts using Notification API + in-page timers.
 * Works while the PWA/tab is open; iOS Safari may limit background delivery.
 */

export type LocalAlarm = {
  id: string
  title: string
  body: string
  whenAt: number
  fired: boolean
  createdAt: number
}

const KEY = 'jarvis_local_alarms_v1'

type TimerMap = Map<string, ReturnType<typeof setTimeout>>

const timers: TimerMap = new Map()
let tickStarted = false
let onFireUi: ((alarm: LocalAlarm) => void) | null = null

function readAlarms(): LocalAlarm[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as LocalAlarm[]
  } catch {
    return []
  }
}

function writeAlarms(items: LocalAlarm[]): void {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 100)))
}

export function loadAlarms(): LocalAlarm[] {
  return readAlarms()
}

export function setAlarmUiHandler(handler: ((alarm: LocalAlarm) => void) | null): void {
  onFireUi = handler
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function showBrowserNotification(alarm: LocalAlarm): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const n = new Notification(alarm.title, {
      body: alarm.body,
      tag: alarm.id,
      silent: false,
    })
    setTimeout(() => n.close(), 12_000)
  } catch {
    /* ignore */
  }
}

function fireAlarm(alarm: LocalAlarm): void {
  const items = readAlarms()
  const found = items.find((a) => a.id === alarm.id)
  if (!found || found.fired) return
  // Never fire early — setTimeout clamp can wake before whenAt
  if (found.whenAt > Date.now() + 500) {
    armTimer(found)
    return
  }
  found.fired = true
  writeAlarms(items)
  timers.delete(alarm.id)
  showBrowserNotification(found)
  onFireUi?.(found)
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([80, 40, 80])
  } catch {
    /* ignore */
  }
}

/** Max setTimeout delay (~24.8d). We re-arm until whenAt is reached. */
const MAX_TIMEOUT_MS = 2_147_483_647

function armTimer(alarm: LocalAlarm): void {
  if (alarm.fired) return
  const prev = timers.get(alarm.id)
  if (prev) clearTimeout(prev)
  const delay = alarm.whenAt - Date.now()
  if (delay <= 0) {
    fireAlarm(alarm)
    return
  }
  const ms = Math.min(delay, MAX_TIMEOUT_MS)
  const handle = setTimeout(() => {
    const latest = readAlarms().find((a) => a.id === alarm.id)
    if (!latest || latest.fired) {
      timers.delete(alarm.id)
      return
    }
    if (latest.whenAt > Date.now() + 500) {
      armTimer(latest)
      return
    }
    fireAlarm(latest)
  }, ms)
  timers.set(alarm.id, handle)
}

export function scheduleAlarm(title: string, body: string, whenAt: number): LocalAlarm {
  const alarm: LocalAlarm = {
    id: crypto.randomUUID(),
    title: title.trim() || 'AIZIO 알림',
    body: body.trim() || title,
    whenAt,
    fired: false,
    createdAt: Date.now(),
  }
  const items = readAlarms().filter((a) => !a.fired || a.whenAt > Date.now() - 86_400_000)
  items.unshift(alarm)
  writeAlarms(items)
  armTimer(alarm)
  void ensureNotificationPermission()
  return alarm
}

export function cancelAlarm(id: string): boolean {
  const items = readAlarms()
  const next = items.filter((a) => a.id !== id)
  if (next.length === items.length) return false
  writeAlarms(next)
  const t = timers.get(id)
  if (t) clearTimeout(t)
  timers.delete(id)
  return true
}

export function startAlarmScheduler(): void {
  if (tickStarted) return
  tickStarted = true
  for (const a of readAlarms()) {
    if (!a.fired && a.whenAt > Date.now() - 5_000) armTimer(a)
  }
  // Catch any missed due to tab sleep
  setInterval(() => {
    for (const a of readAlarms()) {
      if (!a.fired && a.whenAt <= Date.now()) fireAlarm(a)
    }
  }, 15_000)
}

export type ParsedWhen = {
  whenAt: number
  label: string
  rest: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatWhenAt(whenAt: number): string {
  const d = new Date(whenAt)
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Parse relative/absolute Korean times from reminder phrases. */
export function parseWhenFromText(text: string, now = Date.now()): ParsedWhen | null {
  const t = text.trim()
  let rest = t
  let whenAt: number | null = null
  let label = ''

  const relMin = t.match(/(\d+)\s*분\s*(?:뒤|후|있다가)/)
  const relHour = t.match(/(\d+)\s*시간\s*(?:뒤|후)/)
  if (relMin) {
    whenAt = now + parseInt(relMin[1], 10) * 60_000
    label = `${relMin[1]}분 뒤`
    rest = t.replace(relMin[0], ' ').replace(/\s+/g, ' ').trim()
  } else if (relHour) {
    whenAt = now + parseInt(relHour[1], 10) * 3_600_000
    label = `${relHour[1]}시간 뒤`
    rest = t.replace(relHour[0], ' ').replace(/\s+/g, ' ').trim()
  } else {
    const abs =
      t.match(/(오늘|내일)?\s*(오전|오후|아침|저녁)?\s*(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/) ||
      t.match(/(\d{1,2})\s*:\s*(\d{2})/)
    if (abs) {
      const base = new Date(now)
      let dayOffset = 0
      const full = abs[0]
      if (/내일/.test(t) || /내일/.test(full)) dayOffset = 1
      let hour = 0
      let minute = 0
      if (abs[0].includes(':')) {
        hour = parseInt(abs[1], 10)
        minute = parseInt(abs[2], 10)
      } else {
        hour = parseInt(abs[3], 10)
        minute = abs[4] ? parseInt(abs[4], 10) : 0
        const meridiem = abs[2] || ''
        if (/오후|저녁/.test(meridiem) && hour < 12) hour += 12
        if (/오전|아침/.test(meridiem) && hour === 12) hour = 0
        if (!meridiem && /저녁/.test(t) && hour < 12) hour += 12
      }
      const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, minute, 0, 0)
      if (target.getTime() <= now && dayOffset === 0) {
        target.setDate(target.getDate() + 1)
      }
      whenAt = target.getTime()
      label = formatWhenAt(whenAt)
      rest = t.replace(abs[0], ' ').replace(/오늘|내일/g, ' ').replace(/\s+/g, ' ').trim()
    }
  }

  if (whenAt == null) return null
  rest = rest
    .replace(/^(?:알림|알람|리마인더|알려줘|기억시켜)\s*/i, '')
    .replace(/\s*(?:알림|알람|알려줘|기억시켜)$/i, '')
    .replace(/^(?:에|에다|을|를)\s*/, '')
    .replace(/알람\s*을?\s*맞춰\s*줘?/g, ' ')
    .replace(/알림\s*을?\s*맞춰\s*줘?/g, ' ')
    .replace(/알람\s*설정\s*해\s*줘?/g, ' ')
    .replace(/깨워\s*줘?/g, ' ')
    .replace(/맞춰\s*줘?/g, ' ')
    .replace(/^(?:을|를|에)\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return { whenAt, label, rest }
}

export function wantsLocalAlarm(text: string): boolean {
  const t = text.trim()
  // How-to / encyclopedia 「…방법 알려줘」 is not a timed alarm
  if (/(예약하는\s*방법|예약하는\s*법|어떻게\s*예약|만드는\s*법|무슨\s*뜻)/.test(t)) return false
  if (/(방법|하는\s*법|어떻게)\s*알려줘/.test(t)) return false
  // Weather / air-quality asks use 「알려줘」 but are not reminders
  if (/(날씨|기온|미세먼지)/.test(t)) return false
  if (/(우산)\s*(필요|챙)/.test(t)) return false
  if (/비\s*(와|올|오나)/.test(t) && !/(알림|알람|리마인더)/.test(t)) return false
  // Everyday info asks also use 「알려줘」 — never treat as timed alarm
  if (
    /(환율|환전|뉴스|시세|주가|일정|할\s*일|메뉴|뜻|의미|인구|수도|정보|로또|주사위)/.test(t) &&
    !/(알림|알람|리마인더|\d+\s*(분|시간)\s*(뒤|후)|\d+\s*시)/.test(t)
  ) {
    return false
  }
  // Explicit alarm words / set-alarm verbs
  if (/알림|알람|리마인더|기억시켜|깨워\s*줘|맞춰\s*줘/.test(t)) return true
  // 「알려줘」 alone is too common (환율/뉴스/날씨…) — require a time cue
  if (
    /알려\s*줘|알려줘/.test(t) &&
    (/(\d+)\s*(분|시간)\s*(뒤|후)|(?:오전|오후)\s*\d+\s*시|\d+\s*시|내일|모레/.test(t))
  ) {
    return true
  }
  if (/(\d+)\s*(분|시간)\s*(뒤|후)/.test(t) && /(알려|알람|리마인더|기억)/.test(t)) return true
  if (/(오전|오후|내일).*\d+\s*시/.test(t) && /(알려|알람|알림|리마인더|맞춰|깨워)/.test(t)) return true
  return false
}

export function buildAlarmFromText(text: string, now = Date.now()): { alarm: LocalAlarm; whenLabel: string } | null {
  if (!wantsLocalAlarm(text)) return null
  const parsed = parseWhenFromText(text, now)
  if (!parsed) return null
  let body = parsed.rest || ''
  if (!body || /^(을|를|에|줘|해줘)$/.test(body) || body.length < 2) {
    body = /알람|깨워|기상/.test(text) ? '기상 알람' : '알림 시간입니다'
  }
  const alarm = scheduleAlarm('AIZIO 알림', body, parsed.whenAt)
  return { alarm, whenLabel: parsed.label }
}

/** User-facing confirmation after a local alarm is scheduled. */
export function formatAlarmSetReply(body: string, whenLabel: string, whenAt: number): string {
  const whenStr = formatWhenAt(whenAt)
  return [
    `알람을 맞춰 두었어요.`,
    `· ${body}`,
    `· ${whenStr} (${whenLabel})`,
    `시간에 알림·진동으로 알려 드릴게요. (앱이 열려 있거나 홈 화면 설치 시 더 확실해요)`,
  ].join('\n')
}
