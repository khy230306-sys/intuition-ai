/** Recent feature usage for Home — no PII titles. */

import { getFeatureById, type FeatureEntry } from './featureCatalog'

const KEY = 'aizio_recent_features_v1'
const MAX = 4

export type RecentFeature = { id: string; at: number }

function loadRaw(): RecentFeature[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as RecentFeature[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function save(list: RecentFeature[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* ignore */
  }
}

export function recordRecentFeature(id: string): void {
  const feat = getFeatureById(id)
  if (!feat || feat.excludeFromRecent) return
  const next = [{ id, at: Date.now() }, ...loadRaw().filter((x) => x.id !== id)].slice(0, MAX)
  save(next)
}

export function listRecentFeatures(): FeatureEntry[] {
  return loadRaw()
    .map((r) => getFeatureById(r.id))
    .filter((f): f is FeatureEntry => Boolean(f))
}

export function clearRecentFeatures(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
