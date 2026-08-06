import { z } from 'zod'

export const LifeAssistantIntentSchema = z.enum([
  'calendar.read',
  'calendar.create',
  'calendar.update',
  'calendar.delete',
  'task.read',
  'task.create',
  'reminder.create',
  'family.schedule.read',
  'family.schedule.create',
  'translation.enable',
  'reply.suggest',
  'daily.summary',
  'parking.save',
  'parking.read',
  'camera.open',
  'general.chat',
  'unknown',
])

export const LifeAssistantEntitiesSchema = z
  .object({
    date: z.string().optional(),
    time: z.string().optional(),
    title: z.string().optional(),
    person: z.string().optional(),
    location: z.string().optional(),
    reminderOffset: z.string().optional(),
    note: z.string().optional(),
    replySource: z.string().optional(),
    priority: z.boolean().optional(),
    importantOnly: z.boolean().optional(),
    missedOnly: z.boolean().optional(),
  })
  .passthrough()

export const LifeAssistantIntentResultSchema = z.object({
  intent: LifeAssistantIntentSchema,
  confidence: z.number().min(0).max(1),
  extractedEntities: LifeAssistantEntitiesSchema.default({}),
  date: z.string().optional(),
  time: z.string().optional(),
  title: z.string().optional(),
  person: z.string().optional(),
  location: z.string().optional(),
  reminderOffset: z.string().optional(),
  sourceText: z.string(),
  requiresConfirmation: z.boolean().default(false),
  missingFields: z.array(z.string()).default([]),
  source: z.enum(['rules', 'ai', 'fallback']).default('ai'),
})

export type ParsedLifeIntent = z.infer<typeof LifeAssistantIntentResultSchema>

/** Extract JSON object from model text and heal common issues. */
export function extractJsonObject(raw: string): string | null {
  const text = String(raw || '').trim()
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = (fenced?.[1] || text).trim()
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  return body.slice(start, end + 1)
}

export function healJsonText(raw: string): string {
  let s = raw
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/'/g, '"')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
  // Quote bare keys
  s = s.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
  return s
}

export function parseLifeAssistantIntentJson(raw: string): ParsedLifeIntent | null {
  const extracted = extractJsonObject(raw)
  if (!extracted) return null
  const attempts = [extracted, healJsonText(extracted)]
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt)
      const result = LifeAssistantIntentResultSchema.safeParse(parsed)
      if (result.success) return result.data
    } catch {
      /* try heal */
    }
  }
  return null
}
