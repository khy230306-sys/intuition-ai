import { isLifeOs2Enabled } from '../featureFlags'
import { emitLifeOs2Event } from '../lifeEventBus'
import { formatKnowledgeResults, searchKnowledge } from './knowledgeSearch'
import { reindexKnowledge } from './knowledgeLinker'

function cleanKnowledgeQuery(raw: string, fallback: string): string {
  let query = raw
    .replace(/찾아줘|검색해줘|검색|보여줘|관련|내용|아이디어/g, ' ')
    .replace(/[.!?…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (query.length < 2) {
    query = fallback
      .replace(/찾아줘|검색해줘|검색|보여줘/g, ' ')
      .replace(/[.!?…]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  return query
}

export function handleKnowledgeQuery(text: string): string | null {
  if (!isLifeOs2Enabled('knowledgeEngineEnabled')) return null
  // Prefer topic-first patterns so trailing 「찾아줘.」 does not become the query
  const m =
    text.match(/(.+?)\s*아이디어\s*찾아/) ||
    text.match(/(.+?)\s*기록\s*검색/) ||
    text.match(/예전에\s*(.+?)\s*(?:얘기|내용)/) ||
    text.match(/(.+?)\s*(?:관련|에\s*대해).*(?:찾아|검색|보여)/) ||
    text.match(/(?:찾아줘|검색해줘|검색)\s*(.+)$/i)
  if (!m && !/지식\s*검색|통합\s*검색/.test(text)) return null
  const query = cleanKnowledgeQuery(m?.[1] || text, text)
  const year = text.match(/(20\d{2})/)?.[1]
  const items = searchKnowledge({
    query,
    yearHint: year ? parseInt(year, 10) : undefined,
  })
  emitLifeOs2Event('knowledge.indexed', { hits: items.length })
  return formatKnowledgeResults(items, query)
}

export { reindexKnowledge, searchKnowledge, formatKnowledgeResults }
