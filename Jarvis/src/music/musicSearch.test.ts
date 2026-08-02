import { describe, expect, it } from 'vitest'
import { assertSafeMusicUrl, sanitizeMusicTitle } from './musicSearch'
import { MusicSkillError } from './musicErrors'
import { createMockMusicProvider } from './providers/mockMusicProvider'
import { registerMusicProvider, getMusicProvider } from './musicProvider'
import { isAllowedMusicUrl } from './providers/externalAppProvider'
import { buildYoutubeSearchUrl, isAllowedYoutubeUrl } from './providers/youtubeProvider'

describe('music URL security', () => {
  it('allows official HTTPS music hosts', () => {
    expect(isAllowedYoutubeUrl('https://www.youtube.com/results?search_query=calm')).toBe(true)
    expect(isAllowedMusicUrl('https://music.youtube.com/search?q=a')).toBe(true)
    expect(isAllowedMusicUrl('https://open.spotify.com/search/calm')).toBe(true)
    expect(isAllowedMusicUrl('https://music.apple.com/search?term=calm')).toBe(true)
  })

  it('blocks javascript / data / random hosts', () => {
    expect(() => assertSafeMusicUrl('javascript:alert(1)')).toThrow(MusicSkillError)
    expect(() => assertSafeMusicUrl('data:text/html,hi')).toThrow(MusicSkillError)
    expect(() => assertSafeMusicUrl('https://evil.example/x')).toThrow(MusicSkillError)
    expect(isAllowedMusicUrl('http://www.youtube.com/watch?v=x')).toBe(false)
  })

  it('sanitizes titles for XSS', () => {
    expect(sanitizeMusicTitle('<img onerror=alert(1)>')).not.toContain('<')
  })

  it('builds youtube search urls', () => {
    const u = buildYoutubeSearchUrl('조용한 음악 플레이리스트')
    expect(u.startsWith('https://www.youtube.com/results?')).toBe(true)
    expect(isAllowedYoutubeUrl(u)).toBe(true)
  })

  it('mock provider returns search link not fake catalog tracks', async () => {
    registerMusicProvider(createMockMusicProvider())
    const p = getMusicProvider('youtube')
    const bundle = await p.search({ query: 'focus playlist' })
    expect(bundle.viaApi).toBe(false)
    expect(bundle.tracks[0]?.isSearchUrl).toBe(true)
    expect(bundle.tracks[0]?.url).toContain('youtube.com')
  })
})
