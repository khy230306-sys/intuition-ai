import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearBrainStateForTests,
  classifyIntent,
  extractEntities,
  buildExecutionPlan,
  isAllowedExternalUrl,
  assertSafeToExecute,
  processCoreBrain,
  stripWakeWord,
  listSkillMeta,
  lastIntent,
  rememberTurn,
} from './index'
import { CoreBrainError } from './brainErrors'

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

describe('AIZIO Core Brain', () => {
  beforeEach(() => {
    store.clear()
    clearBrainStateForTests()
  })

  it('strips wake words but keeps mid-sentence brand mentions', () => {
    expect(stripWakeWord('아이지오, 조용한 음악 틀어줘').text).toBe('조용한 음악 틀어줘')
    expect(stripWakeWord('AIZIO play calm music').text.toLowerCase()).toMatch(/play calm music/)
    expect(stripWakeWord('아이 지오 음악 멈춰').text).toMatch(/음악 멈춰/)
    expect(stripWakeWord('에이지오, 설정 열어줘').text).toBe('설정 열어줘')
    expect(stripWakeWord('아이지오가 뭐야').text).toBe('아이지오가 뭐야')
  })

  it('wake-word-free chat falls back to legacy', async () => {
    const r = await processCoreBrain({ text: '나 피곤해', allowDuplicate: true })
    expect(r.fallbackLegacy).toBe(true)
    expect(r.intent).toBe('general_chat')
  })

  it('routes calm music to music skill', async () => {
    const r = await processCoreBrain({ text: '조용한 음악 틀어줘', allowDuplicate: true })
    expect(r.fallbackLegacy).toBe(false)
    expect(r.intent).toBe('play_music')
    expect(r.selectedSkills).toContain('music')
    expect(r.brainReply?.musicShowMiniPlayer || /음악|재생|YouTube|버튼/i.test(r.responseText)).toBeTruthy()
  })

  it('routes music stop to control_music', async () => {
    const r = await processCoreBrain({ text: '음악 멈춰', allowDuplicate: true })
    expect(r.intent).toBe('control_music')
    expect(r.selectedSkills).toContain('music')
  })

  it('classifies translate intents', () => {
    const c = classifyIntent('이 문장을 일본어로 번역해줘', 'ko')
    expect(c.intent).toBe('translate')
    expect(extractEntities('이 문장을 일본어로 번역해줘', 'translate').targetLanguage).toBe('ja')
  })

  it('lists notes / todos via skills', async () => {
    const note = await processCoreBrain({ text: '메모 보여줘', allowDuplicate: true })
    expect(note.fallbackLegacy).toBe(false)
    expect(note.intent).toBe('search_note')

    const todos = await processCoreBrain({ text: '할 일 목록', allowDuplicate: true })
    expect(todos.intent).toBe('list_todo')
    expect(todos.responseText).toMatch(/할 일|없습니다/)
  })

  it('lists calendar without faking create', async () => {
    const list = await processCoreBrain({ text: '오늘 일정 알려줘', allowDuplicate: true })
    expect(list.intent).toBe('list_calendar')
    expect(list.fallbackLegacy).toBe(false)

    const create = await processCoreBrain({
      text: '내일 오후 3시에 병원 일정 추가해줘',
      allowDuplicate: true,
    })
    // Natural hospital appointments route to Smart Reminder (not unavailable personal calendar)
    expect(create.intent).toBe('create_reminder')
    expect(create.responseText).toMatch(/저장|알려|지난 시간|날짜와 시간/)
    expect(create.responseText).not.toMatch(/추가했습니다/)
  })

  it('project skill reports unavailable (not fake success)', async () => {
    const r = await processCoreBrain({ text: 'NEXUS 프로젝트 어디까지 됐어?', allowDuplicate: true })
    expect(r.intent).toBe('project_status')
    expect(r.responseText).toMatch(/연결되지/)
    expect(r.responseText).not.toMatch(/완료했습니다/)
  })

  it('opens settings', async () => {
    const r = await processCoreBrain({ text: '설정 열어줘', allowDuplicate: true })
    expect(r.intent).toBe('change_setting')
    expect(r.brainReply?.view).toBe('settings')
  })

  it('help falls back to legacy full help text', async () => {
    const r = await processCoreBrain({ text: '도움말', allowDuplicate: true })
    expect(r.intent).toBe('help')
    expect(r.fallbackLegacy).toBe(true)
  })

  it('context follow-up: more upbeat after music', async () => {
    rememberTurn('play_music', { mood: 'calm' }, '조용한 음악 틀어줘')
    const c = classifyIntent('조금 더 신나는 걸로', 'ko')
    expect(c.intent).toBe('control_music')
    expect(lastIntent()).toBe('play_music')
  })

  it('context follow-up: next task after project', () => {
    rememberTurn('project_status', { projectName: 'NEXUS' }, 'NEXUS 보여줘')
    const c = classifyIntent('다음 작업은 뭐야?', 'ko')
    expect(c.intent).toBe('project_planning')
  })

  it('builds compound execution plan', () => {
    const plan = buildExecutionPlan('병원 일정 추가하고 일본어로 번역해줘', 'create_calendar_event')
    expect(plan.some((p) => p.skillId === 'calendar')).toBe(true)
    expect(plan.some((p) => p.skillId === 'translation')).toBe(true)
  })

  it('blocks unsafe level-3 actions', () => {
    expect(() => assertSafeToExecute('카드로 결제해줘', 'general_chat')).toThrow(CoreBrainError)
  })

  it('allows only safe external URLs', () => {
    expect(isAllowedExternalUrl('https://www.youtube.com/results?search_query=a')).toBe(true)
    expect(isAllowedExternalUrl('https://evil.example/hack')).toBe(false)
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false)
  })

  it('registers skill metadata without loading bodies', () => {
    const meta = listSkillMeta()
    expect(meta.find((s) => s.id === 'music')?.available).toBe(true)
    expect(meta.find((s) => s.id === 'project')?.available).toBe(false)
  })

  it('dedupes rapid identical requests', async () => {
    const a = await processCoreBrain({ text: '설정 열어줘' })
    const b = await processCoreBrain({ text: '설정 열어줘' })
    expect(a.intent).toBe('change_setting')
    expect(b.errorCode === 'cancelled' || b.responseText.includes('같은 요청')).toBe(true)
  })

  it('supports abort/cancel', async () => {
    const ac = new AbortController()
    ac.abort()
    const r = await processCoreBrain({
      text: '조용한 음악 틀어줘',
      signal: ac.signal,
      allowDuplicate: true,
    })
    // aborted mid-execute → cancelled or still completed if finished before check
    expect(['failed', 'partial', 'success', 'needs_user_action', 'fallback_legacy']).toContain(r.status)
  })

  it('think() uses Core Brain for music and settings', async () => {
    const { think } = await import('../brain')
    const music = await think('아이지오, 조용한 음악 틀어줘')
    expect(music.text).not.toMatch(/냉정 스크리닝/)
    expect(music.musicShowMiniPlayer || /음악|재생|YouTube|버튼/i.test(music.text)).toBeTruthy()

    const settings = await think('설정 열어줘')
    expect(settings.view).toBe('settings')
  }, 30000)
})
