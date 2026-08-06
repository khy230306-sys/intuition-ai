import { beforeEach, describe, expect, it, vi } from 'vitest'
import { maskApiKey } from '../ai-providers/keyVault'
import { clearProviderKey, getProviderSlot, loadHybridAiConfig } from '../ai-providers/providerConfig'
import {
  deleteProviderKeyFull,
  invalidateProviderKeyCache,
  listProviderKeyStatuses,
  saveProviderKey,
  sourceLabelKo,
} from './keyService'
import { clearServerConfigured, isServerConfigured, markServerConfigured } from './serverFlags'
import { isProviderConfigured } from '../ai-providers/providerConfig'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('sessionStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})
vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR' })
vi.stubGlobal('location', { hostname: 'localhost', origin: 'http://localhost:5173' })

describe('API key E2E (device + flags)', () => {
  beforeEach(() => {
    store.clear()
    invalidateProviderKeyCache()
    for (const id of ['openrouter', 'openai', 'gemini', 'groq', 'custom'] as const) {
      clearProviderKey(id)
      clearServerConfigured(id)
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 0,
        text: async () => '',
        json: async () => ({}),
      })),
    )
  })

  it('device save configures provider without plaintext in settings', async () => {
    const r = await saveProviderKey('openrouter', {
      apiKeyInput: 'sk-or-v1-testdevicekey123456',
      allowDeviceFallback: true,
    })
    expect(r.ok).toBe(true)
    expect(r.via).toBe('device-local')
    expect(isProviderConfigured('openrouter')).toBe(true)
    const raw = store.get('jarvis_settings_v1') || ''
    expect(raw).not.toContain('sk-or-v1-testdevicekey123456')
    const hybrid = store.get('jarvis_hybrid_ai_v1') || ''
    expect(hybrid).not.toContain('sk-or-v1-testdevicekey123456')
    expect(getProviderSlot('openrouter').apiKey).toBe('sk-or-v1-testdevicekey123456')
  })

  it('delete clears device key and server flag', async () => {
    markServerConfigured('openai', true, 'user-secret')
    await saveProviderKey('openai', {
      apiKeyInput: 'sk-test-delete-aaaaaaaa',
      allowDeviceFallback: true,
    })
    const d = await deleteProviderKeyFull('openai')
    expect(d.ok).toBe(true)
    expect(isProviderConfigured('openai')).toBe(false)
    expect(isServerConfigured('openai')).toBe(false)
  })

  it('server flag makes provider configured without device key', () => {
    expect(isProviderConfigured('gemini')).toBe(false)
    markServerConfigured('gemini', true)
    expect(isProviderConfigured('gemini')).toBe(true)
  })

  it('maskApiKey never returns full secret', () => {
    const m = maskApiKey('sk-abcdefghijklmnop')
    expect(m).not.toBe('sk-abcdefghijklmnop')
    expect(m.includes('…') || m.includes('•')).toBe(true)
  })

  it('source labels are user-facing', () => {
    expect(sourceLabelKo('user-secret')).toMatch(/서버/)
    expect(sourceLabelKo('device-local')).toMatch(/기기/)
    expect(sourceLabelKo('none')).toMatch(/없음/)
  })

  it('list statuses includes device providers', async () => {
    await saveProviderKey('groq', { apiKeyInput: 'gsk_test_xxxxxxxxxxxx', allowDeviceFallback: true })
    const list = await listProviderKeyStatuses(true)
    const groq = list.find((p) => p.provider === 'groq')
    expect(groq?.configured).toBe(true)
    expect(groq?.source).toBe('device-local')
    expect(JSON.stringify(list)).not.toContain('gsk_test_xxxxxxxxxxxx')
  })

  it('hybrid config load does not throw after save', async () => {
    await saveProviderKey('openai', { apiKeyInput: 'sk-oa-bbbbbbbbbbbbbbbb', allowDeviceFallback: true })
    expect(loadHybridAiConfig().providers.openai?.apiKey).toBeTruthy()
  })
})

describe('API key server path (mocked fetch)', () => {
  beforeEach(() => {
    store.clear()
    invalidateProviderKeyCache()
    clearProviderKey('openrouter')
    clearServerConfigured('openrouter')
    vi.stubGlobal('location', { hostname: 'localhost', origin: 'http://localhost:5173' })
  })

  it('saves to server when health + PUT succeed and verifies GET', async () => {
    const full = 'sk-or-server-secret-99999999'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url)
        if (u.endsWith('/health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, providerSecrets: { ok: true } }),
            text: async () => '{}',
          }
        }
        if (u.includes('/v1/provider-keys/openrouter') && init?.method === 'PUT') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              configured: true,
              provider: 'openrouter',
              source: 'user-secret',
              maskedKey: 'sk-o••••9999',
              connectionStatus: 'untested',
            }),
            text: async () =>
              JSON.stringify({
                ok: true,
                configured: true,
                provider: 'openrouter',
                source: 'user-secret',
                maskedKey: 'sk-o••••9999',
                connectionStatus: 'untested',
              }),
          }
        }
        if (u.includes('/v1/provider-keys/openrouter') && (!init || !init.method || init.method === 'GET')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              configured: true,
              provider: 'openrouter',
              source: 'user-secret',
              maskedKey: 'sk-o••••9999',
              connectionStatus: 'untested',
            }),
            text: async () =>
              JSON.stringify({
                ok: true,
                configured: true,
                provider: 'openrouter',
                source: 'user-secret',
                maskedKey: 'sk-o••••9999',
                connectionStatus: 'untested',
              }),
          }
        }
        return { ok: false, status: 404, json: async () => ({}), text: async () => '' }
      }),
    )

    const r = await saveProviderKey('openrouter', {
      apiKeyInput: full,
      allowDeviceFallback: false,
    })
    expect(r.ok).toBe(true)
    expect(r.via).toBe('server')
    expect(isServerConfigured('openrouter')).toBe(true)
    expect(getProviderSlot('openrouter').apiKey).toBe('')
    expect(JSON.stringify(r)).not.toContain(full)
  })

  it('does not claim success when backend missing and device fallback disabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network')
      }),
    )
    // Force no backend by clearing push url and non-localhost host
    vi.stubGlobal('location', { hostname: 'lightlab-92m8bq7.shipstatic.com', origin: 'https://lightlab-92m8bq7.shipstatic.com' })
    const r = await saveProviderKey('openai', {
      apiKeyInput: 'sk-no-backend-cccccccc',
      allowDeviceFallback: false,
    })
    expect(r.ok).toBe(false)
    expect(r.message.length).toBeGreaterThan(10)
  })
})
