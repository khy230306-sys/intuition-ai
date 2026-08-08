/**
 * Hybrid LLM translation fallback — used when offline dict misses and
 * MyMemory is unavailable/fails, but cloud AI providers are configured.
 * Never invents tool facts; translation-only prompt.
 */

import { rememberTranslation } from './offlineDict'

export type HybridTranslateResult = {
  ok: true
  text: string
  from: string
  to: string
  offline: false
  provider: 'hybrid-ai'
}

function looksLikeMetaReply(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (/^(sorry|죄송|i cannot|i'm unable|as an ai)/i.test(t)) return true
  if (/^here is (the )?translation/i.test(t)) return true
  if (/^번역\s*(결과|문장)/i.test(t)) return true
  return false
}

function stripWrapper(text: string): string {
  let t = text.trim()
  t = t.replace(/^["'「『]|["'」』]$/g, '').trim()
  t = t.replace(/^(translation|translated text|번역)\s*[:：]\s*/i, '').trim()
  const lines = t
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length > 1 && /translation|번역|here is/i.test(lines[0]) && lines[0].length < 40) {
    return lines.slice(1).join('\n').trim()
  }
  return t
}

/**
 * Attempt Hybrid AI translation. Returns null when providers missing / fail.
 */
export async function translateViaHybrid(
  text: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<HybridTranslateResult | null> {
  try {
    const { hasAnyConfiguredProvider, runHybridChat } = await import('./ai-providers')
    if (!hasAnyConfiguredProvider()) return null
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null

    const prompt = [
      `You are a precise translator.`,
      `Translate from language code "${from}" to language code "${to}".`,
      `Rules:`,
      `- Output ONLY the translated text`,
      `- No quotes, no explanation, no preamble`,
      `- Keep names, numbers, and place names accurate`,
      `- Preserve casual/polite tone of the original`,
      ``,
      `Text:`,
      text,
    ].join('\n')

    const out = await runHybridChat({
      message: prompt,
      history: [],
      displayName: 'AIZIO',
      locale: 'ko-KR',
      signal,
    })
    const cleaned = stripWrapper(out.text || '')
    if (!cleaned || looksLikeMetaReply(cleaned)) return null
    if (from !== to && cleaned === text && text.length > 12 && /[가-힣]/.test(text) && /^en/i.test(to)) {
      return null
    }

    rememberTranslation(from, to, text, cleaned)
    return {
      ok: true,
      text: cleaned,
      from,
      to,
      offline: false,
      provider: 'hybrid-ai',
    }
  } catch {
    return null
  }
}
