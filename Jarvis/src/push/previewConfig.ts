import { assertHttpsBaseUrl, normalizeBaseUrl } from './urlNormalize'
import { getPushServerStatus, setPushServerBaseUrl } from './serverUrl'

export type PreviewConfig = {
  channel?: string
  defaultPushServerUrl?: string
}

/**
 * Priority:
 * 1) Existing localStorage / settings URL (user override)
 * 2) preview-config.json defaultPushServerUrl (preview channel)
 * Never auto-writes production fixed URL.
 */
export async function applyPreviewPushServerDefault(opts?: {
  allowHttpLocalhost?: boolean
  forceChannel?: string
}): Promise<{ applied: boolean; url: string | null; source: string }> {
  const current = getPushServerStatus()
  if (current.configured && current.baseUrl) {
    return { applied: false, url: current.baseUrl, source: 'user_or_stored' }
  }
  try {
    const res = await fetch(`./preview-config.json?_=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return { applied: false, url: null, source: 'missing_config' }
    const cfg = (await res.json()) as PreviewConfig
    const channel = opts?.forceChannel || cfg.channel || ''
    const raw = normalizeBaseUrl(cfg.defaultPushServerUrl || '')
    if (!raw) return { applied: false, url: null, source: 'empty_default' }
    if (channel && channel !== 'preview' && channel !== 'dev') {
      return { applied: false, url: null, source: 'non_preview_channel' }
    }
    const check = assertHttpsBaseUrl(raw, { allowLocalhost: opts?.allowHttpLocalhost === true })
    if (!check.ok || !check.base) return { applied: false, url: null, source: check.error || 'invalid' }
    setPushServerBaseUrl(check.base)
    return { applied: true, url: check.base, source: 'preview_config' }
  } catch {
    return { applied: false, url: null, source: 'fetch_error' }
  }
}

export async function pingPushHealth(baseUrl?: string): Promise<{
  ok: boolean
  status: number
  body: Record<string, unknown> | null
  error?: string
}> {
  const base = normalizeBaseUrl(baseUrl || getPushServerStatus().baseUrl || '')
  if (!base) return { ok: false, status: 0, body: null, error: 'no_url' }
  try {
    const res = await fetch(`${base}/health`, { cache: 'no-store' })
    const body = (await res.json()) as Record<string, unknown>
    return { ok: res.ok && body.ok === true, status: res.status, body }
  } catch {
    return { ok: false, status: 0, body: null, error: 'network_error' }
  }
}
