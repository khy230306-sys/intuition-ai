import { hasAnyConfiguredProvider, runHybridChat } from '../ai-providers'
import { parseLifeAssistantIntentJson } from './schema'
import { classifyLifeAssistantRules } from './intentRules'
import type { LifeAssistantIntentResult } from './types'

const AI_PROMPT = `You classify Korean life-assistant commands into JSON only.
Allowed intent values:
calendar.read, calendar.create, calendar.update, calendar.delete,
task.read, task.create, reminder.create, family.schedule.read, family.schedule.create,
translation.enable, reply.suggest, daily.summary, parking.save, parking.read,
camera.open, general.chat, unknown

Return ONLY JSON:
{
  "intent": "...",
  "confidence": 0.0-1.0,
  "extractedEntities": {},
  "date": "YYYY-MM-DD optional",
  "time": "HH:mm optional",
  "title": "optional",
  "person": "optional",
  "location": "optional",
  "reminderOffset": "30m optional",
  "sourceText": "original",
  "requiresConfirmation": false,
  "missingFields": [],
  "source": "ai"
}`

async function classifyWithAi(text: string): Promise<LifeAssistantIntentResult | null> {
  if (!hasAnyConfiguredProvider()) return null
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null
  try {
    const out = await runHybridChat({
      message: `${AI_PROMPT}\n\nUser: ${text}`,
      history: [],
      displayName: 'AIZIO',
      locale: 'ko-KR',
    })
    const parsed = parseLifeAssistantIntentJson(out.text)
    if (!parsed) return null
    return {
      ...parsed,
      sourceText: parsed.sourceText || text,
      source: 'ai',
      extractedEntities: parsed.extractedEntities || {},
      missingFields: parsed.missingFields || [],
      requiresConfirmation: Boolean(parsed.requiresConfirmation),
    }
  } catch {
    return null
  }
}

/**
 * LifeAssistantIntentRouter — rules first (stable), optional AI JSON for ambiguous cases.
 */
export async function routeLifeAssistantIntent(
  text: string,
  opts?: { allowAi?: boolean },
): Promise<LifeAssistantIntentResult> {
  const q = String(text || '').trim()
  if (!q) {
    return {
      intent: 'unknown',
      confidence: 0,
      extractedEntities: {},
      sourceText: q,
      requiresConfirmation: false,
      missingFields: [],
      source: 'fallback',
    }
  }

  const rules = classifyLifeAssistantRules(q)
  if (rules && rules.confidence >= 0.86 && rules.intent !== 'unknown') {
    return rules
  }

  if (opts?.allowAi !== false) {
    const ai = await classifyWithAi(q)
    if (ai && ai.confidence >= 0.7 && ai.intent !== 'general.chat') {
      return ai
    }
  }

  if (rules) return rules

  return {
    intent: 'unknown',
    confidence: 0.2,
    extractedEntities: {},
    sourceText: q,
    requiresConfirmation: false,
    missingFields: [],
    source: 'fallback',
  }
}

/** True when the utterance looks like a life-assistant command (not free chat). */
export function looksLikeLifeAssistantCommand(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length < 2) return false
  return (
    /(일정|할\s*일|알림|리마인더|주차|브리핑|하루\s*요약|번역\s*모드|답장|가족\s*일정|예방접종|하원|등교|약\s*먹|카메라|안내문|알림장|준비물)/.test(
      t,
    ) || Boolean(classifyLifeAssistantRules(t))
  )
}
