import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildMyScoreCard,
  encodeScoreCard,
  getArcadePlayerId,
  getArcadePlayerName,
  importScoreCard,
  parseScoreCard,
  rankingForGame,
  setArcadePlayerName,
  upsertArcadeEntry,
} from './arcadeRank'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', {
  randomUUID: () => `pid-${store.size}`,
})

describe('arcade rank share', () => {
  beforeEach(() => store.clear())

  it('encodes and parses score cards', () => {
    const payload = encodeScoreCard({
      v: 1,
      game: 'breakout',
      score: 42,
      level: 3,
      name: '민수',
      playerId: 'abc-123',
      at: 1_700_000_000_000,
    })
    expect(payload.startsWith('JARVIS-ARCADE|v1|breakout|')).toBe(true)
    const parsed = parseScoreCard(payload)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.card.score).toBe(42)
    expect(parsed.card.level).toBe(3)
    expect(parsed.card.name).toBe('민수')
  })

  it('builds ranking from shared friend scores', () => {
    setArcadePlayerName('나')
    store.set(
      'jarvis.arcade.best.v1',
      JSON.stringify({ breakout: 30, shooter: null, flappy: null, dodge: null, pong: null }),
    )
    store.set(
      'jarvis.arcade.bestLevel.v1',
      JSON.stringify({ breakout: 2, shooter: null, flappy: null, dodge: null, pong: null }),
    )
    const me = getArcadePlayerId()
    expect(getArcadePlayerName()).toBe('나')

    importScoreCard(
      encodeScoreCard({
        v: 1,
        game: 'breakout',
        score: 90,
        level: 5,
        name: '친구A',
        playerId: 'friend-a',
        at: Date.now(),
      }),
    )
    importScoreCard(
      encodeScoreCard({
        v: 1,
        game: 'breakout',
        score: 50,
        level: 3,
        name: '친구B',
        playerId: 'friend-b',
        at: Date.now(),
      }),
    )

    const ranks = rankingForGame('breakout')
    expect(ranks[0].name).toBe('친구A')
    expect(ranks[0].score).toBe(90)
    expect(ranks.map((r) => r.playerId)).toContain(me)
    expect(ranks.find((r) => r.playerId === me)?.score).toBe(30)
  })

  it('keeps higher score on re-import', () => {
    upsertArcadeEntry({
      playerId: 'f1',
      name: 'Kim',
      game: 'flappy',
      score: 10,
      level: 2,
      source: 'import',
    })
    upsertArcadeEntry({
      playerId: 'f1',
      name: 'Kim',
      game: 'flappy',
      score: 8,
      level: 4,
      source: 'import',
    })
    upsertArcadeEntry({
      playerId: 'f1',
      name: 'Kim2',
      game: 'flappy',
      score: 12,
      level: 3,
      source: 'import',
    })
    const ranks = rankingForGame('flappy')
    expect(ranks[0].score).toBe(12)
    expect(ranks[0].name).toBe('Kim2')
  })

  it('parses full Kakao share message (not only bare pipe code)', () => {
    const kakao = `JARVIS 아케이드 기록 · 플래피
나 · Lv.6 · SCORE 25

친구 기기 게임 탭 → 친구 기록 받기 에 붙여넣기
JARVIS-ARCADE|v1|flappy|25|6|나|ef4cd28c-e755-43fd-8568-0dcf771d4ef7|1785390605583`
    const parsed = parseScoreCard(kakao)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.card.game).toBe('flappy')
    expect(parsed.card.score).toBe(25)
    expect(parsed.card.level).toBe(6)
    expect(parsed.card.playerId).toBe('ef4cd28c-e755-43fd-8568-0dcf771d4ef7')

    const result = importScoreCard(kakao)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.entry.score).toBe(25)
    const ranks = rankingForGame('flappy')
    expect(ranks.some((r) => r.playerId === 'ef4cd28c-e755-43fd-8568-0dcf771d4ef7' && r.score === 25)).toBe(true)
  })

  it('returns null card when no personal best', () => {
    expect(buildMyScoreCard('pong')).toBeNull()
  })
})
