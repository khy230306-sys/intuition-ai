import { describe, expect, it } from 'vitest'
import { isMusicMiniPlayerActive, renderMusicMiniPlayer } from './components/MusicMiniPlayer'
import type { MusicSession } from './types'

function session(partial: Partial<MusicSession>): MusicSession {
  return {
    status: 'idle',
    provider: 'youtube',
    query: '',
    title: null,
    url: null,
    results: [],
    resultIndex: 0,
    startedAt: null,
    lastAction: null,
    volume: 0.8,
    ...partial,
  }
}

describe('music mini player visibility', () => {
  it('hides when not visible or idle/stopped', () => {
    expect(isMusicMiniPlayerActive(session({ status: 'ready', query: 'lofi' }), false)).toBe(false)
    expect(isMusicMiniPlayerActive(session({ status: 'idle', query: 'lofi' }), true)).toBe(false)
    expect(isMusicMiniPlayerActive(session({ status: 'stopped', query: 'lofi' }), true)).toBe(false)
    expect(renderMusicMiniPlayer(session({ status: 'opened_external', query: 'lofi' }), false)).toBe('')
  })

  it('shows only for an active music request', () => {
    expect(
      isMusicMiniPlayerActive(
        session({ status: 'opened_external', query: '조용한 음악', title: 'lofi', url: 'https://www.youtube.com/results?search_query=lofi' }),
        true,
      ),
    ).toBe(true)
    expect(
      renderMusicMiniPlayer(
        session({ status: 'ready', query: 'lofi', url: 'https://www.youtube.com/results?search_query=lofi' }),
        true,
      ),
    ).toMatch(/music-mini|음악 재생|YouTube/)
  })
})
