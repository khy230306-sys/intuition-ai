import type { IsoDate } from '../types'

export type IdeaStatus = 'new' | 'reviewing' | 'planned' | 'implemented' | 'archived'

export type IdeaRecord = {
  id: string
  title: string
  content: string
  summary: string
  tags: string[]
  category: string
  status: IdeaStatus
  relatedProjectIds: string[]
  relatedGoalIds: string[]
  importance: number
  createdAt: IsoDate
  updatedAt: IsoDate
}
