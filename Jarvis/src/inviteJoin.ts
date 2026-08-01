/** Invite codes, deep links, and paste/QR parsing for family + friends spaces. */

export type SpaceKind = 'family' | 'friends'

/** Same alphabet used when generating room codes. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const GENERIC_NAMES = new Set(['친구 공간', '가족 공간', '우리 친구', '우리 가족', ''])

export function isValidInviteCode(code: string): boolean {
  if (code.length < 4 || code.length > 8) return false
  return [...code].every((ch) => INVITE_CODE_ALPHABET.includes(ch))
}

function cleanToken(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

/**
 * Extract a room invite code from bare codes, invite text, or deep-link URLs.
 * Rejects garbage like "JARVISK7" from pasting full Korean invite text blindly.
 */
export function parseInviteCode(raw: string): string | null {
  const text = String(raw || '').trim()
  if (!text) return null

  // Deep link / query string
  try {
    const looksUrl =
      /^https?:\/\//i.test(text) ||
      text.includes('friends=') ||
      text.includes('family=') ||
      text.includes('?fr=') ||
      text.includes('?fam=')
    if (looksUrl) {
      const u = new URL(text, 'https://jarvis.local/')
      const fromQ =
        u.searchParams.get('friends') ||
        u.searchParams.get('family') ||
        u.searchParams.get('fr') ||
        u.searchParams.get('fam')
      if (fromQ) {
        const c = cleanToken(fromQ)
        if (isValidInviteCode(c)) return c
      }
      // hash form #friends=CODE
      const hash = u.hash.replace(/^#/, '')
      if (hash) {
        const hp = new URLSearchParams(hash)
        const fromH = hp.get('friends') || hp.get('family') || hp.get('fr') || hp.get('fam')
        if (fromH) {
          const c = cleanToken(fromH)
          if (isValidInviteCode(c)) return c
        }
      }
    }
  } catch {
    /* ignore */
  }

  // "코드 ABC123"
  const labeled = text.match(/코드\s*[:：]?\s*([A-Za-z0-9]{4,8})/)
  if (labeled) {
    const c = cleanToken(labeled[1])
    if (isValidInviteCode(c)) return c
  }

  // Bare code typed by user
  const compact = cleanToken(text)
  if (text.length <= 12 && isValidInviteCode(compact)) return compact

  // Scan tokens in longer pasted invite text (prefer exact 6-char generated codes)
  const upper = text.toUpperCase()
  const six = upper.match(/[A-Z0-9]{6}/g) || []
  for (const token of six) {
    if (isValidInviteCode(token)) return token
  }
  const loose = upper.match(/[A-Z0-9]{4,8}/g) || []
  for (const token of loose) {
    if (isValidInviteCode(token) && !token.startsWith('JARVIS') && token !== 'HTTPS' && token !== 'HTTP') {
      return token
    }
  }
  return null
}

export function parseInviteFromLocation(href: string): { kind: SpaceKind; code: string } | null {
  try {
    const u = new URL(href)
    const friends = u.searchParams.get('friends') || u.searchParams.get('fr')
    const family = u.searchParams.get('family') || u.searchParams.get('fam')
    if (friends) {
      const code = parseInviteCode(friends)
      if (code) return { kind: 'friends', code }
    }
    if (family) {
      const code = parseInviteCode(family)
      if (code) return { kind: 'family', code }
    }
    const hash = u.hash.replace(/^#/, '')
    if (hash) {
      const hp = new URLSearchParams(hash.includes('=') ? hash : hash.replace(/^\//, ''))
      const hf = hp.get('friends') || hp.get('fr')
      const hm = hp.get('family') || hp.get('fam')
      if (hf) {
        const code = parseInviteCode(hf)
        if (code) return { kind: 'friends', code }
      }
      if (hm) {
        const code = parseInviteCode(hm)
        if (code) return { kind: 'family', code }
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

/** Detect invite kind from pasted text / QR payload (URL params). Bare codes return null. */
export function detectInviteKind(raw: string): SpaceKind | null {
  const text = String(raw || '').trim()
  if (!text) return null
  const fromLoc = parseInviteFromLocation(text.startsWith('http') ? text : `https://jarvis.local/?${text.includes('=') ? text : ''}`)
  if (fromLoc) return fromLoc.kind
  try {
    if (/friends=|\?fr=/i.test(text) || /#friends=/i.test(text)) return 'friends'
    if (/family=|\?fam=/i.test(text) || /#family=/i.test(text)) return 'family'
    const u = new URL(text, 'https://jarvis.local/')
    if (u.searchParams.get('friends') || u.searchParams.get('fr')) return 'friends'
    if (u.searchParams.get('family') || u.searchParams.get('fam')) return 'family'
  } catch {
    /* ignore */
  }
  if (/친구\s*(공간|초대|코드)/.test(text) && !/가족/.test(text)) return 'friends'
  if (/가족\s*(공간|초대|코드)/.test(text) && !/친구/.test(text)) return 'family'
  return null
}

export function buildSpaceInviteUrl(kind: SpaceKind, code: string, baseUrl: string): string {
  const url = new URL(baseUrl, 'https://jarvis.local/')
  // Drop prior invite params
  url.searchParams.delete('friends')
  url.searchParams.delete('family')
  url.searchParams.delete('fr')
  url.searchParams.delete('fam')
  url.searchParams.set(kind === 'friends' ? 'friends' : 'family', code)
  return url.toString()
}

export function preferSpaceName(
  localName: string,
  remoteName: string,
  localUpdated: number,
  remoteUpdated: number,
): string {
  const local = (localName || '').trim()
  const remote = (remoteName || '').trim()
  const localGeneric = GENERIC_NAMES.has(local)
  const remoteGeneric = GENERIC_NAMES.has(remote)
  if (!localGeneric && remoteGeneric) return local
  if (localGeneric && !remoteGeneric) return remote
  if (remoteUpdated >= localUpdated) return remote || local
  return local || remote
}

/** Strip invite query params after consuming them. */
export function stripInviteParamsFromUrl(href = window.location.href): string {
  try {
    const u = new URL(href)
    ;['friends', 'family', 'fr', 'fam'].forEach((k) => u.searchParams.delete(k))
    if (u.hash && /friends=|family=|fr=|fam=/.test(u.hash)) u.hash = ''
    return u.pathname + u.search + u.hash
  } catch {
    return href
  }
}
