import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assertHttpsBaseUrl, normalizeBaseUrl } from './urlNormalize'
import { getPushServerStatus, setPushServerBaseUrl } from './serverUrl'
import { buildNotificationBodies } from './reminderPushTypes'

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

describe('urlNormalize', () => {
  it('strips trailing slashes', () => {
    expect(normalizeBaseUrl('https://push.example.com/')).toBe('https://push.example.com')
    expect(normalizeBaseUrl('https://push.example.com///')).toBe('https://push.example.com')
  })

  it('rejects non-https external urls', () => {
    expect(assertHttpsBaseUrl('http://evil.example').ok).toBe(false)
    expect(assertHttpsBaseUrl('https://ok.example').ok).toBe(true)
    expect(assertHttpsBaseUrl('http://localhost:8787', { allowLocalhost: true }).ok).toBe(true)
  })
})

describe('setPushServerBaseUrl', () => {
  beforeEach(() => store.clear())

  it('stores normalized https url', () => {
    const r = setPushServerBaseUrl('https://push.example.com/')
    expect(r.ok).toBe(true)
    expect(r.url).toBe('https://push.example.com')
    expect(getPushServerStatus().configured).toBe(true)
    expect(getPushServerStatus().baseUrl).toBe('https://push.example.com')
  })

  it('rejects http in production-like mode', () => {
    const r = setPushServerBaseUrl('http://push.example.com')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('https_required')
  })

  it('clears url', () => {
    setPushServerBaseUrl('https://push.example.com')
    setPushServerBaseUrl(null)
    expect(getPushServerStatus().configured).toBe(false)
  })
})

describe('privacy bodies', () => {
  it('simple/full/hidden', () => {
    expect(buildNotificationBodies('hidden', '엄마 병원').body).toMatch(/AIZIO 알림/)
    expect(buildNotificationBodies('simple', '엄마 병원').body).toMatch(/예약된 일정/)
    expect(buildNotificationBodies('full', '엄마 병원').body).toMatch(/엄마 병원/)
  })
})
