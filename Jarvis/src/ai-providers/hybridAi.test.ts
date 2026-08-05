import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiError } from '../ai/errors'
import { maskApiKey, mergeKeyInput, obfuscateSecret, deobfuscateSecret } from './keyVault'
import {
  clearProviderKey,
  hasAnyConfiguredProvider,
  HYBRID_AI_KEY,
  loadHybridAiConfig,
  saveHybridAiConfig,
  updateProviderSlot,
} from './providerConfig'
import {
  classifyProviderBody,
  hybridUserMessage,
  isFallbackableError,
  mapAiErrorToHybrid,
} from './providerErrors'
import { AUTO_PROVIDER_ORDER, listHybridProviders } from './providerRegistry'
import { runHybridChat } from './providerRouter'
import { LOCAL_NO_AI_MESSAGE } from './providers/localFallbackProvider'
import { OPENROUTER_DEFAULT_MODEL } from './models'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('hybrid AI key vault', () => {
  it('masks and obfuscates keys without logging full secret', () => {
    const key = 'sk-proj-ABCDEFGHIJKLMNOPQRSTUV'
    expect(maskApiKey(key)).toMatch(/^sk-p…/)
    expect(maskApiKey(key)).not.toContain('ABCDEF')
    const enc = obfuscateSecret(key)
    expect(enc.startsWith('aizio1:')).toBe(true)
    expect(enc).not.toContain(key)
    expect(deobfuscateSecret(enc)).toBe(key)
    expect(mergeKeyInput('', key)).toBe(key)
    expect(mergeKeyInput('sk-new', key)).toBe('sk-new')
  })
})

describe('hybrid AI config', () => {
  beforeEach(() => store.clear())

  it('starts unconfigured and stores openrouter key', () => {
    expect(hasAnyConfiguredProvider()).toBe(false)
    updateProviderSlot('openrouter', { apiKey: 'or-test-key', model: OPENROUTER_DEFAULT_MODEL })
    expect(hasAnyConfiguredProvider()).toBe(true)
    const raw = store.get(HYBRID_AI_KEY) || ''
    expect(raw).not.toContain('or-test-key')
    expect(loadHybridAiConfig().providers.openrouter?.apiKey).toBe('or-test-key')
    clearProviderKey('openrouter')
    expect(hasAnyConfiguredProvider()).toBe(false)
  })

  it('defaults paid fallback off and auto mode', () => {
    const cfg = loadHybridAiConfig()
    expect(cfg.allowPaidFallback).toBe(false)
    expect(cfg.mode).toBe('auto')
    expect(AUTO_PROVIDER_ORDER[0]).toBe('openrouter')
  })

  it('lists free and paid providers', () => {
    const list = listHybridProviders()
    expect(list.map((p) => p.id)).toEqual(['openrouter', 'gemini', 'groq', 'openai', 'custom'])
    expect(list.filter((p) => p.category === 'free').map((p) => p.id)).toEqual([
      'openrouter',
      'gemini',
      'groq',
    ])
  })
})

describe('hybrid AI errors', () => {
  it('distinguishes quota, auth, rate limit, payment', () => {
    expect(mapAiErrorToHybrid(new AiError('config', 'x'))).toBe('missing_key')
    expect(mapAiErrorToHybrid(new AiError('auth', 'invalid'))).toBe('invalid_key')
    expect(mapAiErrorToHybrid(new AiError('auth', 'payment required'))).toBe('payment_required')
    expect(mapAiErrorToHybrid(new AiError('rate_limit', '무료 한도'))).toBe('quota')
    expect(mapAiErrorToHybrid(new AiError('rate_limit', '속도 제한'))).toBe('rate_limit')
    expect(hybridUserMessage('missing_key')).toMatch(/무료 AI/)
    expect(hybridUserMessage('quota')).toMatch(/한도/)
    expect(classifyProviderBody(402, 'Payment Required').kind).toBe('auth')
    expect(classifyProviderBody(429, 'rate limit exceeded').kind).toBe('rate_limit')
    expect(isFallbackableError(new AiError('rate_limit', 'x'))).toBe(true)
    expect(isFallbackableError(new AiError('offline', 'x'))).toBe(false)
    expect(isFallbackableError(new AiError('cancelled', 'x'))).toBe(false)
  })
})

describe('hybrid AI router', () => {
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    })
  })

  it('fails clearly when no provider configured', async () => {
    await expect(runHybridChat({ message: '안녕' })).rejects.toMatchObject({ kind: 'config' })
    await expect(runHybridChat({ message: '안녕' }).catch((e) => e.message)).resolves.toBe(
      LOCAL_NO_AI_MESSAGE,
    )
  })

  it('uses openrouter then falls back to groq on rate limit', async () => {
    updateProviderSlot('openrouter', { apiKey: 'or-key', model: 'openrouter/free' })
    updateProviderSlot('groq', { apiKey: 'gq-key', model: 'llama-3.1-8b-instant' })
    saveHybridAiConfig({ ...loadHybridAiConfig(), allowPaidFallback: false, mode: 'auto' })

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('openrouter')) {
        return {
          ok: false,
          status: 429,
          text: async () => 'rate limit / free tier',
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '안녕하세요 from groq' }, finish_reason: 'stop' }],
          model: 'llama-3.1-8b-instant',
        }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const out = await runHybridChat({ message: '안녕하세요' })
    expect(out.providerId).toBe('groq')
    expect(out.fallbackUsed).toBe(true)
    expect(out.text).toMatch(/groq/)
  })

  it('does not auto-use openai when paid fallback disabled', async () => {
    updateProviderSlot('openai', { apiKey: 'sk-paid', model: 'gpt-4o-mini' })
    saveHybridAiConfig({ ...loadHybridAiConfig(), allowPaidFallback: false, mode: 'auto' })
    await expect(runHybridChat({ message: '안녕' })).rejects.toMatchObject({ kind: 'config' })
  })

  it('falls back to next recommended model on model_unavailable', async () => {
    updateProviderSlot('openrouter', {
      apiKey: 'or-key',
      model: 'meta-llama/dead-model:free',
    })
    saveHybridAiConfig({ ...loadHybridAiConfig(), allowPaidFallback: false, mode: 'fixed', fixedProvider: 'openrouter' })

    const fetchMock = vi.fn(async (_url: string, init?: { body?: string }) => {
      const body = typeof init?.body === 'string' ? init.body : ''
      if (body.includes('dead-model')) {
        return {
          ok: false,
          status: 404,
          text: async () => 'model not found',
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'ok from free router' }, finish_reason: 'stop' }],
          model: 'openrouter/free',
        }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const out = await runHybridChat({ message: '안녕' })
    expect(out.text).toMatch(/ok from free/)
    expect(out.fallbackUsed).toBe(true)
    expect(loadHybridAiConfig().providers.openrouter?.model).toBe('openrouter/free')
  })
})
