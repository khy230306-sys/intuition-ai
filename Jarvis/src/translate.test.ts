import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { translateOffline } from './offlineDict'
import { detectLangCode, findLang } from './translate'
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
    expect(findLang('vietnamese')?.code).toBe('vi')
    expect(findLang('베트남어')?.code).toBe('vi')
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

  it('starts lock from natural “지금부터 스톱할 때까지 베트남어로…”', async () => {
    const reply = await handleTranslate('지금부터 스톱할 때까지 베트남어로 번역해줘')
    expect(reply?.text).toMatch(/번역 잠금 ON/)
    expect(reply?.text).toMatch(/베트남어/)
    expect(loadInterpretMode().active).toBe(true)
    expect(loadInterpretMode().langB).toBe('vi')
    expect(currentListenLang()).toBe('ko-KR')
  })

  it('parses “내 말을 베트남어로 번역해 줘 + 문장” and translates', async () => {
    const reply = await handleTranslate('내 말을 베트남어로 번역해 줘 나는 이미 식사를 했어요')
    expect(reply?.text).toMatch(/đã ăn|Tôi|베트남/i)
    expect(loadInterpretMode().active).toBe(true)
    expect(loadInterpretMode().langB).toBe('vi')
  })

  it('while locked, only translates until 스톱', async () => {
    await handleTranslate('베트남어로만 번역')
    const mid = await handleTranslate('안녕하세요')
    expect(mid?.text).toMatch(/Xin chào/)
    expect(mid?.speakLang).toBe('vi-VN')
    const stop = await handleTranslate('스톱')
    expect(stop?.text).toMatch(/종료/)
    expect(loadInterpretMode().active).toBe(false)
  })

  it('ignores non-translate intents wording while locked (still translates)', async () => {
    await handleTranslate('영어 통역 모드')
    // Even stock-like text gets translated, not invested
    const reply = await handleTranslate('삼성전자 시세')
    expect(reply?.text).toMatch(/영어|EN|【/)
    expect(loadInterpretMode().active).toBe(true)
  })
})
