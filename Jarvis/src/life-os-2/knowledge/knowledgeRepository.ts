import { loadItems, saveItems, LOS2_KEYS } from '../repository'
import type { KnowledgeItem } from './knowledgeTypes'

export function loadKnowledgeIndex(): KnowledgeItem[] {
  return loadItems<KnowledgeItem>(LOS2_KEYS.knowledge)
}

export function saveKnowledgeIndex(items: KnowledgeItem[]): void {
  saveItems(LOS2_KEYS.knowledge, items, 500)
}

export function removeKnowledgeBySource(sourceType: string, sourceId: string): void {
  const next = loadKnowledgeIndex().filter((k) => !(k.sourceType === sourceType && k.sourceId === sourceId))
  saveKnowledgeIndex(next)
}
