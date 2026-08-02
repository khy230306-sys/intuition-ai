import type { MusicProvider, MusicSearchParams, MusicSearchResult } from '../types'

/**
 * Test-only provider. Never used in production UI unless explicitly injected.
 * Returns a deterministic safe HTTPS search URL — not fake track metadata catalogs.
 */
export function createMockMusicProvider(): MusicProvider {
  return {
    id: 'youtube',
    label: 'Mock YouTube',
    async isAvailable() {
      return true
    },
    async search(params: MusicSearchParams) {
      const query = params.query.trim() || 'calm music playlist'
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      const track: MusicSearchResult = {
        id: `mock:${query}`,
        title: query,
        url,
        provider: 'youtube',
        isSearchUrl: true,
      }
      return { query, tracks: [track], provider: 'youtube', viaApi: false }
    },
    async play() {
      return { openedExternal: true }
    },
    async control() {
      return { ok: true }
    },
  }
}
