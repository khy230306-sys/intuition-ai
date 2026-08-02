import { classifyIntent } from '../intentClassifier'
import type { AppLocale } from '../../i18n'
import type { IntentClassification } from '../types'

/** Fast path — no cloud calls. */
export function classifyWithLocalRules(text: string, locale: AppLocale): IntentClassification {
  return classifyIntent(text, locale)
}
