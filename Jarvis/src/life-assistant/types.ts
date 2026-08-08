/** AI Life Assistant — structured intents for everyday commands. */

export type LifeAssistantIntent =
  | 'calendar.read'
  | 'calendar.create'
  | 'calendar.update'
  | 'calendar.delete'
  | 'task.read'
  | 'task.create'
  | 'reminder.create'
  | 'family.schedule.read'
  | 'family.schedule.create'
  | 'translation.enable'
  | 'reply.suggest'
  | 'daily.summary'
  | 'parking.save'
  | 'parking.read'
  | 'camera.open'
  | 'general.chat'
  | 'unknown'

export type LifeAssistantEntities = {
  date?: string
  time?: string
  title?: string
  person?: string
  location?: string
  reminderOffset?: string
  /** Minutes before schedule to notify (「30분 전에 알려줘」). */
  notifyMinutesBefore?: number
  note?: string
  replySource?: string
  priority?: boolean
  importantOnly?: boolean
  missedOnly?: boolean
}

export type LifeAssistantIntentResult = {
  intent: LifeAssistantIntent
  confidence: number
  extractedEntities: LifeAssistantEntities
  date?: string
  time?: string
  title?: string
  person?: string
  location?: string
  reminderOffset?: string
  sourceText: string
  requiresConfirmation: boolean
  missingFields: string[]
  source: 'rules' | 'ai' | 'fallback'
}

export type ParkingMemory = {
  id: string
  label: string
  note: string
  lat: number | null
  lng: number | null
  /** meters, when GPS */
  accuracyM?: number | null
  savedAt: number
  source: 'gps' | 'manual'
}

export type LifeBriefingItem = {
  id: string
  kind:
    | 'calendar'
    | 'reminder'
    | 'todo'
    | 'family'
    | 'anniversary'
    | 'medication'
    | 'missed'
    | 'weather'
    | 'parking'
  label: string
  detail?: string
  /** View or action target */
  targetView?: 'life' | 'family' | 'family-helper' | 'chat' | 'ai-camera' | 'navigation'
  chatHint?: string
}

export type LifeBriefing = {
  title: string
  items: LifeBriefingItem[]
  generatedAt: number
}

export type LifeAssistantPrefs = {
  schemaVersion: number
  briefingEnabled: boolean
  updatedAt: number
}
