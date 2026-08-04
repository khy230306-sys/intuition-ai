import type { MapProviderId, NavigationSettings, SavedPlace, TravelMode } from './navigationTypes'

const KEY = 'aizio.navigation.settings.v1'
const SESSION_KEY = 'aizio.navigation.session.v1'

function nowIso(): string {
  return new Date().toISOString()
}

function emptySettings(): NavigationSettings {
  return {
    // Korea-first: Kakao handles Korean POI names better than Apple/Google.
    defaultMap: 'kakao',
    defaultTravelMode: 'driving',
    home: null,
    work: null,
    favorites: [],
    updatedAt: nowIso(),
  }
}

export function loadNavigationSettings(): NavigationSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptySettings()
    const parsed = JSON.parse(raw) as Partial<NavigationSettings>
    return {
      defaultMap: (parsed.defaultMap as MapProviderId) || 'kakao',
      defaultTravelMode: (parsed.defaultTravelMode as TravelMode) || 'driving',
      home: parsed.home && typeof parsed.home === 'object' ? (parsed.home as SavedPlace) : null,
      work: parsed.work && typeof parsed.work === 'object' ? (parsed.work as SavedPlace) : null,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      updatedAt: parsed.updatedAt || nowIso(),
    }
  } catch {
    return emptySettings()
  }
}

export function saveNavigationSettings(next: NavigationSettings): void {
  const payload: NavigationSettings = { ...next, updatedAt: nowIso() }
  localStorage.setItem(KEY, JSON.stringify(payload))
}

export function updateNavigationSettings(patch: Partial<NavigationSettings>): NavigationSettings {
  const cur = loadNavigationSettings()
  const next = { ...cur, ...patch, updatedAt: nowIso() }
  saveNavigationSettings(next)
  return next
}

export function setSavedPlace(
  kind: 'home' | 'work' | 'favorite',
  input: { label?: string; addressText: string; placeName?: string },
): NavigationSettings {
  const cur = loadNavigationSettings()
  const place: SavedPlace = {
    id: kind === 'favorite' ? `fav_${Date.now()}` : kind,
    label: input.label || (kind === 'home' ? '집' : kind === 'work' ? '회사' : '즐겨찾기'),
    addressText: String(input.addressText || '').trim().slice(0, 200),
    placeName: String(input.placeName || input.addressText || '').trim().slice(0, 120),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  if (kind === 'home') return updateNavigationSettings({ home: place })
  if (kind === 'work') return updateNavigationSettings({ work: place })
  return updateNavigationSettings({ favorites: [...cur.favorites, place].slice(0, 20) })
}

export function clearSavedPlace(kind: 'home' | 'work'): NavigationSettings {
  if (kind === 'home') return updateNavigationSettings({ home: null })
  return updateNavigationSettings({ work: null })
}

export function removeFavorite(id: string): NavigationSettings {
  const cur = loadNavigationSettings()
  return updateNavigationSettings({ favorites: cur.favorites.filter((f) => f.id !== id) })
}

export type NavSession = {
  destinationText: string
  travelMode: TravelMode
  preferredMap: MapProviderId
  at: number
}

/** Short-lived last navigation context (sessionStorage). */
export function loadNavSession(): NavSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as NavSession
    if (!s?.destinationText || Date.now() - (s.at || 0) > 30 * 60_000) return null
    return s
  } catch {
    return null
  }
}

export function saveNavSession(s: Omit<NavSession, 'at'>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, at: Date.now() }))
  } catch {
    /* ignore */
  }
}

export function clearNavSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/** Diagnostics-safe snapshot — never includes full addresses. */
export function navigationDiagSnapshot(): Record<string, unknown> {
  const s = loadNavigationSettings()
  return {
    defaultMap: s.defaultMap,
    defaultTravelMode: s.defaultTravelMode,
    hasHome: Boolean(s.home?.addressText),
    hasWork: Boolean(s.work?.addressText),
    favoriteCount: s.favorites.length,
    sessionActive: Boolean(loadNavSession()),
  }
}
