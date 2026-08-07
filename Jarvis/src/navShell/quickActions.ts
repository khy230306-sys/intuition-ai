/**
 * Home quick actions — pick any catalog item (max 6 visible).
 * Legacy prefs `{ hidden, order }` are migrated automatically.
 */

const KEY = 'aizio_home_quick_actions_v1'
export const QUICK_ACTION_MAX = 6

export type QuickActionId =
  | 'schedule-add'
  | 'reminder-add'
  | 'ai-camera'
  | 'translate'
  | 'family-schedule'
  | 'todo-add'
  | 'briefing'
  | 'navigate'
  | 'chat'
  | 'schedule'
  | 'family'
  | 'weather'
  | 'friends'
  | 'games'
  | 'customers'
  | 'settings'
  | 'life'
  | 'music'
  | 'travel'
  | 'restaurant'

export type QuickActionDef = {
  id: QuickActionId
  title: string
  sub: string
  ico: string
  /** chat command, view, or action */
  kind: 'cmd' | 'view' | 'action'
  payload: string
}

/** Full pool users can add from. */
export const QUICK_ACTION_CATALOG: QuickActionDef[] = [
  { id: 'navigate', title: '길안내', sub: '장소 · 경로', ico: 'N', kind: 'action', payload: 'navigate' },
  { id: 'schedule-add', title: '일정 추가', sub: '내일 병원…', ico: '+', kind: 'cmd', payload: '내일 오후 3시 병원 일정 추가해줘' },
  { id: 'reminder-add', title: '알림 추가', sub: '잊지 않게', ico: '!', kind: 'cmd', payload: '30분 뒤 알림 만들어줘' },
  { id: 'ai-camera', title: 'AI 카메라', sub: '사진 분석', ico: 'o', kind: 'view', payload: 'ai-camera' },
  { id: 'translate', title: '번역', sub: '번역하기', ico: 'A', kind: 'action', payload: 'translate' },
  { id: 'family-schedule', title: '가족 일정', sub: '하원·학교', ico: 'F', kind: 'view', payload: 'family-helper' },
  { id: 'todo-add', title: '할 일 추가', sub: '오늘 할 일', ico: 'T', kind: 'cmd', payload: '할 일 추가해줘' },
  { id: 'briefing', title: '브리핑', sub: '오늘 한눈에', ico: 'B', kind: 'cmd', payload: '오늘 하루 요약해줘' },
  { id: 'chat', title: '대화', sub: 'AIZIO 채팅', ico: 'C', kind: 'view', payload: 'chat' },
  { id: 'schedule', title: '일정', sub: '일정 허브', ico: 'S', kind: 'view', payload: 'schedule' },
  { id: 'family', title: '가족', sub: '가족 도우미', ico: 'H', kind: 'view', payload: 'family-helper' },
  { id: 'weather', title: '날씨', sub: '지금 기온', ico: 'W', kind: 'cmd', payload: '오늘 날씨 알려줘' },
  { id: 'friends', title: '친구', sub: '친구 공간', ico: 'P', kind: 'view', payload: 'friends' },
  { id: 'games', title: '게임', sub: '아케이드', ico: 'G', kind: 'view', payload: 'games' },
  { id: 'customers', title: '손님관리', sub: 'CRM', ico: 'R', kind: 'view', payload: 'customers' },
  { id: 'settings', title: '설정', sub: 'AI · 업데이트', ico: 'X', kind: 'view', payload: 'settings' },
  { id: 'life', title: '생활', sub: '할 일 · 알림', ico: 'L', kind: 'view', payload: 'life' },
  { id: 'music', title: '음악', sub: '음악 찾기', ico: 'M', kind: 'action', payload: 'music' },
  { id: 'travel', title: '여행', sub: '항공 · 호텔', ico: '✈', kind: 'view', payload: 'travel' },
  { id: 'restaurant', title: '맛집', sub: '식당 · 예약', ico: 'R', kind: 'view', payload: 'restaurant' },
]

/** Default home quick bar — 길안내 first so navigation is one tap away. */
export const DEFAULT_QUICK_ACTIONS: QuickActionDef[] = [
  QUICK_ACTION_CATALOG.find((q) => q.id === 'navigate')!,
  QUICK_ACTION_CATALOG.find((q) => q.id === 'schedule-add')!,
  QUICK_ACTION_CATALOG.find((q) => q.id === 'reminder-add')!,
  QUICK_ACTION_CATALOG.find((q) => q.id === 'ai-camera')!,
  QUICK_ACTION_CATALOG.find((q) => q.id === 'translate')!,
  QUICK_ACTION_CATALOG.find((q) => q.id === 'family-schedule')!,
]

const DEFAULT_VISIBLE: QuickActionId[] = DEFAULT_QUICK_ACTIONS.map((q) => q.id)

export type QuickPrefs = {
  /** Ordered visible ids (max 6). */
  visible: QuickActionId[]
}

function catalogById(): Map<QuickActionId, QuickActionDef> {
  return new Map(QUICK_ACTION_CATALOG.map((q) => [q.id, q]))
}

