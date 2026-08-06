/** Home quick actions — max 6, simple show/hide prefs. */

const KEY = 'aizio_home_quick_actions_v1'

export type QuickActionId =
  | 'schedule-add'
  | 'reminder-add'
  | 'ai-camera'
  | 'translate'
  | 'family-schedule'
  | 'todo-add'
  | 'briefing'
  | 'navigate'

export type QuickActionDef = {
  id: QuickActionId
  title: string
  sub: string
  ico: string
  /** chat command, view, or action */
  kind: 'cmd' | 'view' | 'action'
  payload: string
}

export const DEFAULT_QUICK_ACTIONS: QuickActionDef[] = [
  { id: 'schedule-add', title: '일정 추가', sub: '내일 병원…', ico: '+', kind: 'cmd', payload: '내일 오후 3시 병원 일정 추가해줘' },
  { id: 'reminder-add', title: '알림 추가', sub: '잊지 않게', ico: '!', kind: 'cmd', payload: '30분 뒤 알림 만들어줘' },
  { id: 'ai-camera', title: 'AI 카메라', sub: '사진 분석', ico: 'o', kind: 'view', payload: 'ai-camera' },
  { id: 'translate', title: '번역', sub: '번역 창', ico: 'A', kind: 'action', payload: 'translate' },
  { id: 'family-schedule', title: '가족 일정', sub: '하원·학교', ico: 'F', kind: 'view', payload: 'family-helper' },
  { id: 'todo-add', title: '할 일 추가', sub: '오늘 할 일', ico: 'T', kind: 'cmd', payload: '할 일 추가해줘' },
]

export type QuickPrefs = { hidden: QuickActionId[]; order: QuickActionId[] }

function loadPrefs(): QuickPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { hidden: [], order: DEFAULT_QUICK_ACTIONS.map((q) => q.id) }
    const p = JSON.parse(raw) as QuickPrefs
    return {
      hidden: Array.isArray(p.hidden) ? p.hidden : [],
      order: Array.isArray(p.order) && p.order.length ? p.order : DEFAULT_QUICK_ACTIONS.map((q) => q.id),
    }
  } catch {
    return { hidden: [], order: DEFAULT_QUICK_ACTIONS.map((q) => q.id) }
  }
}

export function saveQuickPrefs(prefs: Partial<QuickPrefs>): void {
  const cur = loadPrefs()
  localStorage.setItem(KEY, JSON.stringify({ ...cur, ...prefs }))
}

export function listVisibleQuickActions(): QuickActionDef[] {
  const prefs = loadPrefs()
  const byId = new Map(DEFAULT_QUICK_ACTIONS.map((q) => [q.id, q]))
  const ordered = prefs.order.map((id) => byId.get(id)).filter((q): q is QuickActionDef => Boolean(q))
  for (const q of DEFAULT_QUICK_ACTIONS) {
    if (!ordered.some((x) => x.id === q.id)) ordered.push(q)
  }
  return ordered.filter((q) => !prefs.hidden.includes(q.id)).slice(0, 6)
}

export function getQuickPrefs(): QuickPrefs {
  return loadPrefs()
}

export function toggleQuickHidden(id: QuickActionId): void {
  const p = loadPrefs()
  const hidden = p.hidden.includes(id) ? p.hidden.filter((x) => x !== id) : [...p.hidden, id]
  saveQuickPrefs({ hidden })
}
