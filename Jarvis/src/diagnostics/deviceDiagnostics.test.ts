import { beforeEach, describe, expect, it, vi } from 'vitest'
import { diagnosticsToSafeJson, recordDiagError, type DeviceDiagnostics } from './deviceDiagnostics'
import { resetGuestIdentityForTests } from '../account'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', { randomUUID: () => 'diag-user-1' })

beforeEach(() => {
  store.clear()
  resetGuestIdentityForTests()
})

describe('device diagnostics', () => {
  it('redacts api-key-like strings from export JSON', () => {
    recordDiagError('test_error')
    const diag: DeviceDiagnostics = {
      app: 'AIZIO',
      version: '1.15.1',
      buildId: 'b1',
      commit: 'abc',
      channel: 'preview',
      generatedAt: new Date().toISOString(),
      browser: 'Safari',
      userAgent: 'x',
      osHint: 'iOS',
      language: 'ko',
      standalonePwa: true,
      online: true,
      notificationPermission: 'granted',
      microphoneHint: 'granted',
      serviceWorker: { controlled: true, controllerState: 'activated', ready: true },
      push: {
        webPushSupported: true,
        chatSubscription: false,
        reminderSubscription: false,
        reminderServerRegistered: false,
        pushServerConfigured: false,
        pushServerReason: '미설정',
      },
      storage: { localStorageWritable: true, indexedDbAvailable: false, note: 'n' },
      user: { userId: 'u1', deviceId: 'd1', mode: 'guest' },
      providers: { mode: 'auto', configured: ['openrouter'], hasAnyKey: true },
      featureFlags: { dnaEnabled: true },
      navigation: { hasHome: false, hasWork: false, favoriteCount: 0 },
      recentErrorCodes: ['leak sk-abcdefghijklmnopqrstuvwxyz1234'],
      href: 'https://example.com/',
    }
    const json = diagnosticsToSafeJson(diag)
    expect(json).not.toContain('sk-abcdefghijklmnopqrstuvwxyz1234')
    expect(json).toContain('[redacted]')
    expect(json).toContain('1.15.1')
  })
})
