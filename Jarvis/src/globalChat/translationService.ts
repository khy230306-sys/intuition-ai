import { langLabel, translateText } from '../translate'
import { detectMessageLanguage, isTranslationSkippable } from './languageDetector'
import { protectForTranslation, restoreProtected } from './protectTokens'
import { getCachedTranslation, putCachedTranslation } from './translationCache'
import type { TranslateMessageInput, TranslateMessageResult } from './types'

const inflight = new Map<string, Promise<TranslateMessageResult>>()

/**
 * Translate a chat message for display.
 * Uses existing offline dictionary + MyMemory (no new API keys in the client bundle).
 */
export async function translateChatMessage(input: TranslateMessageInput): Promise<TranslateMessageResult> {
  const started = Date.now()
  const target = input.targetLanguage
  const text = input.originalText.trim()
  const warnings: string[] = []

  if (!text) {
    return {
      translatedText: '',
      detectedSourceLanguage: 'und',
      provider: 'none',
      latencyMs: 0,
      cached: false,
      status: 'skipped',
      warnings: ['empty'],
    }
  }

  if (isTranslationSkippable(text)) {
    return {
      translatedText: text,
      detectedSourceLanguage: 'und',
      provider: 'skip',
      latencyMs: Date.now() - started,
      cached: false,
      status: 'skipped',
      warnings: ['skippable'],
    }
  }

  const detected = detectMessageLanguage(text, {
    prefer: input.sourceLanguage,
    detect: true,
  })
  const source = detected.language === 'und' ? input.sourceLanguage || 'auto' : detected.language

  if (source !== 'auto' && source !== 'und' && source.split('-')[0] === target.split('-')[0]) {
    return {
      translatedText: text,
      detectedSourceLanguage: source,
      provider: 'none',
      latencyMs: Date.now() - started,
      cached: false,
      status: 'skipped',
      warnings: ['same_language'],
    }
  }

  const key = `${input.messageId}::${target}`
  if (!input.force) {
    const cached = getCachedTranslation(input.messageId, target)
    if (cached) {
      return {
        translatedText: cached.translatedText,
        detectedSourceLanguage: cached.sourceLanguage || source,
        provider: cached.provider,
        model: cached.model,
        latencyMs: Date.now() - started,
        cached: true,
        status: 'completed',
        warnings: [],
      }
    }
  }

  const existing = inflight.get(key)
  if (existing && !input.force) return existing

  const work = (async (): Promise<TranslateMessageResult> => {
    const { masked, slots } = protectForTranslation(text)
    try {
      const result = await translateText(masked, source === 'und' ? 'auto' : source, target)
      if (!result.ok || !result.text.trim()) {
        const status =
          typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'failed'
        return {
          translatedText: text,
          detectedSourceLanguage: result.from || source,
          provider: 'mymemory+offlineDict',
          latencyMs: Date.now() - started,
          cached: false,
          status,
          warnings: [result.error || 'translate_failed'],
        }
      }
      const restored = restoreProtected(result.text, slots)
      putCachedTranslation({
        messageId: input.messageId,
        targetLanguage: target,
        translatedText: restored,
        provider: result.offline ? 'offlineDict' : 'mymemory',
        status: 'completed',
        sourceLanguage: result.from || source,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      if (result.partial) warnings.push('partial')
      return {
        translatedText: restored,
        detectedSourceLanguage: result.from || source,
        provider: result.offline ? 'offlineDict' : 'mymemory',
        latencyMs: Date.now() - started,
        cached: false,
        status: 'completed',
        warnings,
      }
    } catch {
      return {
        translatedText: text,
        detectedSourceLanguage: source,
        provider: 'mymemory+offlineDict',
        latencyMs: Date.now() - started,
        cached: false,
        status: 'failed',
        warnings: ['exception'],
      }
    }
  })()

  inflight.set(key, work)
  try {
    return await work
  } finally {
    inflight.delete(key)
  }
}

export function translationSourceLabel(code: string): string {
  if (!code || code === 'und') return code || 'und'
  return langLabel(code)
}
