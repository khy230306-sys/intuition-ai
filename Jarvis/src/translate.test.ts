import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectLangCode, findLang, translateText } from './translate'
import {
  clearInterpretMode,
  currentListenLang,
  handleTranslate,
  loadInterpretMode,
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
  it('finds languages by Korean name and alias', () => {
    expect(findLang('영어')?.code).toBe('en')
    expect(findLang('japanese')?.code).toBe('ja')
    expect(findLang('스페인어')?.code).toBe('es')
  })

  it('detects script languages', () => {
    expect(detectLangCode('안녕하세요')).toBe('ko')
    expect(detectLangCode('こんにちは')).toBe('ja')
    expect(detectLangCode('Hello there')).toBe('en')
    expect(detectLangCode('Привет')).toBe('ru')
  })
})

describe('translate API + interpret brain', () => {
  beforeEach(() => {
    store.clear()
    clearInterpretMode()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url)
        const q = decodeURIComponent(u.match(/q=([^&]+)/)?.[1] || '')
        const pair = decodeURIComponent(u.match(/langpair=([^&]+)/)?.[1] || '')
        const [from, to] = pair.split('|')
        let translated = q
        if (from === 'ko' && to === 'en' && /안녕/.test(q)) translated = 'Hello'
        else if (from === 'en' && to === 'ko' && /hello/i.test(q)) translated = '안녕하세요'
        else if (to === 'ja') translated = 'こんにちは'
        else translated = `[${to}]${q}`
        return {
          ok: true,
          json: async () => ({
            responseData: { translatedText: translated },
            responseStatus: 200,
          }),
        }
      }),
    )
  })

  afterEach(() => {
    store.clear()
  })

  it('translates via MyMemory shape', async () => {
    const r = await translateText('안녕하세요', 'ko', 'en')
    expect(r.ok).toBe(true)
    expect(r.text).toBe('Hello')
  })

  it('starts English interpret mode (ko mic → en)', async () => {
    const reply = await handleTranslate('영어 통역 모드')
    expect(reply?.text).toMatch(/실시간 통역 ON/)
    expect(reply?.listenLang).toBe('ko-KR')
    const mode = loadInterpretMode()
    expect(mode.active).toBe(true)
    expect(mode.langB).toBe('en')
    expect(mode.listening).toBe('ko')
    expect(currentListenLang()).toBe('ko-KR')
  })

  it('live-translates Korean to English and sets speakLang', async () => {
    await handleTranslate('영어 통역 모드')
    const reply = await handleTranslate('안녕하세요')
    expect(reply?.text).toMatch(/Hello/)
    expect(reply?.speakLang).toBe('en-US')
  })

  it('one-shot translates to Japanese', async () => {
    const reply = await handleTranslate('일본어로 번역해 안녕하세요')
    expect(reply?.text).toMatch(/こんにちは|일본어/)
    expect(reply?.speakLang).toBe('ja-JP')
  })

  it('stops interpret mode', async () => {
    await handleTranslate('영어 통역 모드')
    const reply = await handleTranslate('통역 종료')
    expect(reply?.listenLang).toBe('ko-KR')
    expect(loadInterpretMode().active).toBe(false)
    expect(currentListenLang()).toBeNull()
  })
})
