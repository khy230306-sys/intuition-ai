import { reindexKnowledge } from './knowledgeLinker'
import { loadKnowledgeIndex } from './knowledgeRepository'
import type { KnowledgeItem, KnowledgeSourceType } from './knowledgeTypes'

export type KnowledgeSearchOpts = {
  query: string
  sourceType?: KnowledgeSourceType
  yearHint?: number
  reindex?: boolean
}

export function searchKnowledge(opts: KnowledgeSearchOpts): KnowledgeItem[] {
  if (opts.reindex !== false) {
    try {
      reindexKnowledge()
    } catch {
      /* use existing index */
    }
  }
  const q = opts.query.trim().toLowerCase()
  if (!q) return []
  let items = loadKnowledgeIndex()
  if (opts.sourceType) items = items.filter((i) => i.sourceType === opts.sourceType)
  if (opts.yearHint) {
    items = items.filter((i) => i.createdAt.startsWith(String(opts.yearHint)))
  }
  const tokens = q.split(/\s+/).filter(Boolean)
  return items
    .map((item) => {
      const blob = `${item.title} ${item.summary} ${item.keywords.join(' ')}`.toLowerCase()
      const score = tokens.reduce((s, t) => s + (blob.includes(t) ? 1 : 0), 0)
      return { item, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((x) => x.item)
}

export function formatKnowledgeResults(items: KnowledgeItem[], query: string): string {
  if (!items.length) {
    return `「${query}」에 대한 검색 결과가 없습니다. 없는 내용을 만들지 않았습니다.`
  }
  return [
    `【지식 검색 · ${query}】`,
    ...items.map(
      (i) => `• [${i.sourceType}] ${i.title}\n  ${i.summary.slice(0, 120)}\n  출처 id: ${i.sourceId}`,
    ),
  ].join('\n')
}
