export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export type Severity = 'info' | 'warning' | 'urgent'

export type SourceConfidence = {
  source: string
  confidence: number
  stale: boolean
  updatedAt: string | null
}

export type Los2CardKind =
  | 'context'
  | 'prediction'
  | 'habit'
  | 'focus'
  | 'automation'
  | 'coach'
  | 'morning'
  | 'evening'
  | 'knowledge'
  | 'recommendation'

export type Los2Card = {
  kind: Los2CardKind
  title: string
  body: string
  collapsedByDefault?: boolean
  meta?: Record<string, string | number | boolean | null>
}

export type Los2HandleResult = {
  handled: boolean
  text: string
  speakText?: string
  cards?: Los2Card[]
  view?: string
}