function isQuickId(id: string): id is QuickActionId {
  return QUICK_ACTION_CATALOG.some((q) => q.id === id)
}

function loadPrefs(): QuickPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { visible: [...DEFAULT_VISIBLE] }
    const p = JSON.parse(raw) as {
      visible?: string[]
      hidden?: string[]
      order?: string[]
    }
    // New format
    if (Array.isArray(p.visible) && p.visible.length) {
      let visible = p.visible.filter(isQuickId).slice(0, QUICK_ACTION_MAX)
      // One-time migrate: old factory default (no 길안내) → include navigate
      const oldDefault = [
        'schedule-add',
        'reminder-add',
        'ai-camera',
        'translate',
        'family-schedule',
        'todo-add',
      ]
      if (
        visible.length === oldDefault.length &&
        oldDefault.every((id, i) => visible[i] === id)
      ) {
        visible = [...DEFAULT_VISIBLE]
        try {
          localStorage.setItem(KEY, JSON.stringify({ visible }))
        } catch {
          /* ignore */
        }
      }
      return { visible: visible.length ? visible : [...DEFAULT_VISIBLE] }
    }
    // Legacy: order + hidden → visible
    if (Array.isArray(p.order) || Array.isArray(p.hidden)) {
      const order = (Array.isArray(p.order) ? p.order : DEFAULT_VISIBLE).filter(isQuickId)
      const hidden = new Set((Array.isArray(p.hidden) ? p.hidden : []).filter(isQuickId))
      const merged = [...order]
      for (const id of DEFAULT_VISIBLE) {
        if (!merged.includes(id)) merged.push(id)
      }
      const visible = merged.filter((id) => !hidden.has(id)).slice(0, QUICK_ACTION_MAX)
      return { visible: visible.length ? visible : [...DEFAULT_VISIBLE] }
    }
    return { visible: [...DEFAULT_VISIBLE] }
  } catch {
    return { visible: [...DEFAULT_VISIBLE] }
  }
}

export function saveQuickPrefs(prefs: Partial<QuickPrefs>): void {
  const cur = loadPrefs()
  const next: QuickPrefs = {
    visible: (prefs.visible ?? cur.visible).filter(isQuickId).slice(0, QUICK_ACTION_MAX),
  }
  if (!next.visible.length) next.visible = [...DEFAULT_VISIBLE]
  localStorage.setItem(KEY, JSON.stringify(next))
}

export function listVisibleQuickActions(): QuickActionDef[] {
  const byId = catalogById()
  return loadPrefs()
    .visible.map((id) => byId.get(id))
    .filter((q): q is QuickActionDef => Boolean(q))
    .slice(0, QUICK_ACTION_MAX)
}

/** Items not currently on the home quick bar — available to add. */
export function listAddableQuickActions(): QuickActionDef[] {
  const visible = new Set(loadPrefs().visible)
  return QUICK_ACTION_CATALOG.filter((q) => !visible.has(q.id))
}

/** @deprecated use listAddableQuickActions */
export function listHiddenQuickActions(): QuickActionDef[] {
  return listAddableQuickActions()
}

export function getQuickPrefs(): QuickPrefs & { hidden: QuickActionId[] } {
  const visible = loadPrefs().visible
  const vis = new Set(visible)
  return {
    visible,
    // compat for older tests
    hidden: QUICK_ACTION_CATALOG.map((q) => q.id).filter((id) => !vis.has(id)),
  }
}

export function toggleQuickHidden(id: QuickActionId): void {
  const vis = new Set(loadPrefs().visible)
  if (vis.has(id)) hideQuickAction(id)
  else void showQuickAction(id)
}

/** Add a catalog item to the quick bar. When full, optionally replace the last slot. */
export function showQuickAction(
  id: QuickActionId,
  opts?: { replaceLastIfFull?: boolean },
): { ok: boolean; reason?: string; replacedId?: QuickActionId } {
  if (!isQuickId(id)) return { ok: false, reason: 'unknown' }
  const visible = [...loadPrefs().visible]
  if (visible.includes(id)) return { ok: true }
  if (visible.length >= QUICK_ACTION_MAX) {
    if (!opts?.replaceLastIfFull) return { ok: false, reason: 'full' }
    const replacedId = visible[visible.length - 1]
    visible[visible.length - 1] = id
    saveQuickPrefs({ visible })
    return { ok: true, replacedId }
  }
  visible.push(id)
  saveQuickPrefs({ visible })
  return { ok: true }
}

export function titleForQuickId(id: QuickActionId | string | undefined): string {
  if (!id) return ''
  return catalogById().get(id as QuickActionId)?.title || id
}

export function hideQuickAction(id: QuickActionId): void {
  const visible = loadPrefs().visible.filter((x) => x !== id)
  saveQuickPrefs({ visible: visible.length ? visible : [] })
}

export function resetQuickActions(): void {
  saveQuickPrefs({ visible: [...DEFAULT_VISIBLE] })
}
