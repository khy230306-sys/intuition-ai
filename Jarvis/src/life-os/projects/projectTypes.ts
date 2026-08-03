import type { IsoDate } from '../types'

export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'

export type ProjectTask = {
  id: string
  title: string
  done: boolean
  createdAt: IsoDate
  completedAt: IsoDate | null
}

export type ProjectBug = {
  id: string
  title: string
  open: boolean
  createdAt: IsoDate
  closedAt: IsoDate | null
}

export type ProjectRecord = {
  id: string
  name: string
  description: string
  version: string
  status: ProjectStatus
  priority: ProjectPriority
  tasks: ProjectTask[]
  bugs: ProjectBug[]
  ideaIds: string[]
  relatedGoalIds: string[]
  risks: string[]
  holdReason: string
  lastUpdateNote: string
  createdAt: IsoDate
  updatedAt: IsoDate
}

export type ProjectHealth = {
  openTasks: number
  openBugs: number
  progress: number
  lastUpdatedAt: IsoDate
  blocked: boolean
}
