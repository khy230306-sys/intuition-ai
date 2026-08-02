import type { AppLocale } from '../../i18n'
import type { IntentClassification } from '../types'

/**
 * Optional AI-assisted intent classification.
 * Currently a safe stub: we do not spend API tokens on intent-only calls.
 * Ambiguous text is returned as general_chat so the existing AI chat path handles it.
 */
export async function classifyWithAi(
  _text: string,
  _locale: AppLocale,
  signal?: AbortSignal,
): Promise<IntentClassification | null> {
  if (signal?.aborted) return null
  return {
    intent: 'general_chat',
    confidence: 0.45,
    source: 'ai',
    entities: {},
  }
}
