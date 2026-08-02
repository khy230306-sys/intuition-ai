import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detectMessageLanguage, isTranslationSkippable } from './languageDetector'
import { protectForTranslation, restoreProtected } from './protectTokens'
import { clearTranslationCache, getCachedTranslation, putCachedTranslation } from './translationCache'
import { translateChatMessage } from './translationService'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v)
  },
  removeItem: (k: string) => {
    store.delete(k)
  },
  clear: () => store.clear(),
})

describe('globalChat language', () => {
  it('skips emoji / ok / numbers', () => {
    expect(isTranslationSkippable('👍')).toBe(true)
    expect(isTranslationSkippable('OK')).toBe(true)
    expect(isTranslationSkippable('123')).toBe(true)
    expect(isTranslationSkippable('[사진]')).toBe(true)
    expect(isTranslationSkippable('오늘 날씨가 좋아요')).toBe(false)
  })

  it('detects korean script', () => {
    expect(detectMessageLanguage('안녕하세요 반갑습니다').language).toBe('ko')
  })
})

describe('protect tokens', () => {
  it('preserves urls and code', () => {
    const raw = 'see https://example.com and `npm test` please'
    const { masked, slots } = protectForTranslation(raw)
    expect(masked).not.toContain('https://example.com')
    expect(restoreProtected(masked, slots)).toBe(raw)
  })
})

describe('translation cache + service', () => {
  beforeEach(() => {
    store.clear()
    clearTranslationCache()
  })

  it('caches completed translations', () => {
    putCachedTranslation({
      messageId: 'm1',
      targetLanguage: 'en',
      translatedText: 'Hello',
      provider: 'test',
      status: 'completed',
      createdAt: 1,
      updatedAt: 1,
    })
    expect(getCachedTranslation('m1', 'en')?.translatedText).toBe('Hello')
  })

  it('skips same-language and uses cache', async () => {
    const same = await translateChatMessage({
      messageId: 'm2',
      originalText: 'Hello world today',
      sourceLanguage: 'en',
      targetLanguage: 'en',
    })
    expect(same.status).toBe('skipped')

    putCachedTranslation({
      messageId: 'm3',
      targetLanguage: 'ko',
      translatedText: '안녕',
      provider: 'offlineDict',
      status: 'completed',
      sourceLanguage: 'en',
      createdAt: 1,
      updatedAt: 1,
    })
    const cached = await translateChatMessage({
      messageId: 'm3',
      originalText: 'Good morning everyone today',
      sourceLanguage: 'en',
      targetLanguage: 'ko',
    })
    expect(cached.cached).toBe(true)
    expect(cached.translatedText).toBe('안녕')
  })
})
