import { loadItems, saveItems, LOS2_KEYS, los2Id, nowIso } from '../repository'
import type { Prediction } from './predictionTypes'

export function loadPredictions(): Prediction[] {
  return loadItems<Prediction>(LOS2_KEYS.predictions)
}

export function savePredictions(items: Prediction[]): void {
  saveItems(LOS2_KEYS.predictions, items, 80)
}

export function pruneExpired(now = Date.now()): Prediction[] {
  const kept = loadPredictions().filter((p) => Date.parse(p.validUntil) > now)
  savePredictions(kept)
  return kept
}

export function wasRecentlyEmitted(type: string, title: string, withinMs = 86_400_000): boolean {
  const t = title.slice(0, 80)
  return loadPredictions().some(
    (p) => p.type === type && p.title.slice(0, 80) === t && Date.now() - Date.parse(p.createdAt) < withinMs,
  )
}

export function rememberPrediction(p: Omit<Prediction, 'id' | 'createdAt'>): Prediction {
  const full: Prediction = { ...p, id: los2Id('pred'), createdAt: nowIso() }
  const items = pruneExpired()
  items.unshift(full)
  savePredictions(items)
  return full
}
