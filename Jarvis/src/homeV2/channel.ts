export type BuildMetaLite = {
  channel?: string
  version?: string
  commit?: string
  buildId?: string
}

let cachedMeta: BuildMetaLite | null = null
let fetchPromise: Promise<BuildMetaLite> | null = null

export function getCachedBuildChannel(): string {
  return cachedMeta?.channel || ''
}

export function setCachedBuildMeta(meta: BuildMetaLite): void {
  cachedMeta = meta
}

export async function loadBuildMetaLite(opts?: { force?: boolean }): Promise<BuildMetaLite> {
  if (!opts?.force && cachedMeta) return cachedMeta
  if (!opts?.force && fetchPromise) return fetchPromise
  if (opts?.force) {
    cachedMeta = null
    fetchPromise = null
  }
  fetchPromise = (async () => {
    try {
      // _nocache is intentionally NOT ignored by the service worker match rules
      const res = await fetch(`./build-meta.json?_=${Date.now()}&_nocache=1`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      if (!res.ok) {
        cachedMeta = { channel: '' }
        return cachedMeta
      }
      const json = (await res.json()) as BuildMetaLite
      const full = json as BuildMetaLite & { buildId?: string }
      cachedMeta = {
        channel: String(full.channel || ''),
        version: full.version ? String(full.version) : undefined,
        commit: full.commit ? String(full.commit) : undefined,
        buildId: full.buildId ? String(full.buildId) : undefined,
      }
      return cachedMeta
    } catch {
      cachedMeta = { channel: '' }
      return cachedMeta
    } finally {
      fetchPromise = null
    }
  })()
  return fetchPromise
}
