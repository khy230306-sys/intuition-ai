import type { IsoDate, LifePrivacyLevel } from '../types'

export type TimelineEventType =
  | 'goal'
  | 'project'
  | 'idea'
  | 'family'
  | 'reminder'
  | 'note'
  | 'travel'
  | 'custom'

export type TimelineEvent = {
  id: string
  type: TimelineEventType
  title: string
  summary: string
  occurredAt: IsoDate
  sourceId: string
  sourceType: string
  importance: number
  userPinned: boolean
  privacyLevel: LifePrivacyLevel
  createdAt: IsoDate
}
