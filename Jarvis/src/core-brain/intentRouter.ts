import type { AppLocale } from '../i18n'
import { classifyWithAi } from './adapters/aiAdapter'
import { classifyWithLocalRules } from './adapters/localRuleAdapter'
import { isLowConfidence, shouldExecuteViaSkills } from './confidenceEvaluator'
import type { IntentClassification } from './types'

export async function routeIntent(
  text: string,
  locale: AppLocale,
  signal?: AbortSignal,
): Promise<{ classification: IntentClassification; executeSkills: boolean }> {
  let classification = classifyWithLocalRules(text, locale)

  if (isLowConfidence(classification) && classification.intent !== 'general_chat') {
    try {
      const ai = await classifyWithAi(text, locale, signal)
      if (ai && ai.confidence > classification.confidence) classification = ai
    } catch {
      classification = {
        intent: 'general_chat',
        confidence: 0.4,
        source: 'default',
        entities: classification.entities,
      }
    }
  }

  if (classification.intent === 'unknown') {
    classification = { ...classification, intent: 'general_chat', confidence: Math.min(classification.confidence, 0.4) }
  }

  return {
    classification,
    executeSkills: shouldExecuteViaSkills(classification),
  }
}
