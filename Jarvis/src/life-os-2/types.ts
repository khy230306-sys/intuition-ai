export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export type Severity = 'info' | 'warning' | 'urgent'

export type SourceConfidence = {
  source: string
  confidence: number
  stale: boolean
  updatedAt: string | null
}

export type { LifeOs2UiCard as Los2Card } from './ui/cardTypes'

export type Los2HandleResult = {
  handled: boolean
  text: string
  speakText?: string
  /** Structured cards for chat UI (optional). */
  lifeCards?: import('./ui/cardTypes').LifeOs2UiCard[]
  view?: string
}
