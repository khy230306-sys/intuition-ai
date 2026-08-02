import { navigateHref } from '../../actions'
import { MusicSkillError } from '../musicErrors'
import type { MusicProvider, MusicProviderId, MusicSearchParams, MusicSearchResult } from '../types'

const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'])

export function isAllowedYoutubeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    return YT_HOSTS.has(u.hostname.toLowerCase())
  } catch {
    return false
  }
}

/** Safe YouTube search URL (no unofficial download / stream extraction). */
export function buildYoutubeSearchUrl(query: string, music = false): string {
  const q = encodeURIComponent(query.trim().slice(0, 120))
  if (music) return `https://music.youtube.com/search?q=${q}`
  return `https://www.youtube.com/results?search_query=${q}`
}

export function createYoutubeProvider(id: MusicProviderId = 'youtube'): MusicProvider {
  const musicHost = id === 'youtube_music'
  return {
    id,
    label: musicHost ? 'YouTube Music' : 'YouTube',
    async isAvailable() {
      return typeof navigator === 'undefined' ? true : navigator.onLine !== false
    },
    async search(params: MusicSearchParams) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new MusicSkillError('offline', 'No network for music search')
      }
      const query = params.query.trim()
      if (!query) throw new MusicSkillError('no_results', 'Empty query')

      // No YouTube Data API key in this build → single safe search link (not fake tracks).
      const url = buildYoutubeSearchUrl(query, musicHost || params.preferMusicHost === true)
      if (!isAllowedYoutubeUrl(url)) {
        throw new MusicSkillError('invalid_url', 'Blocked URL')
      }
      const track: MusicSearchResult = {
        id: `yt-search:${query}`,
        title: query,
        url,
        provider: id,
        isSearchUrl: true,
      }
      return { query, tracks: [track], provider: id, viaApi: false }
    },
    async play({ result, userGesture }) {
      if (!userGesture) {
        throw new MusicSkillError('autoplay_blocked', 'User gesture required')
      }
      if (!isAllowedYoutubeUrl(result.url)) {
        throw new MusicSkillError('invalid_url', 'Blocked URL')
      }
      const ok = navigateHref(result.url, { newTab: true })
      if (!ok) {
        throw new MusicSkillError('external_app_missing', 'Could not open URL')
      }
      return { openedExternal: true }
    },
    async control() {
      return { ok: false, reason: 'external_app' }
    },
  }
}
