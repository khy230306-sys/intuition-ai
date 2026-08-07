/**
 * Provider key orchestration:
 * 1) Prefer server Secret Store when backend reachable
 * 2) Device-local obfuscated store (honestly labeled — not a vault)
 * 3) none
 *
 * Invalidates in-memory status cache on every save/delete.
 */

import {
  clearProviderKey,
  getProviderSlot,
  loadHybridAiConfig,
  updateProviderSlot,
} from '../ai-providers/providerConfig'
import { maskApiKey, mergeKeyInput } from '../ai-providers/keyVault'
import type { HybridProviderId } from '../ai-providers/types'
import { probeApiBackend } from './backendUrl'
import {
  deleteServerKey,
  fetchServerKeyStatuses,
  saveServerKey,
  serverChatProxy,
  testServerKey,
} from './secretClient'
import { clearServerConfigured, markServerConfigured } from './serverFlags'
import type {
  BackendCapability,
  ProviderKeyStatus,
  SaveKeyResult,
  TestKeyResult,
} from './types'

const HYBRID_IDS: HybridProviderId[] = ['openrouter', 'gemini', 'groq', 'openai', 'custom']

let statusCache: ProviderKeyStatus[] | null = null
let cacheAt = 0
let preferServerChat = false

export function invalidateProviderKeyCache(): void {
  statusCache = null
  cacheAt = 0
}

export function shouldPreferServerChat(): boolean {
  return preferServerChat
}

export async function refreshBackendPreference(): Promise<BackendCapability> {
  const cap = await probeApiBackend()
  preferServerChat = cap.reachable && cap.supportsSecretStore
  return cap
}

function deviceStatus(id: HybridProviderId): ProviderKeyStatus {
  const slot = getProviderSlot(id)
  const key = slot.apiKey.trim()
  return {
    provider: id,
    configured: Boolean(key),
    source: key ? 'device-local' : 'none',
    maskedKey: key ? maskApiKey(key) : '',
    lastUpdatedAt: slot.lastSuccessAt || null,
    lastTestedAt: slot.lastSuccessAt || null,
    connectionStatus:
      slot.status === 'ok'
        ? 'connected'
        : slot.status === 'auth'
          ? 'invalid'
          : slot.status === 'quota' || slot.status === 'rate_limit'
            ? 'quota_error'
            : slot.status === 'error'
              ? 'provider_error'
              : key
                ? 'untested'
                : 'untested',
    lastErrorCode: slot.lastError ? 'DEVICE' : null,
    apiBase: slot.apiBase,
    model: slot.model,
  }
}

export async function listProviderKeyStatuses(force = false): Promise<ProviderKeyStatus[]> {
  if (!force && statusCache && Date.now() - cacheAt < 2000) return statusCache

  const device = HYBRID_IDS.map(deviceStatus)
  const server = await fetchServerKeyStatuses()
  const byId = new Map<string, ProviderKeyStatus>()

  for (const d of device) byId.set(d.provider, d)

  if (server.ok) {
    for (const s of server.providers) {
      if (!s.configured) {
        // Drop stale flags when server no longer has the key
        if (HYBRID_IDS.includes(s.provider as HybridProviderId)) {
          clearServerConfigured(s.provider)
        }
        continue
      }
      // Server user-secret / environment wins over device-local
      byId.set(s.provider, {
        ...s,
        source: s.source === 'environment' ? 'environment' : 'user-secret',
      })
      // App-owned keys (env) or saved secrets → unlock cloud without user paste
      markServerConfigured(
        s.provider,
        true,
        s.source === 'environment' ? 'environment' : 'user-secret',
      )
    }
    preferServerChat = true
  }

  statusCache = [...byId.values()]
  cacheAt = Date.now()
  return statusCache
}

