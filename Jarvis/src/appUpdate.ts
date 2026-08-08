/** Home-screen PWA update helpers — always target the fixed host for the current channel. */

export const FIXED_APP_URL = 'https://jarvis-app.shipstatic.com'

/**
 * Canonical fixed Preview (claimable platform domain).
 * ShipStatic rejects the hyphenated snapshot id light-lab-92m8bq7 as a domain.
 */
export const FIXED_PREVIEW_URL = 'https://lightlab-92m8bq7.shipstatic.com'
export const FIXED_PREVIEW_HOST = 'lightlab-92m8bq7.shipstatic.com'

/** Extra Preview aliases that stay same-origin for home-screen updates. */
export const FIXED_PREVIEW_ALIAS_HOSTS = ['light-lab.shipstatic.com'] as const

/** Snapshot URL the user originally bookmarked — not claimable as a ShipStatic domain. */
export const LEGACY_PREVIEW_HOST = 'light-lab-92m8bq7.shipstatic.com'

export const PENDING_UPDATE_KEY = 'jarvis.app.pendingUpdate'
export const UPDATE_RETRY_KEY = 'jarvis.updateRetry'
/** After 「최신 빌드로 업데이트」: warm offline shell + finish home-screen install. */
export const POST_UPDATE_OFFLINE_HOME_KEY = 'aizio.update.prepareOfflineHome.v1'
/** iOS share sheet open — wait for user before navigating away. */
export const UPDATE_AWAIT_HOME_KEY = 'aizio.update.awaitHome.v1'

