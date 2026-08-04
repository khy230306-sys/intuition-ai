/**
 * HOME v2 preview preference — local only.
 * Never changes production default home.
 */

export type HomeVariant = 'legacy' | 'v2'

const STORAGE_KEY = 'aizio.home.variant.v1'
const BOOT_DEFAULT_KEY = 'aizio.home.bootDefault.v1'

export function readStoredHomeVariant(): HomeVariant | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'v2' || v === 'legacy') return v
    return null
  } catch {
    return null
  }
}

export function writeStoredHomeVariant(variant: HomeVariant | null): void {
  try {
    if (!variant) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, variant)
  } catch {
    /* ignore */
  }
}

export function readBootDefaultHome(): HomeVariant {
  try {
    const v = localStorage.getItem(BOOT_DEFAULT_KEY)
    return v === 'v2' ? 'v2' : 'legacy'
  } catch {
    return 'legacy'
  }
}

export function writeBootDefaultHome(variant: HomeVariant): void {
  try {
    localStorage.setItem(BOOT_DEFAULT_KEY, variant)
  } catch {
    /* ignore */
  }
}

export function clearHomeV2Prefs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(BOOT_DEFAULT_KEY)
  } catch {
    /* ignore */
  }
}

export function parseHomeQuery(raw: string | null | undefined): HomeVariant | null {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'v2' || v === 'homev2' || v === 'new') return 'v2'
  if (v === 'legacy' || v === 'v1' || v === 'classic') return 'legacy'
  return null
}

export function isPreviewLikeChannel(channel: string | null | undefined, hostname: string): boolean {
  const c = String(channel || '').toLowerCase()
  if (c === 'preview' || c === 'dev') return true
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1') return true
  // ShipStatic snapshot hosts (not production fixed domain)
  if (host.endsWith('.shipstatic.com') && host !== 'jarvis-app.shipstatic.com') return true
  return false
}

export function isProductionHost(hostname: string): boolean {
  return hostname.toLowerCase() === 'jarvis-app.shipstatic.com'
}

/**
 * Resolve active home variant.
 * Priority: URL query → (preview only) stored session/boot preference → legacy.
 * Production host always defaults to legacy unless explicit ?home=v2.
 */
export function resolveHomeVariant(input: {
  queryHome?: string | null
  channel?: string | null
  hostname?: string
  stored?: HomeVariant | null
  bootDefault?: HomeVariant | null
}): HomeVariant {
  const q = parseHomeQuery(input.queryHome)
  if (q) return q

  const host = input.hostname || (typeof location !== 'undefined' ? location.hostname : '')
  if (isProductionHost(host)) return 'legacy'

  const preview = isPreviewLikeChannel(input.channel, host)
  if (!preview) return 'legacy'

  if (input.stored === 'v2' || input.stored === 'legacy') return input.stored
  if (input.bootDefault === 'v2') return 'v2'
  return 'legacy'
}

/** Design lab / HOME v2 toggle UI — preview-like only. */
export function isDesignLabVisible(channel: string | null | undefined, hostname: string): boolean {
  if (isProductionHost(hostname)) return false
  return isPreviewLikeChannel(channel, hostname)
}
