import { appendAudit } from '../auditLog'
import { emitLifeEvent } from '../lifeEventBus'
import { loadStoreList, saveStoreList } from '../lifeRepository'
import { addTimelineEvent } from '../timeline/timelineService'
import { lifeId, nowIso } from '../types'
import type { IdeaRecord } from './ideaTypes'

const KEY = 'aizio_life_ideas_v1'
const SCHEMA = 1

function titleFromContent(content: string): string {
  const line = content.trim().split(/\n/)[0] || '아이디어'
  return line.slice(0, 48)
}

export function saveIdea(content: string, opts?: Partial<IdeaRecord>): IdeaRecord {
  const now = nowIso()
  const rec: IdeaRecord = {
    id: lifeId('idea'),
    title: opts?.title || titleFromContent(content),
    content: content.trim(), // always preserve original
    summary: opts?.summary || '',
    tags: opts?.tags || [],
    category: opts?.category || '',
    status: 'new',
    relatedProjectIds: opts?.relatedProjectIds || [],
    relatedGoalIds: opts?.relatedGoalIds || [],
    importance: opts?.importance ?? 0.5,
    createdAt: now,
    updatedAt: now,
  }
  const items = loadStoreList<IdeaRecord>(KEY, SCHEMA)
  items.unshift(rec)
  saveStoreList(KEY, SCHEMA, items, 300)
  emitLifeEvent('idea.saved', { id: rec.id })
  appendAudit('idea.save', rec.title)
  addTimelineEvent({
    type: 'idea',
    title: `아이디어: ${rec.title}`,
    summary: rec.content.slice(0, 120),
    sourceId: rec.id,
    sourceType: 'idea',
    importance: 0.55,
  })
  return rec
}

export function searchIdeas(query: string): IdeaRecord[] {
  const q = query.trim().toLowerCase()
  const items = loadStoreList<IdeaRecord>(KEY, SCHEMA)
  if (!q) return items.slice(0, 30)
  return items
    .filter(
      (i) =>
        i.content.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)) ||
        i.category.toLowerCase().includes(q),
    )
    .slice(0, 30)
}

export function linkIdeaToProject(ideaId: string, projectId: string): IdeaRecord | null {
  const items = loadStoreList<IdeaRecord>(KEY, SCHEMA)
  const idea = items.find((i) => i.id === ideaId)
  if (!idea) return null
  if (!idea.relatedProjectIds.includes(projectId)) idea.relatedProjectIds.push(projectId)
  idea.updatedAt = nowIso()
  saveStoreList(KEY, SCHEMA, items, 300)
  return idea
}

export function formatIdeas(query?: string): string {
  const items = searchIdeas(query || '')
  if (!items.length) return '저장된 아이디어가 없습니다.'
  return [
    '【아이디어 은행】',
    ...items.slice(0, 15).map((i) => `• ${i.title}\n  ${i.content.slice(0, 100)}`),
  ].join('\n')
}

export function loadIdeas(): IdeaRecord[] {
  return loadStoreList<IdeaRecord>(KEY, SCHEMA)
}
