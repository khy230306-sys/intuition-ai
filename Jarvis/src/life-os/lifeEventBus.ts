/** Tiny in-memory event bus for Life OS domain events (no network). */

export type LifeEventType =
  | 'dna.changed'
  | 'goal.changed'
  | 'idea.saved'
  | 'project.changed'
  | 'timeline.added'
  | 'routine.ran'
  | 'emergency.opened'

export type LifeEvent = {
  type: LifeEventType
  payload?: Record<string, unknown>
  at: string
}

type Handler = (ev: LifeEvent) => void

const handlers = new Map<LifeEventType | '*', Set<Handler>>()

export function onLifeEvent(type: LifeEventType | '*', fn: Handler): () => void {
  if (!handlers.has(type)) handlers.set(type, new Set())
  handlers.get(type)!.add(fn)
  return () => handlers.get(type)?.delete(fn)
}

export function emitLifeEvent(type: LifeEventType, payload?: Record<string, unknown>): void {
  const ev: LifeEvent = { type, payload, at: new Date().toISOString() }
  handlers.get(type)?.forEach((fn) => {
    try {
      fn(ev)
    } catch {
      /* ignore */
    }
  })
  handlers.get('*')?.forEach((fn) => {
    try {
      fn(ev)
    } catch {
      /* ignore */
    }
  })
}

export function clearLifeEventBusForTests(): void {
  handlers.clear()
}
