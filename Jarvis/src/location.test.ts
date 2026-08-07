import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  canUseGeolocation,
  formatFix,
  getLocationReport,
  loadCachedFix,
  saveCachedFix,
  wasLocationGranted,
} from './location'

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

describe('location cache', () => {
  beforeEach(() => store.clear())

  it('saves and loads fix', () => {
    saveCachedFix({ lat: 37.5, lon: 127.0, accuracy: 12, at: 1000 })
    expect(wasLocationGranted()).toBe(true)
    expect(loadCachedFix()?.lat).toBe(37.5)
    expect(formatFix(loadCachedFix()!, '서울')).toMatch(/서울/)
  })

  it('treats missing geolocation API as unavailable (no crash)', async () => {
    vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR', geolocation: undefined })
    expect(canUseGeolocation()).toBe(false)
    await expect(getLocationReport()).rejects.toThrow(/위치 서비스를 지원하지/)
  })
})
