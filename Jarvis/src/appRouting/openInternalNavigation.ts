import {
  buildAppHash,
  sanitizeNavQuery,
  type OpenInternalNavigationOptions,
} from './hashRoute'

export type InternalNavOpenResult = {
  view: 'navigation'
  query: string
  source: string
  travelMode: string
  preserveConversationContext: boolean
  hash: string
  pushHistory: boolean
}

/**
 * Pure helper: compute navigation open intent without touching location.href/pathname.
 * Callers apply view state + syncHashFromApp.
 */
export function openInternalNavigation(opts: OpenInternalNavigationOptions = {}): InternalNavOpenResult {
  const query = sanitizeNavQuery(opts.query)
  const pushHistory = opts.pushHistory !== false
  return {
    view: 'navigation',
    query,
    source: String(opts.source || 'app'),
    travelMode: String(opts.travelMode || ''),
    preserveConversationContext: opts.preserveConversationContext !== false,
    hash: buildAppHash('navigation', { query }),
    pushHistory,
  }
}

/** Apply hash to the address bar without leaving the SPA document. */
export function writeAppHash(hash: string, mode: 'push' | 'replace' = 'push'): void {
  const next = hash.startsWith('#') ? hash : `#${hash}`
  try {
    const url = new URL(window.location.href)
    // Always stay on document root path — never /navigation
    if (/\/(navigation|map)(?:\/|$)/i.test(url.pathname)) {
      url.pathname = '/'
    }
    const base = `${url.pathname}${url.search}`
    if (mode === 'replace') {
      window.history.replaceState(window.history.state, '', `${base}${next}`)
    } else if (url.hash === next) {
      /* already there */
    } else {
      window.location.hash = next.slice(1)
    }
  } catch {
    try {
      if (mode === 'replace') window.history.replaceState({}, '', next)
      else window.location.hash = next.slice(1)
    } catch {
      /* ignore */
    }
  }
}
