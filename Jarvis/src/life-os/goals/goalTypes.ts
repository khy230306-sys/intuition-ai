import type { IsoDate } from '../types'

export type GoalStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical'
export type GoalCategory = 'project' | 'personal' | 'learning' | 'family' | 'health' | 'finance'

export type GoalMilestone = {
  id: string
  title: string
  done: boolean
  createdAt: IsoDate
  completedAt: IsoDate | null
}

export type GoalRecord = {
  id: string
  title: string
  description: string
  category: GoalCategory
  status: GoalStatus
  priority: GoalPriority
  targetDate: IsoDate | null
  progress: number
  milestones: GoalMilestone[]
  relatedProjectIds: string[]
  notes: string[]
  createdFrom: 'conversation' | 'ui' | 'import'
  createdAt: IsoDate
  updatedAt: IsoDate
}
