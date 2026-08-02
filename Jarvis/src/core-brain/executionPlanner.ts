import { findSkillsForIntent } from './skillRegistry'
import type { CoreIntent, ExecutionStep } from './types'

/**
 * Build an ordered plan. Keeps mobile-friendly sequential steps (no aggressive parallel).
 * Multi-intent phrases are split lightly by “하고/그리고”.
 */
export function buildExecutionPlan(text: string, primary: CoreIntent): ExecutionStep[] {
  const steps: ExecutionStep[] = []
  const parts = text
    .split(/\s*(?:하고|그리고|,)\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2)
    .slice(0, 3)

  const intents: CoreIntent[] = [primary]

  // Lightweight secondary detection without full reclassify cost
  for (const part of parts.slice(1)) {
    if (/번역|통역/.test(part)) intents.push('translate')
    else if (/메모|기억해/.test(part)) intents.push('create_note')
    else if (/일정\s*추가|약속/.test(part)) intents.push('create_calendar_event')
    else if (/음악|노래|틀어/.test(part)) intents.push('play_music')
  }

  const seen = new Set<string>()
  for (const intent of intents) {
    const skills = findSkillsForIntent(intent)
    for (const skill of skills) {
      const key = `${skill.id}:${intent}`
      if (seen.has(key)) continue
      seen.add(key)
      steps.push({
        skillId: skill.id,
        intent,
        reason: intent === primary ? 'primary' : 'compound',
      })
    }
  }

  if (!steps.length) {
    steps.push({ skillId: 'chat', intent: 'general_chat', reason: 'fallback' })
  }
  return steps
}
