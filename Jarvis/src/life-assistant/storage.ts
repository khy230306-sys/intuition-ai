import type { LifeAssistantPrefs, ParkingMemory } from './types'

export const LIFE_ASSISTANT_SCHEMA_VERSION = 1

const PREFS_KEY = 'aizio_life_assistant_prefs_v1'
const PARKING_KEY = 'aizio_parking_memory_v1'
const SCHEMA_KEY = 'aizio_life_assistant_schema_v1'

export function ensureLifeAssistantSchema(): number {
  try {
    const raw = localStorage.getItem(SCHEMA_KEY)
    if (!raw) {
      localStorage.setItem(SCHEMA_KEY, JSON.stringify({ version: LIFE_ASSISTANT_SCHEMA_VERSION }))
      return LIFE_ASSISTANT_SCHEMA_VERSION
    }
    const v = Number((JSON.parse(raw) as { version?: number }).version) || 1
    if (v < LIFE_ASSISTANT_SCHEMA_VERSION) {
      localStorage.setItem(SCHEMA_KEY, JSON.stringify({ version: LIFE_ASSISTANT_SCHEMA_VERSION }))
    }
    return Math.max(v, LIFE_ASSISTANT_SCHEMA_VERSION)
  } catch {
    return LIFE_ASSISTANT_SCHEMA_VERSION
  }
}

export function loadLifeAssistantPrefs(): LifeAssistantPrefs {
  ensureLifeAssistantSchema()
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) {
      return { schemaVersion: LIFE_ASSISTANT_SCHEMA_VERSION, briefingEnabled: true, updatedAt: Date.now() }
    }
    const p = JSON.parse(raw) as Partial<LifeAssistantPrefs>
    return {
      schemaVersion: LIFE_ASSISTANT_SCHEMA_VERSION,
      briefingEnabled: p.briefingEnabled !== false,
      updatedAt: Number(p.updatedAt) || Date.now(),
    }
  } catch {
    return { schemaVersion: LIFE_ASSISTANT_SCHEMA_VERSION, briefingEnabled: true, updatedAt: Date.now() }
  }
}

export function saveLifeAssistantPrefs(patch: Partial<LifeAssistantPrefs>): LifeAssistantPrefs {
  const next = { ...loadLifeAssistantPrefs(), ...patch, schemaVersion: LIFE_ASSISTANT_SCHEMA_VERSION, updatedAt: Date.now() }
  localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  return next
}

export function loadParkingMemory(): ParkingMemory | null {
  ensureLifeAssistantSchema()
  try {
    const raw = localStorage.getItem(PARKING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as ParkingMemory
    if (!p || typeof p !== 'object' || !p.id) return null
    return p
  } catch {
    return null
  }
}

export function saveParkingMemory(input: Omit<ParkingMemory, 'id' | 'savedAt'> & { id?: string }): ParkingMemory {
  ensureLifeAssistantSchema()
  const item: ParkingMemory = {
    id: input.id || `park_${Date.now().toString(36)}`,
    label: String(input.label || '주차 위치').trim() || '주차 위치',
    note: String(input.note || '').trim(),
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    savedAt: Date.now(),
    source: input.source,
  }
  localStorage.setItem(PARKING_KEY, JSON.stringify(item))
  return item
}

export function clearParkingMemory(): void {
  localStorage.removeItem(PARKING_KEY)
}
