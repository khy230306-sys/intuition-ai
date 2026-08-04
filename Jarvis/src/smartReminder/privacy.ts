import type { JarvisSettings } from '../types'
import type { NotifyPrivacyMode } from '../push/reminderPushTypes'
import type { SmartReminder } from './types'

/** Default privacy is conservative (simple). */
export function defaultPrivacyFromSettings(settings?: Partial<JarvisSettings> | null): NotifyPrivacyMode {
  const m = settings?.notifyPrivacyMode
  if (m === 'full' || m === 'simple' || m === 'hidden') return m
  return 'simple'
}

/**
 * Health / family-related reminders stay hidden on lock screen
 * unless the user explicitly chose "full".
 */
export function resolveReminderPrivacyMode(
  reminder: Pick<SmartReminder, 'category' | 'personDisplay' | 'personRelation' | 'previewMode'>,
  settings?: Partial<JarvisSettings> | null,
): NotifyPrivacyMode {
  const pref = defaultPrivacyFromSettings(settings)
  const sensitive =
    reminder.category === 'health' ||
    reminder.category === 'medical' ||
    Boolean(reminder.personDisplay) ||
    Boolean(reminder.personRelation)
  if (sensitive && pref !== 'full') return 'hidden'
  return pref
}
