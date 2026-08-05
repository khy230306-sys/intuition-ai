import type { SourceConfidence, TimeOfDay } from '../types'

export type FusedContext = {
  generatedAt: string
  timezone: string
  timeOfDay: TimeOfDay
  currentScreen: string | null
  network: { online: boolean; quality: 'unknown' }
  location: { available: boolean; permission: string; city: string }
  today: {
    events: string[]
    reminders: string[]
    todos: string[]
    familyEvents: string[]
  }
  goals: Array<{ title: string; progress: number; status: string }>
  projects: Array<{ name: string; progress: number; stalledDays: number; status: string }>
  navigation: { hasPendingCandidates: boolean }
  music: { status: string; title: string | null }
  emotion: { available: false; note: string }
  provider: { anyConfigured: boolean; mode?: string }
  habitSignals: string[]
  dnaSnippet: string
  routines: string[]
  focusActive: boolean
  confidence: Record<string, SourceConfidence>
}

export type ContextFusionOptions = {
  activeView?: string
  history?: { role: string; text: string }[]
  force?: boolean
}
