import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  routeCommand,
  endTranslationSession,
  startTranslationSession,
  getTranslationSession,
  tryHandleRoutedCommand,
  parseClassifierOutput,
  healClassifierJson,
  passesConfidenceGate,
} from './index'
import { wantsWeatherCommand } from '../spokenCommand'
import { think } from '../brain'
import { clearInterpretMode } from '../translateBrain'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR' })

type Case = {
  input: string
  expectedIntent: string
  forbiddenActions?: string[]
  mode?: 'translation'
  target?: string
}

const CASES: Case[] = [
  // —— Required suite (TEST 01–15) ——
  { input: '지금부터 영어로 번역해줘', expectedIntent: 'translation.session.start', forbiddenActions: ['weather'], target: 'en' },
  { input: '오늘 날씨가 정말 좋네', expectedIntent: 'translation.active_utterance', forbiddenActions: ['weather'], mode: 'translation' },
  { input: '오늘 날씨 알려줘', expectedIntent: 'weather.query' },
  { input: '오늘 날씨가 좋다고 영어로 번역해줘', expectedIntent: 'translation.oneshot', forbiddenActions: ['weather'] },
  { input: '"오늘 날씨 어때?"를 영어로 번역해줘', expectedIntent: 'translation.oneshot', forbiddenActions: ['weather'] },
  { input: '내일 오후 3시에 병원 일정 추가해줘', expectedIntent: 'calendar.create' },
  { input: '내일 병원 간다고 영어로 번역해줘', expectedIntent: 'translation.oneshot', forbiddenActions: ['calendar', 'weather'] },
  { input: '이 사진 영어로 번역해줘', expectedIntent: 'vision.translation', forbiddenActions: ['weather'] },
  { input: '카메라로 메뉴판 번역해줘', expectedIntent: 'vision.translation', forbiddenActions: ['weather'] },
  { input: '번역 그만', expectedIntent: 'translation.session.end', mode: 'translation' },
  { input: '일본어로', expectedIntent: 'translation.session.change_target', mode: 'translation', target: 'ja' },
  { input: '엄마 병원 일정 언제야?', expectedIntent: 'family.schedule.read' },
  { input: '엄마 병원 일정 영어로 번역해줘', expectedIntent: 'translation.oneshot', forbiddenActions: ['weather'] },
  { input: '오늘 비 와?', expectedIntent: 'weather.query' },
  { input: '오늘 비 올 것 같아', expectedIntent: 'translation.active_utterance', forbiddenActions: ['weather'], mode: 'translation' },

  // —— Translation starts ——
  { input: '지금부터 번역해줘', expectedIntent: 'translation.session.start' },
  { input: '영어로 번역해줘', expectedIntent: 'translation.session.start', target: 'en' },
  { input: '영어로 바꿔줘', expectedIntent: 'translation.session.start', target: 'en' },
  { input: '영어 번역', expectedIntent: 'translation.session.start', target: 'en' },
  { input: '한국어로 번역해줘', expectedIntent: 'translation.session.start', target: 'ko' },
  { input: '일본어로 번역해줘', expectedIntent: 'translation.session.start', target: 'ja' },
  { input: '중국어로 번역해줘', expectedIntent: 'translation.session.start', target: 'zh-CN' },
  { input: '앞으로 영어로 번역해줘', expectedIntent: 'translation.session.start' },
  { input: '이제부터 일본어로 번역해줘', expectedIntent: 'translation.session.start', target: 'ja' },
  { input: '번역 시작', expectedIntent: 'translation.session.start' },
  { input: '번역 모드', expectedIntent: 'translation.session.start' },
  { input: '통역해줘', expectedIntent: 'translation.session.start' },
  { input: '통역 시작', expectedIntent: 'translation.session.start' },
  { input: '영어 통역해줘', expectedIntent: 'translation.session.start', target: 'en' },
  { input: '베트남어로 번역해줘', expectedIntent: 'translation.session.start', target: 'vi' },
  { input: '스페인어로 번역해줘', expectedIntent: 'translation.session.start', target: 'es' },
  { input: '프랑스어로 번역해줘', expectedIntent: 'translation.session.start', target: 'fr' },
  { input: '독일어로 번역해줘', expectedIntent: 'translation.session.start', target: 'de' },
  { input: '태국어로 번역해줘', expectedIntent: 'translation.session.start', target: 'th' },
  { input: 'translate to english please', expectedIntent: 'translation.session.start', target: 'en' },

  // —— Translation stops ——
  { input: '번역 종료', expectedIntent: 'translation.session.end', mode: 'translation' },
  { input: '통역 그만', expectedIntent: 'translation.session.end', mode: 'translation' },
  { input: '번역 모드 꺼줘', expectedIntent: 'translation.session.end', mode: 'translation' },
  { input: '이제 번역하지 마', expectedIntent: 'translation.session.end', mode: 'translation' },
  { input: '일반 대화로 돌아가', expectedIntent: 'translation.session.end', mode: 'translation' },
  { input: '번역 끝', expectedIntent: 'translation.session.end', mode: 'translation' },
  { input: '그만', expectedIntent: 'translation.session.end', mode: 'translation' },

  // —— Active mode utterances (must not weather) ——
  { input: '나 지금 출발해', expectedIntent: 'translation.active_utterance', mode: 'translation', forbiddenActions: ['weather'] },
  { input: '조금 늦을 것 같아', expectedIntent: 'translation.active_utterance', mode: 'translation', forbiddenActions: ['weather'] },
  { input: '오늘 저녁 같이 밥 먹을래?', expectedIntent: 'translation.active_utterance', mode: 'translation', forbiddenActions: ['weather'] },
  { input: '비 올 것 같네', expectedIntent: 'translation.active_utterance', mode: 'translation', forbiddenActions: ['weather'] },
  { input: '기온이 낮아서 춥다', expectedIntent: 'translation.active_utterance', mode: 'translation', forbiddenActions: ['weather'] },

  // —— Weather clear queries ——
  { input: '지금 날씨 어때?', expectedIntent: 'weather.query' },
  { input: '내일 비 와?', expectedIntent: 'weather.query' },
  { input: '이번 주 날씨', expectedIntent: 'weather.query' },
  { input: '서울 날씨', expectedIntent: 'weather.query' },
  { input: '울산 오늘 기온', expectedIntent: 'weather.query' },
  { input: '오늘 우산 필요해?', expectedIntent: 'weather.query' },
  { input: '날씨 알려줘', expectedIntent: 'weather.query' },
  { input: '내일 내가있는곳의 날씨를알려줘', expectedIntent: 'weather.query' },
  { input: '내일하루종일 날씨좀 알려줘 내가있는 위치', expectedIntent: 'weather.query' },
  { input: '내 위치 날씨 어때', expectedIntent: 'weather.query' },

  // —— Calendar / reminder / todo ——
  { input: '오늘 일정 알려줘', expectedIntent: 'calendar.read' },
  { input: '내일 일정 있어?', expectedIntent: 'calendar.read' },
  { input: '병원 일정 추가해줘', expectedIntent: 'calendar.create' },
  { input: '30분 뒤에 전화하라고 알려줘', expectedIntent: 'reminder.create' },
  { input: '오늘 할 일 추가해줘', expectedIntent: 'todo.create' },
  { input: '할 일 등록해줘', expectedIntent: 'todo.create' },

  // —— Family ——
  { input: '이번 주 가족 일정 알려줘', expectedIntent: 'family.schedule.read' },
  { input: '한영이 내일 4시 반 하원 일정 추가해줘', expectedIntent: 'family.schedule.create' },
  { input: '아이 준비물 보여줘', expectedIntent: 'family.schedule.read' },
  { input: '예방접종 일정 있어?', expectedIntent: 'family.schedule.read' },
  { input: '엄마 병원 일정 추가해줘', expectedIntent: 'family.schedule.create' },

  // —— Camera ——
  { input: '카메라 열어줘', expectedIntent: 'vision.open' },
  { input: '이 문서 읽어줘', expectedIntent: 'vision.open' },
  { input: '사진 번역해줘', expectedIntent: 'vision.translation' },
  { input: '메뉴판 사진 영어로 번역해줘', expectedIntent: 'vision.translation' },

  // —— Memory / music ——
  { input: '이거 기억해줘 내 차는 파란색', expectedIntent: 'memory.save' },
  { input: '내가 전에 말한 거 찾아줘', expectedIntent: 'memory.read' },
  { input: '음악 틀어줘', expectedIntent: 'music.play' },
  { input: '잔잔한 노래 재생해줘', expectedIntent: 'music.play' },

  // —— One-shots ——
  { input: '나는 지금 집에 간다고 영어로 번역해줘', expectedIntent: 'translation.oneshot', forbiddenActions: ['weather'] },
  { input: '「안녕하세요」를 일본어로 번역해줘', expectedIntent: 'translation.oneshot', target: 'ja' },
  { input: 'Hello를 한국어로 번역해줘', expectedIntent: 'translation.oneshot', target: 'ko' },

  // —— General chat ——
  { input: '안녕', expectedIntent: 'general.chat' },
  { input: '고마워', expectedIntent: 'general.chat' },
  { input: '오늘 기분이 좋아', expectedIntent: 'general.chat' },
  { input: '심심해', expectedIntent: 'general.chat' },

  // —— More translation / conflict ——
  { input: '지금부터 중국어로 번역해줘', expectedIntent: 'translation.session.start', target: 'zh-CN' },
  { input: '계속 영어로 번역해줘', expectedIntent: 'translation.session.start' },
  { input: '실시간 통역 모드', expectedIntent: 'translation.session.start' },
  { input: '다시 영어로', expectedIntent: 'translation.session.change_target', mode: 'translation', target: 'en' },
  { input: 'English', expectedIntent: 'translation.session.change_target', mode: 'translation', target: 'en' },
  { input: '곧 도착해', expectedIntent: 'translation.active_utterance', mode: 'translation' },
  { input: '우산 챙길게', expectedIntent: 'translation.active_utterance', mode: 'translation', forbiddenActions: ['weather'] },
  { input: '날씨 때문에 늦었어라고 영어로 번역해줘', expectedIntent: 'translation.oneshot', forbiddenActions: ['weather'] },
  { input: '미세먼지 어때?', expectedIntent: 'weather.query' },
  { input: '내일 우산 챙길까', expectedIntent: 'weather.query' },
  { input: '회의 일정 잡아줘', expectedIntent: 'calendar.create' },
  { input: '친구 일정 보여줘', expectedIntent: 'calendar.read' },
  { input: '아빠 병원 언제야?', expectedIntent: 'family.schedule.read' },
  { input: '하원 알림 추가해줘', expectedIntent: 'family.schedule.create' },
  { input: '사진 분석해줘', expectedIntent: 'vision.open' },
  { input: 'OCR 해줘', expectedIntent: 'vision.open' },
  { input: '기억해줘 비밀번호는 비밀', expectedIntent: 'memory.save' },
  { input: '플레이리스트 틀어줘', expectedIntent: 'music.play' },
  { input: '오늘 뭐하지', expectedIntent: 'general.chat' },
  { input: '번역해 줘', expectedIntent: 'translation.session.start' },
  { input: '통역 모드 시작', expectedIntent: 'translation.session.start' },
  { input: '베트남말 번역하기', expectedIntent: 'translation.session.start', target: 'vi' },
  { input: '일본말 번역하기', expectedIntent: 'translation.session.start', target: 'ja' },
  { input: '오늘 하루 정리해줘', expectedIntent: 'general.chat' },
  { input: '문서 읽어줘', expectedIntent: 'vision.open' },
  { input: '이 사진 번역해줘', expectedIntent: 'vision.translation' },
]

