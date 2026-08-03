import { appendAudit } from '../auditLog'
import { emitLifeEvent } from '../lifeEventBus'
import { loadStoreList, saveStoreList } from '../lifeRepository'
import { addTimelineEvent } from '../timeline/timelineService'
import { lifeId, nowIso } from '../types'
import type { ProjectBug, ProjectHealth, ProjectRecord, ProjectTask } from './projectTypes'

const KEY = 'aizio_life_projects_v1'
const SCHEMA = 1

export function loadProjects(): ProjectRecord[] {
  return loadStoreList<ProjectRecord>(KEY, SCHEMA)
}

function save(items: ProjectRecord[]): void {
  saveStoreList(KEY, SCHEMA, items, 80)
}

export function computeProjectHealth(p: ProjectRecord): ProjectHealth {
  const openTasks = p.tasks.filter((t) => !t.done).length
  const openBugs = p.bugs.filter((b) => b.open).length
  const total = p.tasks.length
  const progress = total === 0 ? 0 : Math.round((p.tasks.filter((t) => t.done).length / total) * 100) / 100
  return {
    openTasks,
    openBugs,
    progress,
    lastUpdatedAt: p.updatedAt,
    blocked: Boolean(p.holdReason) || openBugs >= 5,
  }
}

export function upsertProject(name: string, patch?: Partial<ProjectRecord>): ProjectRecord {
  const items = loadProjects()
  const now = nowIso()
  const existing = items.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())
  if (existing) {
    Object.assign(existing, patch || {})
    existing.updatedAt = now
    save(items)
    emitLifeEvent('project.changed', { id: existing.id })
    return existing
  }
  const rec: ProjectRecord = {
    id: lifeId('proj'),
    name: name.trim().slice(0, 80) || '프로젝트',
    description: patch?.description || '',
    version: patch?.version || '0.1.0',
    status: 'active',
    priority: patch?.priority || 'medium',
    tasks: [],
    bugs: [],
    ideaIds: [],
    relatedGoalIds: [],
    risks: [],
    holdReason: '',
    lastUpdateNote: '',
    createdAt: now,
    updatedAt: now,
  }
  items.unshift(rec)
  save(items)
  emitLifeEvent('project.changed', { id: rec.id })
  appendAudit('project.create', rec.name)
  addTimelineEvent({
    type: 'project',
    title: `프로젝트: ${rec.name}`,
    summary: rec.description || rec.name,
    sourceId: rec.id,
    sourceType: 'project',
    importance: 0.65,
  })
  return rec
}

export function findProject(hint: string): ProjectRecord | null {
  const q = hint.trim().toLowerCase()
  const items = loadProjects()
  if (!q) return items.find((p) => p.status === 'active') || items[0] || null
  return (
    items.find((p) => p.name.toLowerCase() === q) ||
    items.find((p) => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase())) ||
    null
  )
}

export function addProjectBug(projectHint: string, title: string): ProjectRecord | null {
  const p = findProject(projectHint) || upsertProject(projectHint || 'AIZIO')
  const bug: ProjectBug = {
    id: lifeId('bug'),
    title: title.slice(0, 160),
    open: true,
    createdAt: nowIso(),
    closedAt: null,
  }
  p.bugs.unshift(bug)
  p.updatedAt = nowIso()
  p.lastUpdateNote = `버그: ${bug.title}`
  const items = loadProjects()
  const idx = items.findIndex((x) => x.id === p.id)
  if (idx >= 0) items[idx] = p
  else items.unshift(p)
  save(items)
  emitLifeEvent('project.changed', { id: p.id, bug: bug.id })
  return p
}

export function addProjectTask(projectHint: string, title: string, done = false): ProjectRecord | null {
  const p = findProject(projectHint) || upsertProject(projectHint || 'AIZIO')
  const task: ProjectTask = {
    id: lifeId('pt'),
    title: title.slice(0, 160),
    done,
    createdAt: nowIso(),
    completedAt: done ? nowIso() : null,
  }
  p.tasks.unshift(task)
  p.updatedAt = nowIso()
  p.lastUpdateNote = done ? `완료: ${task.title}` : `작업: ${task.title}`
  const items = loadProjects()
  const idx = items.findIndex((x) => x.id === p.id)
  if (idx >= 0) items[idx] = p
  else items.unshift(p)
  save(items)
  return p
}

export function markTaskDone(projectHint: string, titleHint: string): ProjectRecord | null {
  const p = findProject(projectHint)
  if (!p) return null
  const t = p.tasks.find((x) => !x.done && x.title.toLowerCase().includes(titleHint.toLowerCase()))
  if (!t) {
    return addProjectTask(projectHint, titleHint || '오늘 작업', true)
  }
  t.done = true
  t.completedAt = nowIso()
  p.updatedAt = nowIso()
  p.lastUpdateNote = `완료: ${t.title}`
  const items = loadProjects()
  const idx = items.findIndex((x) => x.id === p.id)
  if (idx >= 0) items[idx] = p
  save(items)
  return p
}

export function formatProjectStatus(hint?: string): string {
  const p = hint ? findProject(hint) : findProject('')
  if (!p) return '등록된 프로젝트가 없습니다. 「AIZIO 프로젝트」처럼 이름을 말해 주세요.'
  const h = computeProjectHealth(p)
  const next = p.tasks.find((t) => !t.done)
  return [
    `【프로젝트 ${p.name}】 v${p.version} · ${p.status}`,
    `진행률 ${Math.round(h.progress * 100)}% · 미완료 작업 ${h.openTasks} · 열린 버그 ${h.openBugs}`,
    h.blocked ? `차단: ${p.holdReason || '버그 다수'}` : '차단 요인: 없음(기록 기준)',
    next ? `다음 작업: ${next.title}` : '다음 작업: (없음 — 추가해 주세요)',
    p.lastUpdateNote ? `최근: ${p.lastUpdateNote}` : '',
    '※ GitHub 등 외부 연결 없음 — AIZIO 내부 기록 기준입니다.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function mostUrgentProject(): ProjectRecord | null {
  const items = loadProjects().filter((p) => p.status === 'active')
  if (!items.length) return null
  return [...items].sort((a, b) => {
    const ha = computeProjectHealth(a)
    const hb = computeProjectHealth(b)
    const score = (h: ProjectHealth, pr: ProjectRecord) =>
      h.openBugs * 3 + h.openTasks + (pr.priority === 'critical' ? 10 : pr.priority === 'high' ? 5 : 0)
    return score(hb, b) - score(ha, a)
  })[0]!
}