export function markPostUpdateOfflineHome(): void {
  try {
    localStorage.setItem(POST_UPDATE_OFFLINE_HOME_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function clearPostUpdateOfflineHome(): void {
  try {
    localStorage.removeItem(POST_UPDATE_OFFLINE_HOME_KEY)
  } catch {
    /* ignore */
  }
}

export function peekPostUpdateOfflineHome(): boolean {
  try {
    return localStorage.getItem(POST_UPDATE_OFFLINE_HOME_KEY) === '1'
  } catch {
    return false
  }
}

export function markUpdateAwaitHome(): void {
  try {
    sessionStorage.setItem(UPDATE_AWAIT_HOME_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearUpdateAwaitHome(): void {
  try {
    sessionStorage.removeItem(UPDATE_AWAIT_HOME_KEY)
  } catch {
    /* ignore */
  }
}

export function peekUpdateAwaitHome(): boolean {
  try {
    return sessionStorage.getItem(UPDATE_AWAIT_HOME_KEY) === '1'
  } catch {
    return false
  }
}

export type RemoteBuildInfo = {
  version: string
  buildId: string | null
  commit: string | null
}

export function isFixedPreviewHost(hostname?: string): boolean {
  const host = String(hostname || '')
    .trim()
    .toLowerCase()
  if (!host) return false
  if (host === FIXED_PREVIEW_HOST) return true
  return (FIXED_PREVIEW_ALIAS_HOSTS as readonly string[]).includes(host)
}

export function isLegacyPreviewHost(hostname?: string): boolean {
  return (
    String(hostname || '')
      .trim()
      .toLowerCase() === LEGACY_PREVIEW_HOST
  )
}

/**
 * Resolve which fixed origin "앱 업데이트" should hit.
 * - Already on a fixed Preview alias → stay on THAT origin (home-screen PWA safe).
 * - Legacy snapshot light-lab-92m8bq7 → migrate to canonical fixed Preview.
 * - Everywhere else → production.
 */
export function resolveUpdateBaseUrl(hostname?: string): string {
  const host = (
    hostname ??
    (typeof location !== 'undefined' && location?.hostname ? location.hostname : '')
  )
    .trim()
    .toLowerCase()
  if (isFixedPreviewHost(host)) return `https://${host}`
  if (isLegacyPreviewHost(host)) return FIXED_PREVIEW_URL
  return FIXED_APP_URL
}

/** True when update will leave the current origin (legacy snapshot → fixed Preview). */
export function updateCrossesOrigin(hostname?: string): boolean {
  const host = (
    hostname ??
    (typeof location !== 'undefined' && location?.hostname ? location.hostname : '')
  )
    .trim()
    .toLowerCase()
  if (!host) return false
  const target = resolveUpdateBaseUrl(host).replace(/^https?:\/\//, '').replace(/\/$/, '')
  return target !== host
}

/** Parse version from deployed index.html (meta or title). */
export function parseJarvisVersionFromHtml(html: string): string | null {
  const meta =
    html.match(/name=["']jarvis-version["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*name=["']jarvis-version["']/i)
  if (meta?.[1]) return meta[1].trim()
  const title = html.match(/<title>\s*(?:AIZIO|JARVIS)\s+(\d+\.\d+\.\d+)/i)
  return title?.[1]?.trim() || null
}

/** Semver-ish compare: 1 if a>b, -1 if a<b, 0 if equal/unparsable equal. */
export function compareAppVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0)
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0)
  const n = Math.max(pa.length, pb.length)
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da > db) return 1
    if (da < db) return -1
  }
  return 0
}

function parseBuildMetaJson(raw: unknown): RemoteBuildInfo | null {
  if (!raw || typeof raw !== 'object') return null
  const j = raw as Record<string, unknown>
  const version = typeof j.version === 'string' ? j.version.trim() : ''
  if (!/^\d+\.\d+\.\d+/.test(version)) return null
  return {
    version,
    buildId: typeof j.buildId === 'string' ? j.buildId : null,
    commit: typeof j.commit === 'string' ? j.commit : null,
  }
}

/**
 * Read live build-meta from the channel's fixed host.
 * Call after SW unregister when possible — SW used to precache this file and lie.
 */
export async function fetchRemoteBuildMeta(
  timeoutMs = 8000,
  baseUrl?: string,
): Promise<RemoteBuildInfo | null> {
  const base = (baseUrl || resolveUpdateBaseUrl()).replace(/\/$/, '')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const url = `${base}/build-meta.json?_=${Date.now()}&_nocache=1`
    const res = await fetch(url, {
      cache: 'no-store',
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
    if (!res.ok) return null
    return parseBuildMetaJson(await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Fallback: parse version from the channel's fixed HTML. */
export async function fetchRemoteAppVersionFromHtml(
  timeoutMs = 6000,
  baseUrl?: string,
): Promise<string | null> {
  const base = (baseUrl || resolveUpdateBaseUrl()).replace(/\/$/, '')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}/?_nocache=${Date.now()}`, {
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
    })
    if (!res.ok) return null
    return parseJarvisVersionFromHtml(await res.text())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Read jarvis-version from the live fixed host for this channel. */
export async function fetchRemoteAppVersion(timeoutMs = 8000): Promise<string | null> {
  const base = resolveUpdateBaseUrl()
  const meta = await fetchRemoteBuildMeta(timeoutMs, base)
  if (meta?.version) return meta.version
  return fetchRemoteAppVersionFromHtml(Math.min(timeoutMs, 6000), base)
}

export function buildUpdateUrl(opts: {
  version?: string
  buildId?: string | null
  step?: number
  baseUrl?: string
}): string {
  const base = (opts.baseUrl || resolveUpdateBaseUrl()).replace(/\/$/, '')
  const u = new URL(`${base}/`)
  if (opts.version) u.searchParams.set('_v', opts.version)
  u.searchParams.set('_t', String(Date.now()))
  u.searchParams.set('_update', String(opts.step ?? 1))
  u.searchParams.set('_nocache', String(Date.now()))
  if (opts.buildId) u.searchParams.set('_bid', opts.buildId)
  return u.toString()
}

export type PendingUpdate = { version: string; buildId: string | null; at: number }

export function readPendingUpdate(): PendingUpdate | null {
  try {
    const raw = localStorage.getItem(PENDING_UPDATE_KEY)
    if (!raw) return null
    const j = JSON.parse(raw) as PendingUpdate
    if (!j?.version) return null
    return j
  } catch {
    return null
  }
}

export function writePendingUpdate(version: string, buildId: string | null): void {
  const payload: PendingUpdate = { version, buildId, at: Date.now() }
  localStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify(payload))
}

export function clearPendingUpdate(): void {
  try {
    localStorage.removeItem(PENDING_UPDATE_KEY)
    sessionStorage.removeItem(UPDATE_RETRY_KEY)
  } catch {
    /* ignore */
  }
}
