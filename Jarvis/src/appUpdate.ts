/** Home-screen PWA update helpers — always target the fixed production host. */

export const FIXED_APP_URL = 'https://jarvis-app.shipstatic.com'

export const PENDING_UPDATE_KEY = 'jarvis.app.pendingUpdate'
export const UPDATE_RETRY_KEY = 'jarvis.updateRetry'

export type RemoteBuildInfo = {
  version: string
  buildId: string | null
  commit: string | null
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
 * Read live production build-meta (preferred).
 * Call after SW unregister when possible — SW used to precache this file and lie.
 */
export async function fetchRemoteBuildMeta(timeoutMs = 8000): Promise<RemoteBuildInfo | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const url = `${FIXED_APP_URL}/build-meta.json?_=${Date.now()}&_nocache=1`
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

/** Fallback: parse version from production HTML. */
export async function fetchRemoteAppVersionFromHtml(timeoutMs = 6000): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    // Use _nocache (NOT in SW ignore list) so precache cannot match by stripping params
    const res = await fetch(`${FIXED_APP_URL}/?_nocache=${Date.now()}`, {
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

/** Read jarvis-version from the live production site. */
export async function fetchRemoteAppVersion(timeoutMs = 8000): Promise<string | null> {
  const meta = await fetchRemoteBuildMeta(timeoutMs)
  if (meta?.version) return meta.version
  return fetchRemoteAppVersionFromHtml(Math.min(timeoutMs, 6000))
}

export function buildUpdateUrl(opts: {
  version?: string
  buildId?: string | null
  step?: number
}): string {
  const u = new URL(`${FIXED_APP_URL}/`)
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
