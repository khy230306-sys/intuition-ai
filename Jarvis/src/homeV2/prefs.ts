/**
 * HOME variant preference — local only.
 * Default for new users: HOME v2. Legacy remains recoverable.
 */

export type HomeVariant = 'legacy' | 'v2'

const STORAGE_KEY = 'aizio.home.variant.v1'
const BOOT_DEFAULT_KEY = 'aizio.home.bootDefault.v1'
/** One-time migration marker: unset stored preference → treat as v2 default era */
const MIGRATION_KEY = 'aizio.home.v2DefaultMigration.v1'

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
    localStorage.setItem(MIGRATION_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** Boot default when no session override — v2 for new installs. */
export function readBootDefaultHome(): HomeVariant {
  try {
    const v = localStorage.getItem(BOOT_DEFAULT_KEY)
    if (v === 'legacy') return 'legacy'
    if (v === 'v2') return 'v2'
    return 'v2'
  } catch {
    return 'v2'
  }
}

export function writeBootDefaultHome(variant: HomeVariant): void {
  try {
    localStorage.setItem(BOOT_DEFAULT_KEY, variant)
    localStorage.setItem(MIGRATION_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearHomeV2Prefs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(BOOT_DEFAULT_KEY)
    localStorage.removeItem(MIGRATION_KEY)
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
  if (host.endsWith('.shipstatic.com') && host !== 'jarvis-app.shipstatic.com') return true
  return false
}

export function isProductionHost(hostname: string): boolean {
  return hostname.toLowerCase() === 'jarvis-app.shipstatic.com'
}

/**
 * Resolve active home variant.
 * Priority: URL query → stored user choice → boot default → **v2**.
 * Explicit legacy choice is always respected.
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

  if (input.stored === 'v2' || input.stored === 'legacy') return input.stored

  const boot = input.bootDefault ?? readBootDefaultHome()
  if (boot === 'legacy') return 'legacy'
  return 'v2'
}

/** Home design switch — always available so users can recover legacy. */
export function isDesignLabVisible(_channel?: string | null, _hostname?: string): boolean {
  return true
}
