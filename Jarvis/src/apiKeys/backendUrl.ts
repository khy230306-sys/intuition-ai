/**
 * Resolve AIZIO API backend base URL for provider secrets / AI proxy.
 * Uses the same push-server host when configured.
 */

import { getPushServerStatus } from '../push/serverUrl'
import type { BackendCapability } from './types'

const PREVIEW_CFG = 'preview-config.json'

function normalizeBase(url: string): string {
  return url.trim().replace(/\/$/, '')
}

function isLocalHost(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export function isLikelyStaticPreviewHost(): boolean {
  try {
    const h = location.hostname
    return /\.shipstatic\.com$/i.test(h) && !/localhost|127\.0\.0\.1/i.test(h)
  } catch {
    return false
  }
}

/** Prefer explicit push server URL, then preview-config default, then local dev. */
export function resolveApiBackendBaseUrl(): string | null {
  const push = getPushServerStatus()
  if (push.configured && push.baseUrl) return normalizeBase(push.baseUrl)

  try {
    const cached = sessionStorage.getItem('aizio.api.backendBase.v1')
    if (cached) return normalizeBase(cached)
  } catch {
    /* ignore */
  }

  // Sync hint from preview-config (boot may also set push URL)
  try {
    const el = document.querySelector('meta[name="aizio-api-backend"]')
    const content = el?.getAttribute('content')?.trim()
    if (content) return normalizeBase(content)
  } catch {
    /* ignore */
  }

  // Local Vite / preview ports → default push-server
  try {
    if (isLocalHost(location.origin) || /localhost|127\.0\.0\.1/i.test(location.hostname)) {
      return 'http://127.0.0.1:8787'
    }
  } catch {
    /* ignore */
  }

  return null
}

export async function probeApiBackend(): Promise<BackendCapability> {
  const baseUrl = resolveApiBackendBaseUrl()
  const staticPreview = isLikelyStaticPreviewHost()

  if (!baseUrl) {
    return {
      reachable: false,
      baseUrl: null,
      reason: staticPreview
        ? '이 Preview는 정적 호스팅이라 Live API 키 서버 저장을 사용할 수 없습니다. 로컬/서버 버전에서 푸시·API 서버 URL을 설정해 주세요.'
        : 'API 백엔드 URL이 없습니다. 설정에서 푸시 서버 URL(예: http://127.0.0.1:8787)을 입력하세요.',
      supportsSecretStore: false,
      previewStaticOnly: staticPreview,
    }
  }

  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 5000)
    const res = await fetch(`${baseUrl}/health`, { signal: ac.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!res.ok) {
      return {
        reachable: false,
        baseUrl,
        reason: `백엔드 응답 오류 (${res.status})`,
        supportsSecretStore: false,
        previewStaticOnly: staticPreview && isLocalHost(baseUrl) === false,
      }
    }
    const json = (await res.json()) as { providerSecrets?: { ok?: boolean } }
    const supports = Boolean(json?.providerSecrets?.ok)
    return {
      reachable: true,
      baseUrl,
      reason: supports
        ? '서버 Secret Store 사용 가능 (개발용 JSON 파일 저장)'
        : '서버는 응답하지만 Secret Store가 없습니다.',
      supportsSecretStore: supports,
      previewStaticOnly: false,
    }
  } catch {
    return {
      reachable: false,
      baseUrl,
      reason: staticPreview
        ? 'Preview에서 API 백엔드에 연결할 수 없습니다. Live API 키 서버 저장은 로컬/서버 버전에서 설정해 주세요.'
        : `백엔드에 연결할 수 없습니다 (${baseUrl}). 서버가 실행 중인지·CORS를 확인하세요.`,
      supportsSecretStore: false,
      previewStaticOnly: staticPreview,
    }
  }
}

/** Best-effort: load preview-config and remember defaultPushServerUrl as API base. */
export async function warmPreviewApiBackendHint(): Promise<void> {
  try {
    const res = await fetch(`/${PREVIEW_CFG}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const cfg = (await res.json()) as { defaultPushServerUrl?: string }
    const url = (cfg.defaultPushServerUrl || '').trim()
    if (url) sessionStorage.setItem('aizio.api.backendBase.v1', normalizeBase(url))
  } catch {
    /* ignore */
  }
}