export async function saveProviderKey(
  provider: HybridProviderId,
  input: { apiKeyInput: string; apiBase?: string; model?: string; allowDeviceFallback?: boolean },
): Promise<SaveKeyResult> {
  const existing = getProviderSlot(provider).apiKey
  const apiKey = mergeKeyInput(input.apiKeyInput, existing)
  if (!apiKey) {
    return { ok: false, message: '저장할 키가 없습니다.', via: 'none' }
  }

  const cap = await refreshBackendPreference()
  if (cap.supportsSecretStore && cap.reachable) {
    const saved = await saveServerKey(provider, {
      apiKey,
      apiBase: input.apiBase,
      model: input.model,
    })
    invalidateProviderKeyCache()
    if (saved.ok) {
      markServerConfigured(provider, true, 'user-secret')
      // Keep device slot metadata (model/base) but clear plaintext secret when server holds it
      updateProviderSlot(provider, {
        apiKey: '',
        apiBase: input.apiBase,
        model: input.model,
        status: 'unknown',
        lastError: undefined,
      })
      const cfg = loadHybridAiConfig()
      const slot = cfg.providers[provider]
      if (slot) {
        updateProviderSlot(provider, {
          apiKey: '',
          model: input.model || slot.model,
          apiBase: input.apiBase || slot.apiBase,
        })
      }
      return { ...saved, message: '저장되었습니다.' }
    }
    if (!input.allowDeviceFallback) {
      return saved
    }
  } else if (!input.allowDeviceFallback && (cap.previewStaticOnly || !cap.reachable)) {
    return {
      ok: false,
      message: cap.reason,
      via: 'none',
    }
  }

  // Device-local fallback (obfuscated) — labeled honestly
  clearServerConfigured(provider)
  updateProviderSlot(provider, {
    apiKey,
    apiBase: input.apiBase,
    model: input.model,
    status: 'unknown',
    lastError: undefined,
  })
  invalidateProviderKeyCache()
  return {
    ok: true,
    message: cap.reachable
      ? '서버 저장에 실패해 이 기기에만 저장했습니다 (개발용 · 서버 비밀 보관 아님).'
      : '이 기기에만 저장했습니다 (개발용 · 서버 비밀 보관 아님).',
    via: 'device-local',
    status: deviceStatus(provider),
  }
}

export async function deleteProviderKeyFull(provider: HybridProviderId): Promise<SaveKeyResult> {
  const cap = await refreshBackendPreference()
  let serverOk = false
  if (cap.supportsSecretStore && cap.reachable) {
    const r = await deleteServerKey(provider)
    serverOk = r.ok
  }
  clearServerConfigured(provider)
  clearProviderKey(provider)
  invalidateProviderKeyCache()
  return {
    ok: true,
    message: serverOk ? '삭제되었습니다.' : '기기 키를 삭제했습니다.',
    via: serverOk ? 'server' : 'device-local',
  }
}

export async function testProviderKeyFull(
  provider: HybridProviderId,
  opts?: { apiKeyInput?: string; apiBase?: string; model?: string },
): Promise<TestKeyResult> {
  const cap = await refreshBackendPreference()
  const existing = getProviderSlot(provider).apiKey
  const typed = opts?.apiKeyInput ? mergeKeyInput(opts.apiKeyInput, existing) : ''

  if (cap.supportsSecretStore && cap.reachable) {
    const r = await testServerKey(provider, {
      apiKey: typed || undefined,
      apiBase: opts?.apiBase,
      model: opts?.model,
    })
    invalidateProviderKeyCache()
    return r
  }

  // Device path — use existing hybrid test after ensuring key flushed
  if (typed) {
    updateProviderSlot(provider, {
      apiKey: typed,
      apiBase: opts?.apiBase,
      model: opts?.model,
    })
  }
  const slot = getProviderSlot(provider)
  if (!slot.apiKey.trim()) {
    return {
      ok: false,
      message: 'API 키가 없습니다.',
      connectionStatus: 'invalid',
      code: 'NO_KEY',
    }
  }
  const { testProviderConnection } = await import('../ai-providers/providerHealth')
  const r = await testProviderConnection(provider)
  invalidateProviderKeyCache()
  return {
    ok: r.ok,
    message: r.message,
    connectionStatus: r.ok ? 'connected' : 'provider_error',
    latencyMs: r.latencyMs,
  }
}

export async function chatViaServerIfPreferred(
  provider: HybridProviderId,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): Promise<{ used: boolean; text?: string; model?: string; message?: string }> {
  const cap = await refreshBackendPreference()
  if (!cap.supportsSecretStore || !cap.reachable) return { used: false }
  const statuses = await listProviderKeyStatuses(true)
  const st = statuses.find((s) => s.provider === provider)
  if (!st?.configured || (st.source !== 'user-secret' && st.source !== 'environment')) {
    return { used: false }
  }
  const out = await serverChatProxy({ provider, messages })
  if (!out.ok) return { used: true, message: out.message }
  return { used: true, text: out.text, model: out.model }
}

export function sourceLabelKo(source: ProviderKeyStatus['source']): string {
  if (source === 'user-secret') return '서버 Secret Store'
  if (source === 'environment') return '서버 환경변수'
  if (source === 'device-local') return '이 기기 (개발용)'
  return '없음'
}
