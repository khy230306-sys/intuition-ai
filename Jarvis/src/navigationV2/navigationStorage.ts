import type { NavTravelMode, NavV2Settings, PlaceCandidate } from './types'

const SETTINGS_KEY = 'aizio.navV2.settings.v1'
const RECENT_KEY = 'aizio.navV2.recent.v1'
const FAV_KEY = 'aizio.navV2.favorites.v1'

function nowIso(): string {
  return new Date().toISOString()
}

export function loadNavV2Settings(): NavV2Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return {
        travelMode: 'driving',
        voiceEnabled: true,
        followHeading: true,
        externalMapDefault: 'kakao',
        updatedAt: nowIso(),
      }
    }
    const p = JSON.parse(raw) as Partial<NavV2Settings>
    return {
      travelMode: (p.travelMode as NavTravelMode) || 'driving',
      voiceEnabled: p.voiceEnabled !== false,
      followHeading: p.followHeading !== false,
      externalMapDefault: p.externalMapDefault || 'kakao',
      updatedAt: p.updatedAt || nowIso(),
    }
  } catch {
    return {
      travelMode: 'driving',
      voiceEnabled: true,
      followHeading: true,
      externalMapDefault: 'kakao',
      updatedAt: nowIso(),
    }
  }
}

export function saveNavV2Settings(next: Partial<NavV2Settings>): NavV2Settings {
  const cur = loadNavV2Settings()
  const merged = { ...cur, ...next, updatedAt: nowIso() }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
  return merged
}

export type RecentPlace = { query: string; name: string; at: number }

export function loadRecentSearches(): RecentPlace[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as RecentPlace[]
    return Array.isArray(arr) ? arr.slice(0, 10) : []
  } catch {
    return []
  }
}

export function pushRecentSearch(query: string, name?: string): void {
  const q = query.trim()
  if (!q) return
  const list = loadRecentSearches().filter((r) => r.query !== q)
  list.unshift({ query: q, name: name || q, at: Date.now() })
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)))
}

export function clearRecentSearches(): void {
  localStorage.removeItem(RECENT_KEY)
}

export function loadFavorites(): PlaceCandidate[] {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as PlaceCandidate[]
    return Array.isArray(arr) ? arr.slice(0, 30) : []
  } catch {
    return []
  }
}

export function addFavorite(place: PlaceCandidate): void {
  const list = loadFavorites().filter((p) => p.id !== place.id)
  list.unshift({ ...place, source: 'favorite' })
  localStorage.setItem(FAV_KEY, JSON.stringify(list.slice(0, 30)))
}

export function clearAllNavV2LocalData(): void {
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem(RECENT_KEY)
  localStorage.removeItem(FAV_KEY)
}

/** Diagnostics — no coordinates / full addresses */
export function navV2DiagSnapshot(): Record<string, unknown> {
  const s = loadNavV2Settings()
  return {
    travelMode: s.travelMode,
    voiceEnabled: s.voiceEnabled,
    recentCount: loadRecentSearches().length,
    favoriteCount: loadFavorites().length,
    externalMapDefault: s.externalMapDefault,
  }
}