describe('AizioCommandRouter regression (≥100)', () => {
  beforeEach(() => {
    store.clear()
    clearInterpretMode()
    endTranslationSession()
  })

  it('has at least 100 natural-language cases', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(100)
  })

  it.each(CASES.map((c) => [c.input, c] as const))('%s', (_label, c) => {
    if (c.mode === 'translation') startTranslationSession(c.target || 'en', '영어')
    else endTranslationSession()
    const r = routeCommand({ text: c.input })
    expect(r.intent).toBe(c.expectedIntent)
    if (c.target) expect(r.targetLanguage || r.entities.targetLanguage).toBe(c.target)
    for (const bad of c.forbiddenActions || []) {
      expect(r.forbiddenActions).toContain(bad)
      expect(r.intent.includes(bad) || r.action.includes(bad)).toBe(false)
    }
    if (c.expectedIntent.startsWith('translation.')) {
      expect(wantsWeatherCommand(c.input)).toBe(false)
    }
  })
})

describe('required think() integration', () => {
  beforeEach(() => {
    store.clear()
    clearInterpretMode()
  })

  it('TEST01 starts EN session and never weather', async () => {
    const r = await think('지금부터 영어로 번역해줘')
    expect(r.text).toMatch(/영어 번역 모드|영어로 번역/)
    expect(getTranslationSession().enabled).toBe(true)
    expect(getTranslationSession().targetLanguage).toBe('en')
    expect(r.text).not.toMatch(/날씨를 확인|우산/)
  })

  it('TEST02 active mode translates weather narrative', async () => {
    startTranslationSession('en', '영어')
    const r = await think('오늘 날씨가 정말 좋네')
    expect(getTranslationSession().enabled).toBe(true)
    expect(r.text).not.toMatch(/날씨를 확인합니다|우산/)
    // Should be translation output (English), not weather Korean
    expect(r.text.toLowerCase()).toMatch(/weather|nice|today|really/)
  })

  it('TEST03 weather query works', async () => {
    const r = await think('오늘 날씨 알려줘')
    expect(r.text).toMatch(/날씨/)
  })

  it('current-location weather is not alarm or geo lookup', async () => {
    const a = await think('내일 내가있는곳의 날씨를알려줘')
    expect(a.text).toMatch(/날씨/)
    expect(a.text).not.toMatch(/시간을 함께 말해|내장 DB|웹 검색을 엽/)

    const b = await think('내일하루종일 날씨좀 알려줘 내가있는 위치')
    expect(b.text).toMatch(/날씨/)
    expect(b.text).not.toMatch(/시간을 함께 말해|내장 DB|웹 검색을 엽|내일하루종일/)
  })

  it('everyday 알려줘 asks are not stolen by alarm', async () => {
    const fx = await think('환율 알려줘')
    expect(fx.text).toMatch(/환율|USD|원/i)
    expect(fx.text).not.toMatch(/시간을 함께 말해/)

    const news = await think('오늘 뉴스')
    expect(news.text).toMatch(/뉴스/)
    expect(news.text).not.toMatch(/음성을 잘 듣지|시간을 함께 말해/)
  })

  it('TEST04 oneshot with weather words is translation', async () => {
    const routed = routeCommand({ text: '오늘 날씨가 좋다고 영어로 번역해줘' })
    expect(routed.intent).toBe('translation.oneshot')
    expect(routed.forbiddenActions).toContain('weather')
    const r = await tryHandleRoutedCommand('오늘 날씨가 좋다고 영어로 번역해줘')
    expect(r?.text).toBeTruthy()
    expect(r?.text).not.toMatch(/날씨를 확인합니다/)
  })

  it('TEST05 quoted weather question is translation', async () => {
    const routed = routeCommand({ text: '"오늘 날씨 어때?"를 영어로 번역해줘' })
    expect(routed.intent).toBe('translation.oneshot')
    const r = await think('"오늘 날씨 어때?"를 영어로 번역해줘')
    expect(r.text).not.toMatch(/날씨를 확인합니다/)
  })
})

