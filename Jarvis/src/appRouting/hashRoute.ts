/**
 * Hash-based app routing for ShipStatic static hosting.
 * Never use pathname routes like /navigation — relative base('./') breaks assets
 * and rewrite-less snapshots return platform 404.
 */

export const APP_HASH_SCREENS = [
  'home',
  'chat',
  'life',
  'schedule',
  'family',
  'more',
  'all',
  'navigation',
] as const
export type AppHashScreen = (typeof APP_HASH_SCREENS)[number]

export type ParsedHashRoute = {
  screen: AppHashScreen
  /** Sanitized navigation query (empty if absent/invalid). */
  query: string
  valid: boolean
  rawHash: string
}

export type OpenInternalNavigationOptions = {
  query?: string
  travelMode?: string
  source?: string
  preserveConversationContext?: boolean
  /** When true (default), push a history entry via location.hash. */
  pushHistory?: boolean
}

const MAX_QUERY_LEN = 200
const PATH_ROUTE_RE = /\/(navigation|map)(?:\/|$)/i

export function isAppHashScreen(s: string): s is AppHashScreen {
  return (APP_HASH_SCREENS as readonly string[]).includes(s)
}

/** Strip dangerous / oversized query text from hash params. */
export function sanitizeNavQuery(raw: unknown): string {
  if (raw == null) return ''
  let s = String(raw)
  if (s.length > MAX_QUERY_LEN * 3) s = s.slice(0, MAX_QUERY_LEN * 3)
  try {
    // Tolerate already-decoded or partially-encoded values.
    if (/%[0-9a-fA-F]{2}/.test(s)) {
      try {
        s = decodeURIComponent(s)
      } catch {
        s = s.replace(/%(?![0-9a-fA-F]{2})/g, '%25')
        try {
          s = decodeURIComponent(s)
        } catch {
          /* keep raw */
        }
      }
    }
  } catch {
    /* keep */
  }
  s = s.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) return ''
  if (/^\s*</.test(s)) return ''
  if (s.length > MAX_QUERY_LEN) s = s.slice(0, MAX_QUERY_LEN)
  return s
}

/**
 * Parse location.hash forms:
 *   #navigation
 *   #navigation?q=역삼동
 *   #navigation?query=...
 *   #home | #chat | #life | #family | #all
 * Invalid → valid:false, screen defaults to home.
 */
export function parseLocationHash(hash: string): ParsedHashRoute {
  const rawHash = String(hash || '')
  const body = rawHash.replace(/^#/, '').trim()
  if (!body) {
    return { screen: 'home', query: '', valid: true, rawHash }
  }
  // Reject obvious script payloads in the whole hash body
  if (/^(javascript|data|vbscript)\s*:/i.test(body) || body.includes('<script')) {
    return { screen: 'home', query: '', valid: false, rawHash }
  }
  const qIdx = body.indexOf('?')
  const screenRaw = (qIdx >= 0 ? body.slice(0, qIdx) : body).toLowerCase().replace(/^\//, '')
  const search = qIdx >= 0 ? body.slice(qIdx + 1) : ''
  let query = ''
  if (search) {
    try {
      const sp = new URLSearchParams(search)
      query = sanitizeNavQuery(sp.get('q') || sp.get('query') || '')
    } catch {
      query = ''
    }
  }
  if (!isAppHashScreen(screenRaw)) {
    return { screen: 'home', query: '', valid: false, rawHash }
  }
  return { screen: screenRaw, query, valid: true, rawHash }
}

export function buildAppHash(screen: AppHashScreen, opts?: { query?: string }): string {
  const q = sanitizeNavQuery(opts?.query)
  if (screen === 'navigation' && q) {
    return `#navigation?q=${encodeURIComponent(q)}`
  }
  return `#${screen}`
}

/** Map app View (+ home pane) → hash screen. */
export function viewToHashScreen(
  view: string,
  opts?: { homeV2?: boolean; homeV2Pane?: string },
): AppHashScreen {
  if (view === 'navigation') return 'navigation'
  if (view === 'schedule' || view === 'life') return 'schedule'
  if (view === 'family' || view === 'family-helper') return 'family'
  if (view === 'more' || view === 'settings' || view === 'global' || view === 'actions') return 'more'
  if (view === 'home') return 'home'
  if (view === 'chat') return 'chat'
  // Secondary screens keep more/home hash rather than inventing pathnames.
  void opts
  return 'more'
}

export function hashScreenToView(screen: AppHashScreen): string {
  switch (screen) {
    case 'navigation':
      return 'navigation'
    case 'life':
    case 'schedule':
      return 'schedule'
    case 'family':
      return 'family-helper'
    case 'more':
    case 'all':
      return 'more'
    case 'chat':
      return 'chat'
    case 'home':
    default:
      return 'home'
  }
}

/**
 * If href uses pathname /navigation or /map, return a root URL with #navigation.
 * Preserves ?home= and other safe query params. Returns null when no migration needed.
 */
export function migratePathnameToHashUrl(href: string): string | null {
  let u: URL
  try {
    u = new URL(href, 'https://jarvis-app.shipstatic.com')
  } catch {
    return null
  }
  if (!PATH_ROUTE_RE.test(u.pathname)) return null
  const qFromPath = sanitizeNavQuery(u.searchParams.get('q') || u.searchParams.get('query') || '')
  u.searchParams.delete('q')
  u.searchParams.delete('query')
  u.searchParams.delete('nav')
  u.searchParams.delete('navigation')
  u.searchParams.delete('navv2')
  u.searchParams.delete('view')
  // Flatten to site root so base:'./' assets resolve
  const pathParts = u.pathname.split('/').filter(Boolean)
  const leaf = pathParts[pathParts.length - 1] || ''
  if (!/^(navigation|map)$/i.test(leaf) && !PATH_ROUTE_RE.test(u.pathname)) {
    return null
  }
  u.pathname = '/'
  let hashQuery = qFromPath
  if (!hashQuery && u.hash) {
    const parsed = parseLocationHash(u.hash)
    if (parsed.screen === 'navigation') hashQuery = parsed.query
  }
  u.hash = buildAppHash('navigation', { query: hashQuery }).replace(/^#/, '')
  // URL.hash setter adds #; assign via build
  const search = u.searchParams.toString()
  return `${u.origin}/${search ? `?${search}` : ''}${buildAppHash('navigation', { query: hashQuery })}`
}

/** True when this location still uses a dangerous pathname route. */
export function hasPathnameAppRoute(pathname: string): boolean {
  return PATH_ROUTE_RE.test(pathname || '')
}
