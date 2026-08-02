import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyIntent } from './core-brain/intentClassifier'
import { clearBrainStateForTests, lastIntent, rememberTurn } from './core-brain/brainState'
import { processCoreBrain } from './core-brain'
import { parseReminderUtterance } from './smartReminder'
import { isCasualChatText } from './spokenCommand'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', { randomUUID: () => `id-${Math.random().toString(16).slice(2)}` })

describe('AIZIO Core Stability integration', () => {
  beforeEach(() => {
    store.clear()
    clearBrainStateForTests()
  })

  it('routes praise/thanks/emotion to general_chat (not STT / not reminder)', () => {
    for (const t of ['넌 정말 최고의 비서야.', '고마워.', '오늘 너무 피곤하다.', '대박ㅋㅋ.']) {
      expect(isCasualChatText(t)).toBe(true)
      const c = classifyIntent(t, 'ko')
      expect(c.intent).toBe('general_chat')
      expect(parseReminderUtterance(t)).toBeNull()
    }
  })

  it('does not treat bare 봤어/완료 as reminder complete', () => {
    expect(parseReminderUtterance('봤어')).toBeNull()
    expect(parseReminderUtterance('완료')).toBeNull()
    expect(parseReminderUtterance('확인했어')).toBeNull()
    expect(parseReminderUtterance('알림 완료했어')?.kind).toBe('complete')
  })

  it('does not steal 가족 일정 into smart reminder list', () => {
    expect(parseReminderUtterance('가족 일정 전부 보여줘')).toBeNull()
    expect(classifyIntent('가족 일정 보여줘', 'ko').intent).toBe('list_calendar')
  })

  it('music then praise stays general_chat; sticky music intent for clear follow-up', () => {
    rememberTurn('play_music', { mood: 'calm' }, '조용한 음악 틀어줘')
    const praise = classifyIntent('넌 최고야', 'ko')
    expect(praise.intent).toBe('general_chat')
    rememberTurn('general_chat', { social: true }, '넌 최고야')
    expect(lastIntent()).toBe('play_music')
    const next = classifyIntent('다음 곡', 'ko')
    expect(next.intent).toBe('control_music')
  })

  it('Core Brain handles relationship without AI provider', async () => {
    const r = await processCoreBrain({
      text: '우리 엄마 이름은 김영희야.',
      allowDuplicate: true,
    })
    expect(r.fallbackLegacy).toBe(false)
    expect(r.intent).toBe('remember_relationship')
    expect(r.responseText).toMatch(/김영희|엄마|어머니/)
  })

  it('unknown soft text becomes general_chat not skill error', () => {
    const c = classifyIntent('오늘 하늘이 참 예쁘다', 'ko')
    expect(c.intent).toBe('general_chat')
  })
})
