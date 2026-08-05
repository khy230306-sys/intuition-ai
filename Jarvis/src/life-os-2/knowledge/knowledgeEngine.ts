import { isLifeOs2Enabled } from '../featureFlags'
import { emitLifeOs2Event } from '../lifeEventBus'
import { formatKnowledgeResults, searchKnowledge } from './knowledgeSearch'
import { reindexKnowledge } from './knowledgeLinker'

export function handleKnowledgeQuery(text: string): string | null {
  if (!isLifeOs2Enabled('knowledgeEngineEnabled')) return null
  const m =
    text.match(/(?:찾아줘|검색해줘|검색)\s*(.+)$/i) ||
    text.match(/(.+?)\s*(?:관련|에\s*대해).*(?:찾아|검색|보여)/) ||
    text.match(/예전에\s*(.+?)\s*(?:얘기|내용)/) ||
    text.match(/(.+?)\s*아이디어\s*찾아/) ||
    text.match(/(.+?)\s*기록\s*검색/)
  if (!m && !/지식\s*검색|통합\s*검색/.test(text)) return null
  let query = (m?.[1] || text).replace(/찾아줘|검색해줘|검색|보여줘|관련|내용/g, '').trim()
  if (query.length < 2) query = text.replace(/찾아줘|검색해줘/g, '').trim()
  const year = text.match(/(20\d{2})/)?.[1]
  const items = searchKnowledge({
    query,
    yearHint: year ? parseInt(year, 10) : undefined,
  })
  emitLifeOs2Event('knowledge.indexed', { hits: items.length })
  return formatKnowledgeResults(items, query)
}

export { reindexKnowledge, searchKnowledge, formatKnowledgeResults }
