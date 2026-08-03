import type { PushScheduleStatus, SmartReminder } from './types'

const KEY = 'jarvis_smart_reminders_v1'
const CTX_KEY = 'jarvis_smart_reminder_ctx_v1'
const MIGRATED_KEY = 'jarvis_smart_reminders_push_migrated_v1'

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `srem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function migrateItem(r: SmartReminder): SmartReminder {
  const pushScheduleStatus: PushScheduleStatus = r.pushScheduleStatus || 'not_applicable'
  return {
    ...r,
    previewMode: r.previewMode || 'simple',
    pushScheduleStatus,
    serverScheduleId: r.serverScheduleId ?? null,
    lastPushSyncAt: r.lastPushSyncAt ?? null,
    pushSyncErrorCode: r.pushSyncErrorCode ?? null,
  }
}

function read(): SmartReminder[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as SmartReminder[]
    return items.map(migrateItem)
  } catch {
    return []
  }
}

function write(items: SmartReminder[]): void {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 120)))
}

/** One-time rewrite so older reminders gain push fields without data loss. */
export function migrateSmartRemindersPushFields(): { migrated: number } {
  try {
    if (localStorage.getItem(MIGRATED_KEY) === '1') return { migrated: 0 }
    const items = read()
    write(items.map(migrateItem))
    localStorage.setItem(MIGRATED_KEY, '1')
    return { migrated: items.length }
  } catch {
    return { migrated: 0 }
  }
}

export function loadSmartReminders(): SmartReminder[] {
  migrateSmartRemindersPushFields()
  return read()
}

export function saveSmartReminder(item: SmartReminder): void {
  const items = read().filter((r) => r.id !== item.id)
  items.unshift(migrateItem(item))
  write(items)
}

export function getSmartReminder(id: string): SmartReminder | null {
  return read().find((r) => r.id === id) || null
}

export function updateSmartReminder(id: string, patch: Partial<SmartReminder>): SmartReminder | null {
  const items = read()
  const found = items.find((r) => r.id === id)
  if (!found) return null
  Object.assign(found, patch, { updatedAt: new Date().toISOString() })
  write(items.map(migrateItem))
  return migrateItem(found)
}

export function createSmartReminderId(): string {
  return uid()
}

export function findDuplicate(input: {
  title: string
  scheduledAtMs: number
  personDisplay?: string | null
}): SmartReminder | null {
  const windowMs = 2 * 60_000
  return (
    read().find(
      (r) =>
        r.status === 'scheduled' &&
        Math.abs(r.scheduledAtMs - input.scheduledAtMs) < windowMs &&
        r.title === input.title &&
        (r.personDisplay || '') === (input.personDisplay || ''),
    ) || null
  )
}

export function setLastReminderContext(id: string): void {
  localStorage.setItem(CTX_KEY, JSON.stringify({ id, at: Date.now() }))
}

export function getLastReminderContext(maxAgeMs = 15 * 60_000): string | null {
  try {
    const raw = localStorage.getItem(CTX_KEY)
    if (!raw) return null
    const j = JSON.parse(raw) as { id: string; at: number }
    if (Date.now() - j.at > maxAgeMs) return null
    return j.id
  } catch {
    return null
  }
}

export function listActiveReminders(): SmartReminder[] {
  return read().filter((r) => r.status === 'scheduled' || r.status === 'snoozed')
}

export function listForPerson(displayOrRelation: string): SmartReminder[] {
  const q = displayOrRelation.trim()
  return listActiveReminders().filter(
    (r) =>
      r.personDisplay === q ||
      r.personRelation === q ||
      (r.title && r.title.includes(q)) ||
      (r.personDisplay && q.includes(r.personDisplay)),
  )
}
