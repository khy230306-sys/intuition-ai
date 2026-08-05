export type LifeOs2EventType =
  | 'context.fused'
  | 'prediction.created'
  | 'habit.candidate'
  | 'habit.confirmed'
  | 'habit.rejected'
  | 'focus.started'
  | 'focus.ended'
  | 'relationship.saved'
  | 'knowledge.indexed'
  | 'automation.planned'
  | 'automation.ran'
  | 'coach.session'
  | 'companion.morning'
  | 'companion.evening'

export type LifeOs2Event = {
  type: LifeOs2EventType
  at: number
  detail?: Record<string, unknown>
}

type Handler = (e: LifeOs2Event) => void
const handlers = new Set<Handler>()

export function onLifeOs2Event(handler: Handler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function emitLifeOs2Event(type: LifeOs2EventType, detail?: Record<string, unknown>): void {
  const e: LifeOs2Event = { type, at: Date.now(), detail }
  for (const h of handlers) {
    try {
      h(e)
    } catch {
      /* never break callers */
    }
  }
}
