/** Central command routing types for AIZIO chat. */

export type AizioIntent =
  | 'translation.session.start'
  | 'translation.session.end'
  | 'translation.session.change_target'
  | 'translation.oneshot'
  | 'translation.active_utterance'
  | 'vision.translation'
  | 'vision.open'
  | 'calendar.create'
  | 'calendar.read'
  | 'reminder.create'
  | 'todo.create'
  | 'family.schedule.create'
  | 'family.schedule.read'
  | 'memory.save'
  | 'memory.read'
  | 'music.play'
  | 'weather.query'
  | 'travel.plan'
  | 'travel.flight.search'
  | 'travel.flight.select'
  | 'travel.flight.details'
  | 'travel.hotel.search'
  | 'travel.hotel.select'
  | 'travel.hotel.details'
  | 'travel.trip.summary'
  | 'travel.trip.save'
  | 'travel.trip.calendar_add'
  | 'travel.booking.prepare'
  | 'travel.booking.confirm'
  | 'travel.booking.status'
  | 'travel.booking.cancel'
  | 'travel.unknown'
  | 'restaurant.search'
  | 'restaurant.details'
  | 'restaurant.filter'
  | 'restaurant.select'
  | 'restaurant.availability'
  | 'restaurant.booking.prepare'
  | 'restaurant.booking.confirm'
  | 'restaurant.booking.status'
  | 'restaurant.booking.cancel'
  | 'app.control'
  | 'general.chat'
  | 'clarify'

export type ActiveMode = 'normal' | 'translation' | 'travel' | 'restaurant'

export type CommandRouterInput = {
  text: string
  conversationContext?: unknown
  activeMode?: ActiveMode
  locale?: string
}

export type CommandRouterResult = {
  intent: AizioIntent
  confidence: number
  entities: Record<string, unknown>
  action: string
  requiresAI: boolean
  requiresConfirmation: boolean
  missingFields: string[]
  reason: string
  /** Normalized user text */
  normalized: string
  /** Content to translate (command stripped) when applicable */
  content?: string
  targetLanguage?: string
  sourceLanguage?: string
  /** Actions that must NOT run for this input */
  forbiddenActions: string[]
  blockedActions: string[]
}

export type RouteDiagEntry = {
  at: string
  input: string
  normalized: string
  intent: AizioIntent
  confidence: number
  activeMode: ActiveMode
  action: string
  blockedActions: string[]
  fallback: boolean
  reason: string
}
