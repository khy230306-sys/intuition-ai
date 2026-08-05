import { loadMemory } from '../../storage'
import { loadReminders } from '../../storage'
import { loadGoals } from '../../life-os/goals/goalRepository'
import { loadProjects } from '../../life-os/projects/projectService'
import { loadIdeas } from '../../life-os/ideas/ideaService'
import { loadTimeline } from '../../life-os/timeline/timelineService'
import { los2Id, nowIso } from '../repository'
import { loadKnowledgeIndex, saveKnowledgeIndex } from './knowledgeRepository'
import type { KnowledgeItem } from './knowledgeTypes'

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,./·|/]+/)
    .filter((w) => w.length >= 2)
    .slice(0, 12)
}

/** Rebuild/merge index from live sources — index does not replace originals. */
export function reindexKnowledge(): KnowledgeItem[] {
  const now = nowIso()
  const items: KnowledgeItem[] = []

  try {
    for (const m of loadMemory().slice(0, 80)) {
      items.push({
        id: los2Id('kn'),
        sourceType: 'note',
        sourceId: m.id,
        title: m.key,
        summary: m.value,
        keywords: keywords(`${m.key} ${m.value}`),
        relatedIds: [],
        createdAt: new Date(m.updatedAt || Date.now()).toISOString(),
        updatedAt: now,
        privacyLevel: 'private',
      })
    }
  } catch {
    /* ignore */
  }

  try {
    for (const r of loadReminders().slice(0, 60)) {
      items.push({
        id: los2Id('kn'),
        sourceType: 'reminder',
        sourceId: r.id,
        title: r.text.slice(0, 40),
        summary: r.text,
        keywords: keywords(r.text),
        relatedIds: [],
        createdAt: new Date(r.createdAt || Date.now()).toISOString(),
        updatedAt: now,
        privacyLevel: 'private',
      })
    }
  } catch {
    /* ignore */
  }

  try {
    for (const g of loadGoals().slice(0, 40)) {
      items.push({
        id: los2Id('kn'),
        sourceType: 'goal',
        sourceId: g.id,
        title: g.title,
        summary: g.description || g.title,
        keywords: keywords(`${g.title} ${g.description || ''}`),
        relatedIds: g.relatedProjectIds || [],
        createdAt: g.createdAt,
        updatedAt: now,
        privacyLevel: 'private',
      })
    }
  } catch {
    /* ignore */
  }

  try {
    for (const p of loadProjects().slice(0, 40)) {
      items.push({
        id: los2Id('kn'),
        sourceType: 'project',
        sourceId: p.id,
        title: p.name,
        summary: p.description || p.name,
        keywords: keywords(`${p.name} ${p.description || ''}`),
        relatedIds: [],
        createdAt: p.createdAt,
        updatedAt: now,
        privacyLevel: 'private',
      })
    }
  } catch {
    /* ignore */
  }

  try {
    for (const idea of loadIdeas().slice(0, 40)) {
      items.push({
        id: los2Id('kn'),
        sourceType: 'idea',
        sourceId: idea.id,
        title: idea.title,
        summary: idea.content || idea.title,
        keywords: keywords(`${idea.title} ${idea.content || ''}`),
        relatedIds: [],
        createdAt: idea.createdAt,
        updatedAt: now,
        privacyLevel: 'private',
      })
    }
  } catch {
    /* ignore */
  }

  try {
    for (const t of loadTimeline().slice(0, 40)) {
      items.push({
        id: los2Id('kn'),
        sourceType: 'timeline',
        sourceId: t.id,
        title: t.title,
        summary: t.summary || t.title,
        keywords: keywords(`${t.title} ${t.summary || ''}`),
        relatedIds: t.sourceId ? [t.sourceId] : [],
        createdAt: t.createdAt,
        updatedAt: now,
        privacyLevel: 'private',
      })
    }
  } catch {
    /* ignore */
  }

  // Keep previous conversation snippets if any were manually added
  const prevConv = loadKnowledgeIndex().filter((k) => k.sourceType === 'conversation')
  const merged = [...items, ...prevConv].slice(0, 500)
  saveKnowledgeIndex(merged)
  return merged
}
