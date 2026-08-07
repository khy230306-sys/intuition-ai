/**
 * Task Session store — active + suspended stack.
 * localStorage when available; in-memory fallback for tests/Node.
 */

import type { TaskSession, TaskType } from './types'

const KEY = 'aizio_action_agent_v1'
const mem = {
  active: null as TaskSession | null,
  suspended: [] as TaskSession[],
}

function canUseLs(): boolean {
  try {
    return typeof localStorage !== 'undefined' && !!localStorage
  } catch {
    return false
  }
}

function loadRaw(): { active: TaskSession | null; suspended: TaskSession[] } {
  if (!canUseLs()) return { active: mem.active, suspended: [...mem.suspended] }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { active: null, suspended: [] }
    const p = JSON.parse(raw) as { active: TaskSession | null; suspended: TaskSession[] }
    return { active: p.active || null, suspended: Array.isArray(p.suspended) ? p.suspended : [] }
  } catch {
    return { active: null, suspended: [] }
  }
}

function saveRaw(state: { active: TaskSession | null; suspended: TaskSession[] }): void {
  mem.active = state.active
  mem.suspended = [...state.suspended]
  if (!canUseLs()) return
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

function uid(): string {
  return `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function getActiveTask(): TaskSession | null {
  return loadRaw().active
}

export function getSuspendedTasks(): TaskSession[] {
  return loadRaw().suspended
}

export function clearAllTasks(): void {
  saveRaw({ active: null, suspended: [] })
}

export function createTaskSession(type: TaskType, label: string, slots: TaskSession['slots'] = {}): TaskSession {
  const now = new Date().toISOString()
  const task: TaskSession = {
    id: uid(),
    type,
    status: 'collecting',
    slots,
    missingSlots: [],
    results: [],
    resultsStale: false,
    plannedAction: null,
    lastActionResult: null,
    createdAt: now,
    updatedAt: now,
    label,
    pendingQuestion: null,
  }
  const state = loadRaw()
  // Push previous active onto suspended (keep last 3)
  if (state.active && state.active.status !== 'cancelled' && state.active.status !== 'success') {
    const prev: TaskSession = { ...state.active, status: 'suspended' }
    state.suspended = [prev, ...state.suspended].slice(0, 3)
  }
  state.active = task
  saveRaw(state)
  return task
}

export function saveTask(task: TaskSession): TaskSession {
  const next = { ...task, updatedAt: new Date().toISOString() }
  const state = loadRaw()
  if (state.active?.id === next.id) state.active = next
  else {
    state.suspended = state.suspended.map((t) => (t.id === next.id ? next : t))
    if (!state.suspended.find((t) => t.id === next.id) && !state.active) state.active = next
  }
  saveRaw(state)
  return next
}

export function cancelActiveTask(): TaskSession | null {
  const state = loadRaw()
  if (!state.active) return null
  const cancelled = { ...state.active, status: 'cancelled' as const, updatedAt: new Date().toISOString() }
  state.active = null
  saveRaw(state)
  return cancelled
}

export function suspendActiveForInterrupt(): void {
  const state = loadRaw()
  if (!state.active) return
  if (state.active.status === 'cancelled' || state.active.status === 'success') return
  const prev: TaskSession = { ...state.active, status: 'suspended' }
  state.suspended = [prev, ...state.suspended].slice(0, 3)
  state.active = null
  saveRaw(state)
}

export function resumeTravelTask(): TaskSession | null {
  const state = loadRaw()
  const idx = state.suspended.findIndex((t) => t.type.startsWith('travel') && t.status === 'suspended')
  if (idx < 0) return state.active
  const [task] = state.suspended.splice(idx, 1)
  if (state.active && state.active.status === 'collecting') {
    const prev: TaskSession = { ...state.active, status: 'suspended' }
    state.suspended = [prev, ...state.suspended].slice(0, 3)
  }
  const resumed: TaskSession = { ...task, status: 'collecting', updatedAt: new Date().toISOString() }
  state.active = resumed
  saveRaw(state)
  return resumed
}

export function markResultsStale(task: TaskSession): TaskSession {
  return saveTask({
    ...task,
    resultsStale: true,
    results: task.results.map((r) => ({ ...r, stale: true })),
    status: task.status === 'ready' || task.status === 'success' ? 'collecting' : task.status,
  })
}
