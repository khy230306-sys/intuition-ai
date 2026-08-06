import { resolveApiBackendBaseUrl } from './backendUrl'
import type { ProviderKeyStatus, SaveKeyResult, TestKeyResult } from './types'

function baseOrThrow(): string {
  const b = resolveApiBackendBaseUrl()
  if (!b) {
    const e = new Error('NO_BACKEND')
    ;(e as Error & { code: string }).code = 'NO_BACKEND'
    throw e
  }
  return b
}

async function parse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    return { ok: false, error: 'invalid_json', message: text.slice(0, 120) }
  }
}

export async function fetchServerKeyStatuses(): Promise<{
  ok: boolean
  providers: ProviderKeyStatus[]
  generation?: number
  error?: string
}> {
  try {
    const base = baseOrThrow()
    const res = await fetch(`${base}/v1/provider-keys`, { cache: 'no-store' })
    const json = await parse(res)
    if (!res.ok || json.ok === false) {
      return { ok: false, providers: [], error: String(json.error || res.status) }
    }
    return {
      ok: true,
      providers: (json.providers as ProviderKeyStatus[]) || [],
      generation: Number(json.generation || 0),
    }
  } catch (e) {
    return {
      ok: false,
      providers: [],
      error: e instanceof Error && (e as Error & { code?: string }).code === 'NO_BACKEND' ? 'NO_BACKEND' : 'NETWORK',
    }
  }
}

export async function saveServerKey(
  provider: string,
  input: { apiKey: string; apiBase?: string; model?: string },
): Promise<SaveKeyResult> {
  try {
    const base = baseOrThrow()
    const res = await fetch(`${base}/v1/provider-keys/${encodeURIComponent(provider)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const json = await parse(res)
    if (!res.ok || json.ok === false) {
      return {
        ok: false,
        message: String(json.message || '저장하지 못했습니다.'),
        via: 'none',
      }
    }
    // Verify configured from server (never trust client alone)
    const verify = await fetch(`${base}/v1/provider-keys/${encodeURIComponent(provider)}`, {
      cache: 'no-store',
    })
    const vj = await parse(verify)
    if (!verify.ok || !vj.configured) {
      return { ok: false, message: '저장하지 못했습니다. (서버 확인 실패)', via: 'none' }
    }
    return {
      ok: true,
      message: '저장되었습니다.',
      via: 'server',
      status: vj as unknown as ProviderKeyStatus,
    }
  } catch (e) {
    const code = e instanceof Error ? (e as Error & { code?: string }).code : ''
    if (code === 'NO_BACKEND') {
      return {
        ok: false,
        message:
          'API 백엔드에 연결할 수 없어 서버에 저장하지 못했습니다. Preview 정적 호스팅이거나 서버 URL이 없습니다.',
        via: 'none',
      }
    }
    return { ok: false, message: '저장하지 못했습니다. (네트워크/CORS)', via: 'none' }
  }
}

export async function deleteServerKey(provider: string): Promise<SaveKeyResult> {
  try {
    const base = baseOrThrow()
    const res = await fetch(`${base}/v1/provider-keys/${encodeURIComponent(provider)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    const json = await parse(res)
    if (!res.ok || json.ok === false) {
      return { ok: false, message: '삭제하지 못했습니다.', via: 'none' }
    }
    return { ok: true, message: '삭제되었습니다.', via: 'server', status: json as unknown as ProviderKeyStatus }
  } catch {
    return { ok: false, message: '삭제하지 못했습니다. (네트워크)', via: 'none' }
  }
}

export async function testServerKey(
  provider: string,
  opts?: { apiKey?: string; apiBase?: string; model?: string },
): Promise<TestKeyResult> {
  try {
    const base = baseOrThrow()
    const res = await fetch(`${base}/v1/provider-keys/${encodeURIComponent(provider)}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts || {}),
    })
    const json = await parse(res)
    return {
      ok: Boolean(json.ok),
      message: String(json.message || (json.ok ? '연결 성공' : '연결 실패')),
      connectionStatus: (json.connectionStatus as TestKeyResult['connectionStatus']) || 'provider_error',
      code: json.code ? String(json.code) : undefined,
      latencyMs: typeof json.latencyMs === 'number' ? json.latencyMs : undefined,
      partial: Boolean(json.partial),
      status: json.status as ProviderKeyStatus | undefined,
    }
  } catch {
    return {
      ok: false,
      message: '연결 테스트 실패 (네트워크/CORS)',
      connectionStatus: 'network_error',
      code: 'NETWORK',
    }
  }
}

export async function serverChatProxy(input: {
  provider: string
  messages: Array<{ role: string; content: string }>
}): Promise<{ ok: boolean; text?: string; model?: string; message?: string }> {
  try {
    const base = baseOrThrow()
    const res = await fetch(`${base}/v1/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const json = await parse(res)
    if (!res.ok || json.ok === false) {
      return { ok: false, message: String(json.message || 'AI 프록시 실패') }
    }
    return { ok: true, text: String(json.text || ''), model: json.model ? String(json.model) : undefined }
  } catch {
    return { ok: false, message: 'AI 프록시 네트워크 오류' }
  }
}
