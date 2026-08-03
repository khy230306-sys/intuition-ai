/**
 * Generic localStorage list repository with schema version.
 * Life OS uses localStorage (IndexedDB not used by app data layer).
 */

export type StoreEnvelope<T> = {
  schemaVersion: number
  updatedAt: string
  items: T[]
}

export function loadStoreList<T>(key: string, _schemaVersion: number): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoreEnvelope<T> | T[]
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
      return parsed.items
    }
    return []
  } catch {
    return []
  }
}

export function saveStoreList<T>(
  key: string,
  schemaVersion: number,
  items: T[],
  max = 500,
): void {
  const envelope: StoreEnvelope<T> = {
    schemaVersion,
    updatedAt: new Date().toISOString(),
    items: items.slice(0, max),
  }
  localStorage.setItem(key, JSON.stringify(envelope))
}

export function clearStore(key: string): void {
  localStorage.removeItem(key)
}

/** Schema marker for Life OS migrations. */
export const LIFE_OS_SCHEMA_VERSION = 1
const META_KEY = 'aizio_life_schema_v1'

export function ensureLifeOsSchema(): number {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) {
      localStorage.setItem(META_KEY, JSON.stringify({ version: LIFE_OS_SCHEMA_VERSION }))
      return LIFE_OS_SCHEMA_VERSION
    }
    const v = (JSON.parse(raw) as { version?: number }).version || 1
    if (v < LIFE_OS_SCHEMA_VERSION) {
      localStorage.setItem(META_KEY, JSON.stringify({ version: LIFE_OS_SCHEMA_VERSION }))
    }
    return Math.max(v, LIFE_OS_SCHEMA_VERSION)
  } catch {
    return LIFE_OS_SCHEMA_VERSION
  }
}
