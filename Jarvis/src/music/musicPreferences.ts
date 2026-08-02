import type { MusicMood, MusicPreferences, MusicProviderId } from './types'

const KEY = 'jarvis.music.preferences.v1'

const DEFAULTS: MusicPreferences = {
  preferredMusicProvider: 'youtube',
  preferredMusicLanguage: 'ko',
  preferInstrumental: false,
  preferredMoods: [],
  explicitContentAllowed: false,
  openInExternalApp: false,
  rememberRecentMusicSearches: true,
  recentSearches: [],
}

function readRaw(): Partial<MusicPreferences> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<MusicPreferences>
  } catch {
    return {}
  }
}

export function loadMusicPreferences(): MusicPreferences {
  const raw = readRaw()
  return {
    ...DEFAULTS,
    ...raw,
    preferredMoods: Array.isArray(raw.preferredMoods) ? raw.preferredMoods : [],
    recentSearches: Array.isArray(raw.recentSearches) ? raw.recentSearches.slice(0, 20) : [],
    preferredMusicProvider: (raw.preferredMusicProvider || 'youtube') as MusicProviderId,
  }
}

export function saveMusicPreferences(prefs: MusicPreferences): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* ignore quota / private mode */
  }
}

export function updateMusicPreferences(patch: Partial<MusicPreferences>): MusicPreferences {
  const next = { ...loadMusicPreferences(), ...patch }
  saveMusicPreferences(next)
  return next
}

export function rememberMusicSearch(query: string): void {
  const prefs = loadMusicPreferences()
  if (!prefs.rememberRecentMusicSearches) return
  const q = query.trim()
  if (!q) return
  const recent = [q, ...prefs.recentSearches.filter((x) => x !== q)].slice(0, 20)
  saveMusicPreferences({ ...prefs, recentSearches: recent })
}

export function rememberPreferredMood(mood: MusicMood): void {
  if (!mood || mood === 'unknown') return
  const prefs = loadMusicPreferences()
  const preferredMoods = [mood, ...prefs.preferredMoods.filter((m) => m !== mood)].slice(0, 8)
  saveMusicPreferences({ ...prefs, preferredMoods })
}
