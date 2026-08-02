import { navigateHref } from '../../actions'
import { MusicSkillError } from '../musicErrors'
import type { MusicProvider, MusicProviderId, MusicSearchParams, MusicSearchResult } from '../types'

const ALLOWED = new Set([
  'open.spotify.com',
  'music.apple.com',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
])

export function isAllowedMusicUrl(url: string): boolean {
  try {
    const trimmed = url.trim()
    if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return false
    const u = new URL(trimmed)
    if (u.protocol !== 'https:') return false
    if (u.username || u.password) return false
    const host = u.hostname.toLowerCase()
    return ALLOWED.has(host)
  } catch {
    return false
  }
}

function searchUrlFor(provider: MusicProviderId, query: string): string {
  const q = encodeURIComponent(query.trim().slice(0, 120))
  switch (provider) {
    case 'spotify':
      return `https://open.spotify.com/search/${q}`
    case 'apple_music':
      return `https://music.apple.com/search?term=${q}`
    case 'youtube_music':
      return `https://music.youtube.com/search?q=${q}`
    case 'youtube':
    default:
      return `https://www.youtube.com/results?search_query=${q}`
  }
}

/**
 * Adapter for opening official web/search URLs of external music apps.
 * Does not fake OAuth or connected accounts.
 */
export function createExternalAppProvider(id: MusicProviderId): MusicProvider {
  const label =
    id === 'spotify' ? 'Spotify' : id === 'apple_music' ? 'Apple Music' : id === 'youtube_music' ? 'YouTube Music' : 'YouTube'
  return {
    id,
    label,
    async isAvailable() {
      return true
    },
    async search(params: MusicSearchParams) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new MusicSkillError('offline', 'No network')
      }
      const query = params.query.trim()
      if (!query) throw new MusicSkillError('no_results', 'Empty query')
      const url = searchUrlFor(id, query)
      if (!isAllowedMusicUrl(url)) throw new MusicSkillError('invalid_url', 'Blocked')
      const track: MusicSearchResult = {
        id: `${id}-search:${query}`,
        title: query,
        url,
        provider: id,
        isSearchUrl: true,
      }
      return { query, tracks: [track], provider: id, viaApi: false }
    },
    async play({ result, userGesture }) {
      if (!userGesture) throw new MusicSkillError('autoplay_blocked', 'User gesture required')
      if (!isAllowedMusicUrl(result.url)) throw new MusicSkillError('invalid_url', 'Blocked')
      const ok = navigateHref(result.url, { newTab: true })
      if (!ok) throw new MusicSkillError('external_app_missing', 'Could not open')
      return { openedExternal: true }
    },
    async control() {
      return { ok: false, reason: 'external_app' }
    },
  }
}
