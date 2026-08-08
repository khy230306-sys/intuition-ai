import { beforeEach, describe, expect, it, vi } from 'vitest'
import { think } from './brain'
import { saveInterpretMode, clearInterpretMode } from './translateBrain'
import { endTranslationSession } from './commandRouter/session'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', {
  onLine: true,
  language: 'ko-KR',
  geolocation: {
    getCurrentPosition: (_ok: unknown, err: (e: { code: number }) => void) => {
      err?.({ code: 1 })
    },
  },
})

describe('translation mode beats weather engine', () => {
  beforeEach(() => {
    store.clear()
    clearInterpretMode()
    endTranslationSession()
  })

  it('does not run weather while interpret mode is active', async () => {
    saveInterpretMode({
      active: true,
      langA: 'ko',
      langB: 'en',
      listening: 'ko',
      live: true,
      lockUntilStop: true,
      showOriginal: true,
    })
    const r = await think('울산 날씨 알려줘')
    const t = r.text || ''
    expect(/기온\s*\d|℃|습도\s*\d/.test(t)).toBe(false)
  })
})
