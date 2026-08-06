/**
 * AI Intent Classifier — structured output only (never generates chat replies).
 * Used only when local rules are ambiguous (mid confidence).
 */

import { z } from 'zod'
import type { AizioIntent } from './types'

export const AiIntentSchema = z.object({
  intent: z.enum([
    'translation.session.start',
    'translation.session.end',
    'translation.session.change_target',
    'translation.oneshot',
    'translation.active_utterance',
    'vision.translation',
    'vision.open',
    'calendar.create',
    'calendar.read',
    'reminder.create',
    'todo.create',
    'family.schedule.create',
    'family.schedule.read',
    'memory.save',
    'memory.read',
    'music.play',
    'weather.query',
    'travel.plan',
    'travel.flight.search',
    'travel.flight.select',
    'travel.flight.details',
    'travel.hotel.search',
    'travel.hotel.select',
    'travel.hotel.details',
    'travel.trip.summary',
    'travel.trip.save',
    'travel.trip.calendar_add',
    'travel.booking.prepare',
    'travel.booking.confirm',
    'travel.booking.status',
    'travel.booking.cancel',
    'travel.unknown',
    'app.control',
    'general.chat',
    'clarify',
  ]),
  confidence: z.number().min(0).max(1),
  targetLanguage: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
})

export type AiIntentClassification = z.infer<typeof AiIntentSchema>

/** Attempt to heal slightly-broken JSON before Zod parse. */
export function healClassifierJson(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) s = s.slice(start, end + 1)
  s = s.replace(/,\s*([}\]])/g, '$1')
  s = s.replace(/'/g, '"')
  return s
}

export function parseClassifierOutput(raw: string): AiIntentClassification | null {
  try {
    const parsed = JSON.parse(healClassifierJson(raw))
    const r = AiIntentSchema.safeParse(parsed)
    if (r.success) return r.data
    // One more heal pass on stringified object fields
    const healed = AiIntentSchema.safeParse({
      intent: String(parsed?.intent || 'general.chat'),
      confidence: Number(parsed?.confidence ?? 0.4),
      targetLanguage: parsed?.targetLanguage ?? null,
      content: parsed?.content ?? null,
    })
    return healed.success ? healed.data : null
  } catch {
    return null
  }
}

export const CONFIDENCE_HIGH = 0.85
export const CONFIDENCE_MID = 0.55

/** Whether a local router result is safe to execute immediately. */
export function passesConfidenceGate(
  confidence: number,
  intent: AizioIntent,
): 'execute' | 'verify' | 'clarify' {
  if (confidence >= CONFIDENCE_HIGH) return 'execute'
  if (confidence >= CONFIDENCE_MID) return 'verify'
  // Never guess-execute destructive / side-effect intents at low confidence
  if (
    intent === 'weather.query' ||
    intent === 'calendar.create' ||
    intent === 'family.schedule.create' ||
    intent === 'reminder.create'
  ) {
    return 'clarify'
  }
  return 'clarify'
}
