import type { LifeOs2CardActionType } from './cardTypes'

const ALLOWED = new Set<LifeOs2CardActionType>([
  'OPEN_ROUTE',
  'SHOW_CARD',
  'START_FOCUS',
  'STOP_FOCUS',
  'SAVE_AUTOMATION',
  'RUN_AUTOMATION',
  'CANCEL_AUTOMATION',
  'OPEN_SAFE_EXTERNAL_URL',
  'DISMISS_CARD',
  'CONFIRM_HABIT',
  'REJECT_HABIT',
  'IGNORE_HABIT_ONCE',
  'TOGGLE_EXPAND',
  'SEND_HINT',
])

export function isAllowedLos2CardAction(type: string): type is LifeOs2CardActionType {
  return ALLOWED.has(type as LifeOs2CardActionType)
}

/** Safe http(s) only — block javascript:/data:/etc. */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    if (u.username || u.password) return false
    return true
  } catch {
    return false
  }
}

export const LOS2_ALLOWED_VIEWS = new Set([
  'chat',
  'life',
  'family',
  'friends',
  'invest',
  'games',
  'actions',
  'settings',
  'global',
  'customers',
  'navigation',
])
