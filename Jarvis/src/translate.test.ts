import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { think } from './brain'
import { translateOffline } from './offlineDict'
import { detectLangCode, findLang, translateText } from './translate'
import {
  clearInterpretMode,
  currentListenLang,
  handleTranslate,
  interpretModeBadgeLabel,
  isTranslateEscapeCommand,
  loadInterpretMode,
  parseTranslateUtterance,
} from './translateBrain'

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

describe('translate helpers', () => {
  it('finds languages by Korean name and colloquial 말 aliases', () => {
    expect(findLang('영어')?.code).toBe('en')
    expect(findLang('vietnamese')?.code).toBe('vi')
    expect(findLang('베트남어')?.code).toBe('vi')
    expect(findLang('베트남말')?.code).toBe('vi')
    expect(findLang('일본말')?.code).toBe('ja')
    expect(findLang('미국말')?.code).toBe('en')
  })

  it('detects script languages', () => {
    expect(detectLangCode('안녕하세요')).toBe('ko')
    expect(detectLangCode('こんにちは')).toBe('ja')
  })

  it('translates Vietnamese offline meal phrase', () => {
    const r = translateOffline('나는 이미 식사를 했어요', 'ko', 'vi')
    expect(r.ok).toBe(true)
    expect(r.text.toLowerCase()).toMatch(/đã ăn|toi/)
  })
})

describe('parseTranslateUtterance', () => {
  it('treats 베트남말 번역하기 as continuous', () => {
    const p = parseTranslateUtterance('베트남말 번역하기')
    expect(p.lang?.code).toBe('vi')
    expect(p.matched).toBe(true)
    expect(p.sticky).toBe(true)
    expect(p.oneShot).toBe(false)
    expect(p.payload).toBe('')
  })

  it('treats 안녕하세요를 베트남어로 번역해줘 as one-shot', () => {
    const p = parseTranslateUtterance('안녕하세요를 베트남어로 번역해줘')
    expect(p.lang?.code).toBe('vi')
    expect(p.oneShot).toBe(true)
    expect(p.sticky).toBe(false)
    expect(p.payload).toContain('안녕')
  })
})

describe('lock-until-stop translate mode', () => {
  beforeEach(() => {
    store.clear()
    clearInterpretMode()
    vi.stubGlobal('navigator', { onLine: false })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
  })

  afterEach(() => {
    store.clear()
  })

  it('starts lock from “지금부터 베트남어로 번역해줘”', async () => {
    const reply = await handleTranslate('지금부터 베트남어로 번역해줘')
    expect(reply?.text).toMatch(/베트남어 번역을 시작/)
    expect(loadInterpretMode().active).toBe(true)
    expect(loadInterpretMode().langB).toBe('vi')
    expect(currentListenLang()).toBe('ko-KR')
    expect(interpretModeBadgeLabel()).toMatch(/번역 잠금 켜짐/)
    expect(interpretModeBadgeLabel()).toMatch(/베트남어/)
  })

  it('starts lock from “베트남말 번역하기”', async () => {
    const reply = await handleTranslate('베트남말 번역하기')
    expect(reply?.text).toMatch(/베트남어 번역을 시작/)
    expect(loadInterpretMode().active).toBe(true)
    expect(loadInterpretMode().langB).toBe('vi')
  })

  it('starts lock from “지금부터 스톱할 때까지 베트남어로…”', async () => {
    const reply = await handleTranslate('지금부터 스톱할 때까지 베트남어로 번역해줘')
    expect(reply?.text).toMatch(/베트남어/)
    expect(loadInterpretMode().active).toBe(true)
    expect(loadInterpretMode().langB).toBe('vi')
  })

  it('parses “내 말을 베트남어로 번역해 줘 + 문장” and translates', async () => {
    const reply = await handleTranslate('내 말을 베트남어로 번역해 줘 나는 이미 식사를 했어요')
    expect(reply?.text).toMatch(/đã ăn|Tôi|베트남/i)
    expect(loadInterpretMode().active).toBe(true)
    expect(loadInterpretMode().langB).toBe('vi')
  })

  it('while locked, translates 안녕하세요 and stops on 번역 그만', async () => {
    await handleTranslate('베트남어로만 번역')
    const mid = await handleTranslate('안녕하세요')
    expect(mid?.text).toMatch(/Xin chào/)
    expect(mid?.text).toMatch(/원문/)
    expect(mid?.speakLang).toBe('vi-VN')
    const stop = await handleTranslate('번역 그만')
    expect(stop?.text).toMatch(/종료/)
    expect(loadInterpretMode().active).toBe(false)
    expect(interpretModeBadgeLabel()).toBe('번역 잠금 꺼짐')
  })

  it('switches target language while locked', async () => {
    await handleTranslate('지금부터 베트남어로 번역해줘')
    const sw = await handleTranslate('영어로 바꿔줘')
    expect(sw?.text).toMatch(/영어/)
    expect(loadInterpretMode().langB).toBe('en')
    expect(loadInterpretMode().active).toBe(true)
  })

  it('one-shot does not enable continuous lock', async () => {
    const reply = await handleTranslate('안녕하세요를 베트남어로 번역해줘')
    expect(reply?.text).toMatch(/Xin chào|베트남/i)
    expect(loadInterpretMode().active).toBe(false)
  })

  it('ignores non-escape wording while locked (still translates)', async () => {
    await handleTranslate('영어 통역 모드')
    const reply = await handleTranslate('삼성전자 시세')
    expect(reply?.text).toMatch(/영어|원문/)
    expect(loadInterpretMode().active).toBe(true)
  })

  it('think() under lock returns one translation (no Core+legacy double)', async () => {
    await handleTranslate('지금부터 베트남어로 번역해줘')
    expect(loadInterpretMode().active).toBe(true)
    const reply = await think('안녕하세요')
    expect(reply.text).toMatch(/Xin chào/)
    // Single bubble body — not two 【베트남어】 blocks joined
    const tags = reply.text.match(/【[^】]*】/g) || []
    expect(tags.length).toBeLessThanOrEqual(1)
    expect(reply.text).not.toMatch(/오프라인[\s\S]*오프라인|Xin chào[\s\S]*Xin chào/)
  })

  it('coalesces concurrent translateText calls for the same sentence', async () => {
    let fetches = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        fetches += 1
        await new Promise((r) => setTimeout(r, 30))
        return {
          ok: true,
          json: async () => ({
            responseData: { translatedText: 'Hello unique coalesce' },
            responseStatus: 200,
          }),
        }
      }),
    )
    vi.stubGlobal('navigator', { onLine: true })
    const q = `유니크문장번역테스트${Date.now()}`
    const [a, b] = await Promise.all([translateText(q, 'ko', 'en'), translateText(q, 'ko', 'en')])
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    expect(a.text).toBe(b.text)
    expect(fetches).toBe(1)
  })

  it('escape command helper recognizes navigation', () => {
    expect(isTranslateEscapeCommand('울산역으로 안내해줘')).toBe(true)
    expect(isTranslateEscapeCommand('안녕하세요')).toBe(false)
  })

  it('persists lock across reload of storage', async () => {
    await handleTranslate('지금부터 일본어로 번역해줘')
    expect(loadInterpretMode().active).toBe(true)
    expect(loadInterpretMode().langB).toBe('ja')
    const raw = store.get('jarvis_interpret_mode_v3')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw || '{}').active).toBe(true)
  })
})