describe('AI Intent Classifier (Zod)', () => {
  it('parses and heals structured classifier JSON', () => {
    const raw = "```json\n{'intent': 'translation.session.start', 'confidence': 0.99, 'targetLanguage': 'en', 'content': null,}\n```"
    expect(healClassifierJson(raw)).toContain('"intent"')
    const parsed = parseClassifierOutput(raw)
    expect(parsed?.intent).toBe('translation.session.start')
    expect(parsed?.confidence).toBe(0.99)
    expect(parsed?.targetLanguage).toBe('en')
  })

  it('confidence gate blocks low-confidence weather/calendar guesses', () => {
    expect(passesConfidenceGate(0.9, 'weather.query')).toBe('execute')
    expect(passesConfidenceGate(0.7, 'weather.query')).toBe('verify')
    expect(passesConfidenceGate(0.4, 'weather.query')).toBe('clarify')
    expect(passesConfidenceGate(0.4, 'calendar.create')).toBe('clarify')
    expect(passesConfidenceGate(0.4, 'family.schedule.create')).toBe('clarify')
  })
})

describe('multi-turn Scenario A', () => {
  beforeEach(() => {
    store.clear()
    clearInterpretMode()
  })

  it('translation session → utterances → JA switch → end → weather', async () => {
    const s1 = await think('지금부터 영어로 번역해줘')
    expect(s1.text).toMatch(/번역 모드/)
    expect(getTranslationSession().enabled).toBe(true)

    const s2 = await think('나 지금 출발해')
    expect(s2.text).not.toMatch(/날씨를 확인/)
    expect(getTranslationSession().enabled).toBe(true)

    const s3 = await think('오늘 날씨가 정말 좋다')
    expect(s3.text).not.toMatch(/날씨를 확인합니다/)
    expect(s3.text.toLowerCase()).toMatch(/weather|nice|today/)

    const s4 = await think('조금 늦을 것 같아')
    expect(s4.text).not.toMatch(/날씨를 확인/)

    const s5 = await think('일본어로')
    expect(s5.text).toMatch(/일본어/)
    expect(getTranslationSession().targetLanguage).toBe('ja')

    const s6 = await think('곧 도착해')
    expect(getTranslationSession().enabled).toBe(true)
    expect(s6.text).not.toMatch(/날씨를 확인/)

    const s7 = await think('번역 그만')
    expect(s7.text).toMatch(/종료/)
    expect(getTranslationSession().enabled).toBe(false)

    const s8 = await think('오늘 날씨 알려줘')
    expect(s8.text).toMatch(/날씨/)
  })
})
