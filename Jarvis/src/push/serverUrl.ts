import { assertHttpsBaseUrl, normalizeBaseUrl } from './urlNormalize'
import type { PushServerStatus } from './reminderPushTypes'

const PUSH_SERVER_URL_KEY = 'aizio.push.serverBaseUrl.v1'

export function getPushServerStatus(): PushServerStatus {
  try {
    const base = localStorage.getItem(PUSH_SERVER_URL_KEY)?.trim() || null
    if (!base) {
      return {
        configured: false,
        baseUrl: null,
        reason: '푸시 서버 URL 미설정 — 앱 종료 개인 알림 예약 불가',
      }
    }
    return { configured: true, baseUrl: normalizeBaseUrl(base), reason: '서버 URL 설정됨' }
  } catch {
    return { configured: false, baseUrl: null, reason: 'storage 오류' }
  }
}

export function setPushServerBaseUrl(url: string | null, opts?: { allowHttpLocalhost?: boolean }): {
  ok: boolean
  url?: string | null
  error?: string
} {
  if (!url) {
    localStorage.removeItem(PUSH_SERVER_URL_KEY)
    return { ok: true, url: null }
  }
  const check = assertHttpsBaseUrl(url, { allowLocalhost: opts?.allowHttpLocalhost === true })
  if (!check.ok || !check.base) return { ok: false, error: check.error || 'invalid' }
  localStorage.setItem(PUSH_SERVER_URL_KEY, check.base)
  return { ok: true, url: check.base }
}
