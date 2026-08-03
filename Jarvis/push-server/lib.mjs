/** Pure helpers for push-server (unit-tested without listening). */

export function privacyBody(mode, title, body) {
  if (mode === 'hidden') return { title: 'AIZIO', body: 'AIZIO 알림이 있습니다.' }
  if (mode === 'simple') return { title: 'AIZIO', body: '예약된 일정 시간입니다.' }
  return {
    title: String(title || 'AIZIO').slice(0, 64),
    body: String(body || `${title} 시간입니다.`).slice(0, 160),
  }
}

export function isHttpsEndpoint(endpoint) {
  try {
    const u = new URL(String(endpoint || ''))
    return u.protocol === 'https:' && u.hostname.length > 0
  } catch {
    return false
  }
}

export function maskId(id) {
  const s = String(id || '')
  if (s.length <= 8) return '****'
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

export function parseOrigins(raw, defaults) {
  const list = String(raw || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return list.length ? list : defaults
}

export function normalizeBaseUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '')
}

export function assertHttpsBaseUrl(url, { allowLocalhost = false } = {}) {
  const base = normalizeBaseUrl(url)
  if (!base) return { ok: false, error: 'empty' }
  try {
    const u = new URL(base)
    if (u.protocol === 'https:') return { ok: true, base }
    if (
      allowLocalhost &&
      u.protocol === 'http:' &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
    ) {
      return { ok: true, base }
    }
    return { ok: false, error: 'https_required' }
  } catch {
    return { ok: false, error: 'invalid_url' }
  }
}

export function pastReminderStatus(scheduledAtMs, now = Date.now()) {
  if (!Number.isFinite(scheduledAtMs)) return 'invalid'
  if (scheduledAtMs > now) return 'scheduled'
  if (now - scheduledAtMs > 24 * 60 * 60 * 1000) return 'expired'
  return 'due'
}
