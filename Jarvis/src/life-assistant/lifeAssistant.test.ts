import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyLifeAssistantRules } from './intentRules'
import { parseLifeAssistantIntentJson } from './schema'
import { routeLifeAssistantIntent } from './intentRouter'
import {
  executeLifeAssistantIntent,
  forgetParkingForTests,
  tryHandleLifeAssistant,
} from './executor'
import { clearParkingMemory, loadParkingMemory, saveParkingMemory } from './storage'
import { buildLifeBriefing } from './briefing'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR' })

describe('life assistant intent rules', () => {
  it('classifies today calendar read', () => {
    const r = classifyLifeAssistantRules('오늘 일정 알려줘')
    expect(r?.intent).toBe('calendar.read')
    expect(r!.confidence).toBeGreaterThan(0.85)
  })

  it('extracts date/time for hospital create', () => {
    const r = classifyLifeAssistantRules('내일 오후 3시에 병원 예약 추가해줘')
    expect(r?.intent).toBe('calendar.create')
    expect(r?.time).toMatch(/15:00/)
    expect(r?.date).toBeTruthy()
  })

  it('classifies reminder with offset', () => {
    const r = classifyLifeAssistantRules('30분 뒤에 약 먹으라고 알려줘')
    expect(r?.intent).toBe('reminder.create')
    expect(r?.reminderOffset).toBe('30m')
  })

  it('classifies parking save/read', () => {
    expect(classifyLifeAssistantRules('주차 위치 기억해줘')?.intent).toBe('parking.save')
    expect(classifyLifeAssistantRules('내가 주차한 곳 알려줘')?.intent).toBe('parking.read')
  })

  it('classifies translation mode and camera open', () => {
    expect(classifyLifeAssistantRules('지금부터 번역 모드로 바꿔줘')?.intent).toBe('translation.enable')
    expect(classifyLifeAssistantRules('이 문서를 읽어줘')?.intent).toBe('camera.open')
  })

  it('classifies family schedule and daily summary', () => {
    expect(classifyLifeAssistantRules('가족 일정 보여줘')?.intent).toBe('family.schedule.read')
    expect(classifyLifeAssistantRules('오늘 하루 요약해줘')?.intent).toBe('daily.summary')
  })

  it('classifies priority todos', () => {
    expect(classifyLifeAssistantRules('해야 할 일을 우선순위대로 정리해줘')?.intent).toBe('task.read')
  })
})

describe('life assistant JSON healing', () => {
  it('recovers trailing commas and single quotes', () => {
    const parsed = parseLifeAssistantIntentJson(`{
      'intent': 'calendar.read',
      'confidence': 0.9,
      'extractedEntities': {},
      'sourceText': '오늘 일정',
      'requiresConfirmation': false,
      'missingFields': [],
    }`)
    expect(parsed?.intent).toBe('calendar.read')
  })

  it('returns null for garbage', () => {
    expect(parseLifeAssistantIntentJson('not json')).toBeNull()
  })
})

describe('life assistant execution', () => {
  beforeEach(() => {
    store.clear()
    forgetParkingForTests()
    clearParkingMemory()
  })

  it('saves and reads parking manually', async () => {
    saveParkingMemory({ label: 'B2-15', note: 'B2-15', lat: null, lng: null, source: 'manual' })
    const read = await tryHandleLifeAssistant('내가 주차한 곳 알려줘')
    expect(read?.text).toMatch(/B2-15/)
    expect(loadParkingMemory()?.label).toBe('B2-15')
  })

  it('enables translation mode', async () => {
    const r = await tryHandleLifeAssistant('지금부터 번역 모드로 바꿔줘')
    expect(r?.text).toMatch(/번역 모드/)
    const mode = JSON.parse(store.get('jarvis_interpret_mode_v3') || '{}')
    expect(mode.active).toBe(true)
  })

  it('creates family helper calendar event', async () => {
    const r = await executeLifeAssistantIntent({
      intent: 'calendar.create',
      confidence: 0.95,
      extractedEntities: { title: '병원', date: '2099-01-02', time: '15:00' },
      title: '병원',
      date: '2099-01-02',
      time: '15:00',
      sourceText: '내일 오후 3시에 병원 예약 추가해줘',
      requiresConfirmation: false,
      missingFields: [],
      source: 'rules',
    })
    expect(r?.text).toMatch(/추가/)
    const bundle = JSON.parse(store.get('aizio_family_helper_v1') || '{}')
    expect(bundle.schedules?.[0]?.title).toMatch(/병원/)
  })

  it('asks for missing fields', async () => {
    const r = await executeLifeAssistantIntent({
      intent: 'calendar.create',
      confidence: 0.9,
      extractedEntities: {},
      sourceText: '일정 추가해줘',
      requiresConfirmation: true,
      missingFields: ['title', 'date'],
      source: 'rules',
    })
    expect(r?.text).toMatch(/필요한 정보/)
  })

  it('router falls back without AI', async () => {
    const r = await routeLifeAssistantIntent('오늘 일정 알려줘', { allowAi: false })
    expect(r.intent).toBe('calendar.read')
  })

  it('briefing omits empty sections', () => {
    const b = buildLifeBriefing()
    expect(b.items.every((i) => i.label)).toBe(true)
  })

  it('opens camera view for document command', async () => {
    const r = await tryHandleLifeAssistant('준비물 안내문을 일정으로 만들어줘')
    expect(r?.view).toBe('ai-camera')
  })
})
