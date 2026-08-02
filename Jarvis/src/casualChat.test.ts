import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isCasualChatText,
  localCasualReply,
  looksLikeSttGarbage,
  stripDecorative,
} from './spokenCommand'
import { classifyIntent, clearBrainStateForTests, rememberTurn } from './core-brain'

const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => store.clear(),
})

vi.stubGlobal('crypto', {
  randomUUID: () => `id-${Math.random().toString(16).slice(2)}`,
})

describe('casual chat vs STT garbage', () => {
  beforeEach(() => {
    store.clear()
    clearBrainStateForTests()
  })

  const social = [
    '넌 정말 최고의 비서야',
    '넌 정말 최고의 비서야 👍',
    '고마워',
    '대박ㅋㅋ',
    '너 진짜 똑똑하다',
    '오늘 기분 좋아',
    '피곤하다',
    '안녕',
    '사랑해',
    '잘했어 ❤️',
  ]

  it('does not flag social phrases as STT garbage', () => {
    for (const s of social) {
      expect(looksLikeSttGarbage(s), s).toBe(false)
      expect(isCasualChatText(s), s).toBe(true)
    }
  })

  it('keeps emoji-stripped body for compliments', () => {
    expect(stripDecorative('넌 정말 최고의 비서야 👍')).toBe('넌 정말 최고의 비서야')
    expect(stripDecorative('잘했어 ❤️')).toMatch(/잘했어/)
  })

  it('still flags gibberish STT as garbage', () => {
    expect(looksLikeSttGarbage('대화식자제헤달')).toBe(true)
    expect(looksLikeSttGarbage('')).toBe(true)
    expect(looksLikeSttGarbage('   ')).toBe(true)
  })

  it('think() answers compliments without STT error copy', async () => {
    const { think } = await import('./brain')
    for (const s of ['넌 정말 최고의 비서야 👍', '고마워', '대박ㅋㅋ']) {
      const r = await think(s)
      expect(r.text, s).not.toMatch(/음성을|듣지 못|MIC|또박또박/)
      expect(r.text.length).toBeGreaterThan(4)
    }
  })

  it('music context does not steal compliments; follow-ups still work', async () => {
    const { think } = await import('./brain')
    rememberTurn('play_music', { mood: 'calm' }, '조용한 음악 틀어줘')
    expect(classifyIntent('넌 최고야', 'ko').intent).toBe('general_chat')
    expect(classifyIntent('고마워', 'ko').intent).toBe('general_chat')
    expect(classifyIntent('더 조용한 걸로', 'ko').intent).toBe('control_music')
    expect(classifyIntent('다음 곡', 'ko').intent).toBe('control_music')

    const praise = await think('넌 최고야')
    expect(praise.text).not.toMatch(/음성을|듣지 못/)
    expect(localCasualReply('넌 최고야')).toBeTruthy()
  })

  it('STT gibberish message is short; interpret hint only when locked', async () => {
    const { think } = await import('./brain')
    const r = await think('대화식자제헤달')
    expect(r.text).toMatch(/음성을 잘 듣지 못했어요/)
    expect(r.text).not.toMatch(/빨간/)
    expect(r.text).not.toMatch(/삼성전자 시세/)
  })
})
