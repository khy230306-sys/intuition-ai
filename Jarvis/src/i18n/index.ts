import en from './locales/en'
import ja from './locales/ja'
import ko from './locales/ko'
import vi from './locales/vi'
import zh from './locales/zh'
import { detectAppLocale, localeNativeName, normalizeAppLocale, supportedAppLocales } from './localeDetector'
import type { AppLocale, Dictionary, MessageKey } from './types'

const TABLES: Record<AppLocale, Dictionary> = { ko, en, ja, vi, zh }

let current: AppLocale = 'ko'

export function getAppLocale(): AppLocale {
  return current
}

export function setAppLocale(locale: AppLocale): void {
  current = locale
  try {
    document.documentElement.lang = locale
  } catch {
    /* ignore */
  }
}

export function initAppLocale(saved?: string | null): AppLocale {
  const locale = detectAppLocale(saved, 'ko')
  setAppLocale(locale)
  return locale
}

export function t(key: MessageKey, vars?: Record<string, string>): string {
  const table = TABLES[current] || TABLES.en
  let text = table[key] || TABLES.en[key] || key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
    }
  }
  return text
}

export {
  detectAppLocale,
  localeNativeName,
  normalizeAppLocale,
  supportedAppLocales,
}
export type { AppLocale, MessageKey }
