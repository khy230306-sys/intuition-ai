export type BuildMetaLite = {
  channel?: string
  version?: string
  commit?: string
}

let cachedMeta: BuildMetaLite | null = null
let fetchPromise: Promise<BuildMetaLite> | null = null

export function getCachedBuildChannel(): string {
  return cachedMeta?.channel || ''
}

export function setCachedBuildMeta(meta: BuildMetaLite): void {
  cachedMeta = meta
}

export async function loadBuildMetaLite(): Promise<BuildMetaLite> {
  if (cachedMeta) return cachedMeta
  if (fetchPromise) return fetchPromise
  fetchPromise = (async () => {
    try {
      const res = await fetch(`./build-meta.json?_=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) {
        cachedMeta = { channel: '' }
        return cachedMeta
      }
      const json = (await res.json()) as BuildMetaLite
      cachedMeta = {
        channel: String(json.channel || ''),
        version: json.version ? String(json.version) : undefined,
        commit: json.commit ? String(json.commit) : undefined,
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
