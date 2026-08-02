import type { AppLocale } from './types'

const SUPPORTED: AppLocale[] = ['ko', 'en', 'ja', 'vi']

export function normalizeAppLocale(raw: string | null | undefined): AppLocale | null {
  if (!raw) return null
  const base = raw.trim().toLowerCase().replace('_', '-').split('-')[0] || ''
  if ((SUPPORTED as string[]).includes(base)) return base as AppLocale
  return null
}

/** Priority: saved → navigator.languages → navigator.language → fallback */
export function detectAppLocale(saved?: string | null, fallback: AppLocale = 'en'): AppLocale {
  const fromSaved = normalizeAppLocale(saved)
  if (fromSaved) return fromSaved
  try {
    const list = typeof navigator !== 'undefined' ? navigator.languages || [] : []
    for (const lang of list) {
      const hit = normalizeAppLocale(lang)
      if (hit) return hit
    }
    const hit = normalizeAppLocale(typeof navigator !== 'undefined' ? navigator.language : '')
    if (hit) return hit
  } catch {
    /* ignore */
  }
  return fallback
}

export function supportedAppLocales(): AppLocale[] {
  return [...SUPPORTED]
}

export function localeNativeName(code: AppLocale): string {
  switch (code) {
    case 'ko':
      return '한국어'
    case 'en':
      return 'English'
    case 'ja':
      return '日本語'
    case 'vi':
      return 'Tiếng Việt'
    default:
      return code
  }
}
