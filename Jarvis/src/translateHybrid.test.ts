import { beforeEach, describe, expect, it, vi } from 'vitest'
import { translateOffline } from './offlineDict'
import { translateText } from './translate'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('offline conversational translation without data', () => {
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('navigator', { onLine: false })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
  })

  it('hits expanded phrase book for weather opinion', () => {
    const r = translateOffline('오늘 날씨가 정말 좋다', 'ko', 'en')
    expect(r.ok).toBe(true)
    expect(r.text.toLowerCase()).toMatch(/weather|nice/)
  })

  it('translateText works offline for mood / short chat lines', async () => {
    const a = await translateText('배고파', 'ko', 'en')
    expect(a.ok).toBe(true)
    expect(a.offline).toBe(true)
    expect(a.text.toLowerCase()).toMatch(/hungry/)

    const b = await translateText('뭐해', 'ko', 'en')
    expect(b.ok).toBe(true)
    expect(b.text.toLowerCase()).toMatch(/what|doing/)
  })

  it('clear error when phrase missing and offline (no invented text)', async () => {
    const r = await translateText(
      '양자역학의 겹침 원리를 열 문장으로 설명해 주세요 완전 새로운 문장',
      'ko',
      'en',
    )
    expect(r.ok).toBe(false)
    expect(r.error || '').toMatch(/오프라인|사전|AI|온라인/)
  })
})

describe('translateViaHybrid', () => {
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('navigator', { onLine: true })
    vi.resetModules()
  })

  it('returns translation when Hybrid chat succeeds', async () => {
    vi.doMock('./ai-providers', () => ({
      hasAnyConfiguredProvider: () => true,
      runHybridChat: async () => ({
        text: 'Hello there',
        providerId: 'gemini',
        model: 'x',
        fallbackUsed: false,
        attempted: ['gemini'],
      }),
    }))
    const { translateViaHybrid } = await import('./translateHybrid')
    const r = await translateViaHybrid('안녕하세요 여러분', 'ko', 'en')
    expect(r?.ok).toBe(true)
    expect(r?.text).toBe('Hello there')
    expect(r?.provider).toBe('hybrid-ai')
  })
})
