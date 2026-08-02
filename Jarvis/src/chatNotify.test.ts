import { describe, expect, it, vi, beforeEach } from 'vitest'
import { urlBase64ToUint8Array } from './vapid'
import { loadSettings, saveSettings } from './storage'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('vapid helpers', () => {
  it('decodes url-safe base64 applicationServerKey', () => {
    const bytes = urlBase64ToUint8Array(
      'BKupo7Y_efhJskLSk_xdJwyviAfqjjnFUPdlRVnSvWd6AXQJCELFn-T01U7BOCpOvU9DDUUk-xLhjfjv8Lozis8',
    )
    expect(bytes.length).toBeGreaterThan(60)
    expect(bytes[0]).toBe(4)
  })
})

describe('chat notify settings defaults', () => {
  beforeEach(() => store.clear())

  it('defaults family/friends chat notify on and while-open off', () => {
    const s = loadSettings()
    expect(s.notifyFamilyChat).toBe(true)
    expect(s.notifyFriendsChat).toBe(true)
    expect(s.notifyWhileOpen).toBe(false)
  })

  it('persists notify toggles', () => {
    saveSettings({
      ...loadSettings(),
      notifyFamilyChat: false,
      notifyFriendsChat: true,
      notifyWhileOpen: true,
    })
    const s = loadSettings()
    expect(s.notifyFamilyChat).toBe(false)
    expect(s.notifyFriendsChat).toBe(true)
    expect(s.notifyWhileOpen).toBe(true)
  })
})
