import type { View } from '../types'

export type PrimaryTabId = 'home' | 'chat' | 'schedule' | 'family' | 'more'

export type PrimaryTab = {
  id: PrimaryTabId
  label: string
  ico: string
  view: View
}

/** Mobile bottom nav — max 5. */
export const PRIMARY_TABS: PrimaryTab[] = [
  { id: 'home', label: '홈', ico: '홈', view: 'home' },
  { id: 'chat', label: '대화', ico: '대화', view: 'chat' },
  { id: 'schedule', label: '일정', ico: '일정', view: 'schedule' },
  { id: 'family', label: '가족', ico: '가족', view: 'family-helper' },
  { id: 'more', label: '더보기', ico: '더보기', view: 'more' },
]

/** Map any View → which primary tab is active (for highlight). */
export function primaryTabForView(view: View | string): PrimaryTabId {
  switch (view) {
    case 'home':
      return 'home'
    case 'chat':
      return 'chat'
    case 'schedule':
    case 'life':
      return 'schedule'
    case 'family-helper':
    case 'family':
      return 'family'
    case 'more':
    case 'settings':
    case 'global':
    case 'actions':
    case 'invest':
    case 'games':
    case 'friends':
    case 'customers':
    case 'ai-camera':
    case 'navigation':
    case 'travel':
    case 'restaurant':
      return 'more'
    default:
      return 'home'
  }
}

/**
 * Legacy / alias views → preferred destination.
 * Features are preserved; only entry points change.
 */
export function normalizeNavView(view: View | string): View {
  if (view === 'life') return 'schedule'
  return view as View
}
