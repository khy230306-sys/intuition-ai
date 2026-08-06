import type { VisionHistoryItem } from './types'

const KEY = 'aizio_vision_analysis_history_v1'
const SCHEMA_KEY = 'aizio_vision_schema_v1'
export const VISION_SCHEMA_VERSION = 1
const MAX = 40

export function ensureVisionSchema(): number {
  try {
    const raw = localStorage.getItem(SCHEMA_KEY)
    if (!raw) {
      localStorage.setItem(SCHEMA_KEY, JSON.stringify({ version: VISION_SCHEMA_VERSION }))
      return VISION_SCHEMA_VERSION
    }
    return Number((JSON.parse(raw) as { version?: number }).version) || 1
  } catch {
    return VISION_SCHEMA_VERSION
  }
}

export function loadVisionHistory(): VisionHistoryItem[] {
  ensureVisionSchema()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { items?: VisionHistoryItem[] } | VisionHistoryItem[]
    if (Array.isArray(parsed)) return parsed
    return Array.isArray(parsed.items) ? parsed.items : []
  } catch {
    return []
  }
}

export function saveVisionHistoryItem(item: VisionHistoryItem): void {
  ensureVisionSchema()
  const items = [item, ...loadVisionHistory().filter((x) => x.id !== item.id)].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify({ schemaVersion: VISION_SCHEMA_VERSION, items }))
}

export function deleteVisionHistoryItem(id: string): void {
  const items = loadVisionHistory().filter((x) => x.id !== id)
  localStorage.setItem(KEY, JSON.stringify({ schemaVersion: VISION_SCHEMA_VERSION, items }))
}

export function clearVisionHistory(): void {
  localStorage.removeItem(KEY)
}
