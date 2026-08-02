import type { AppLocale } from '../i18n'
import { getAppLocale } from '../i18n'
import { getMusicSession } from '../music/musicSession'
import { lastEntities, lastIntent } from './brainState'
import type { BrainAppContext, BrainHistoryItem, CoreBrainRequest } from './types'
import { normalizeInputText, stripWakeWord } from './wakeWord'

function onlineNow(): boolean {
  try {
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false
  } catch {
    return true
  }
}

function musicActive(): boolean {
  try {
    const s = getMusicSession()
    return (
      s.status === 'ready' ||
      s.status === 'opened_external' ||
      s.status === 'paused' ||
      s.status === 'searching' ||
      s.status === 'unknown'
    )
  } catch {
    return false
  }
}

export function buildAppContext(partial?: Partial<BrainAppContext>): BrainAppContext {
  return {
    activeView: partial?.activeView,
    online: partial?.online ?? onlineNow(),
    musicActive: partial?.musicActive ?? musicActive(),
    selectedProject: partial?.selectedProject ?? (lastEntities().projectName as string | undefined) ?? null,
    lastIntent: partial?.lastIntent ?? lastIntent(),
    lastEntities: partial?.lastEntities ?? lastEntities(),
  }
}

export function buildCoreRequest(input: {
  text: string
  history?: BrainHistoryItem[]
  locale?: AppLocale
  source?: CoreBrainRequest['source']
  conversationId?: string
  appContext?: Partial<BrainAppContext>
  signal?: AbortSignal
  requestId?: string
}): CoreBrainRequest {
  const raw = String(input.text || '')
  const { text: stripped } = stripWakeWord(raw)
  const normalized = normalizeInputText(raw)
  return {
    requestId: input.requestId || `cb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    text: raw.trim(),
    normalizedText: normalized || stripped,
    locale: input.locale || getAppLocale(),
    conversationId: input.conversationId,
    source: input.source || 'text',
    timestamp: new Date().toISOString(),
    history: (input.history || []).slice(-12),
    attachments: [],
    appContext: buildAppContext(input.appContext),
    signal: input.signal,
  }
}

/** Recent turns for follow-up (bounded — reuse AI engine-style short window). */
export function recentUserAssistant(history: BrainHistoryItem[]): BrainHistoryItem[] {
  return history.slice(-8)
}
