import type { IsoDate, LifeSource } from '../types'

export type DnaCategory =
  | 'preference'
  | 'relationship'
  | 'interest'
  | 'routine'
  | 'communication'

export type DnaRecord = {
  id: string
  category: DnaCategory
  key: string
  value: string
  source: LifeSource
  confidence: number
  importance: number
  createdAt: IsoDate
  updatedAt: IsoDate
  lastUsedAt: IsoDate
  userEditable: boolean
  sensitive: boolean
}
