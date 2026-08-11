/** Minimal local alarm helper for Campus standalone. */

export type LocalAlarm = {
  id: string
  title: string
  body: string
  whenAt: number
  fired: boolean
  createdAt: number
}

const KEY = 'aizio_campus_local_alarms_v1'
const timers = new Map<string, number>()

function readAlarms(): LocalAlarm[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as LocalAlarm[]
  } catch {
    return []
  }
}

function writeAlarms(items: LocalAlarm[]): void {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 80)))
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      /* ignore */
    }
  }
  return Notification.permission
}

function fire(alarm: LocalAlarm): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(alarm.title, { body: alarm.body, tag: alarm.id })
    } catch {
      /* ignore */
    }
  }
}

function armTimer(alarm: LocalAlarm): void {
  const delay = Math.max(0, alarm.whenAt - Date.now())
  if (delay > 2_147_000_000) return
  const t = window.setTimeout(() => {
    const items = readAlarms()
    const hit = items.find((a) => a.id === alarm.id)
    if (hit && !hit.fired) {
      hit.fired = true
      writeAlarms(items)
      fire(hit)
    }
    timers.delete(alarm.id)
  }, delay)
  timers.set(alarm.id, t)
}

export function scheduleAlarm(title: string, body: string, whenAt: number): LocalAlarm {
  const alarm: LocalAlarm = {
    id: crypto.randomUUID(),
    title: title.trim() || 'AIZIO CAMPUS',
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

export function rehydrateAlarms(): void {
  for (const a of readAlarms()) {
    if (!a.fired && a.whenAt > Date.now()) armTimer(a)
  }
}
