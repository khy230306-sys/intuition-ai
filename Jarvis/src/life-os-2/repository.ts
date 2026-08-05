/**
 * Life OS 2.0 localStorage repositories (app data layer is localStorage, not IndexedDB).
 * Schema marker: aizio_los2_schema_v1
 */

export const LIFE_OS2_SCHEMA_VERSION = 1
const META_KEY = 'aizio_los2_schema_v1'

export type Envelope<T> = {
  schemaVersion: number
  updatedAt: string
  items: T[]
}

export const LOS2_KEYS = {
  habits: 'aizio_los2_habits_v1',
  focus: 'aizio_los2_focus_v1',
  relationships: 'aizio_los2_relationships_v1',
  knowledge: 'aizio_los2_knowledge_v1',
  automations: 'aizio_los2_automations_v1',
  automationRuns: 'aizio_los2_automation_runs_v1',
  predictions: 'aizio_los2_predictions_v1',
  coaching: 'aizio_los2_coaching_v1',
  companion: 'aizio_los2_companion_v1',
  proactive: 'aizio_los2_proactive_v1',
  habitObservations: 'aizio_los2_habit_obs_v1',
  privacy: 'aizio_los2_privacy_v1',
} as const

export type Los2StoreKey = (typeof LOS2_KEYS)[keyof typeof LOS2_KEYS]

export function ensureLifeOs2Schema(): number {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) {
      localStorage.setItem(META_KEY, JSON.stringify({ version: LIFE_OS2_SCHEMA_VERSION }))
      return LIFE_OS2_SCHEMA_VERSION
    }
    const v = (JSON.parse(raw) as { version?: number }).version || 1
    if (v < LIFE_OS2_SCHEMA_VERSION) {
      localStorage.setItem(META_KEY, JSON.stringify({ version: LIFE_OS2_SCHEMA_VERSION }))
    }
    return Math.max(v, LIFE_OS2_SCHEMA_VERSION)
  } catch {
    return LIFE_OS2_SCHEMA_VERSION
  }
}

export function loadItems<T>(key: Los2StoreKey): T[] {
  ensureLifeOs2Schema()
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Envelope<T> | T[]
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) return parsed.items
    return []
  } catch {
    return []
  }
}

export function saveItems<T>(key: Los2StoreKey, items: T[], max = 200): void {
  ensureLifeOs2Schema()
  const envelope: Envelope<T> = {
    schemaVersion: LIFE_OS2_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    items: items.slice(0, max),
  }
  localStorage.setItem(key, JSON.stringify(envelope))
}

export function clearLos2Store(key: Los2StoreKey): void {
  localStorage.removeItem(key)
}

export function clearAllLos2Stores(): void {
  for (const k of Object.values(LOS2_KEYS)) localStorage.removeItem(k)
}

export function listLos2BackupKeys(): string[] {
  return [META_KEY, 'aizio_life_os2_flags_v1', ...Object.values(LOS2_KEYS)]
}

export function los2Id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
