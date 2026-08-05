export type KnowledgeSourceType =
  | 'note'
  | 'conversation'
  | 'project'
  | 'idea'
  | 'goal'
  | 'timeline'
  | 'relationship'
  | 'reminder'
  | 'todo'

export type KnowledgeItem = {
  id: string
  sourceType: KnowledgeSourceType
  sourceId: string
  title: string
  summary: string
  keywords: string[]
  relatedIds: string[]
  createdAt: string
  updatedAt: string
  privacyLevel: 'private'
}
