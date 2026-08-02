import { detectLangCode } from '../translate'

/** Short / non-linguistic messages — do not over-confidently assign a language. */
export function isTranslationSkippable(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (t.length <= 2) return true
  if (/^[\d\s.,+\-/%$₩¥€£]+$/.test(t)) return true
  if (/^https?:\/\/\S+$/i.test(t)) return true
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(t)) return true
  if (/^(ㅋ+|ㅎ+|ㅠ+|ㅜ+|ㅇㅇ|ㄱㄱ|ok|yes|no|lol|lmao|thx|thanks)$/i.test(t)) return true
  if (/^\[(사진|동영상|photo|video|image)\]$/i.test(t)) return true
  // Likely a bare name (2–4 Hangul/Latin syllables, no spaces)
  if (/^[\uac00-\ud7af]{2,4}$/.test(t) || /^[A-Z][a-z]{1,12}$/.test(t)) return true
  return false
}

export function detectMessageLanguage(
  text: string,
  opts?: { prefer?: string; detect?: boolean },
): { language: string; confidence: number } {
  if (isTranslationSkippable(text)) {
    return { language: opts?.prefer || 'und', confidence: 0.2 }
  }
  if (opts?.detect === false && opts.prefer) {
    return { language: opts.prefer, confidence: 0.7 }
  }
  const detected = detectLangCode(text)
  // Prefer author setting when script is ambiguous (latin-only short text)
  if (opts?.prefer && /^[\x00-\x7F]+$/.test(text) && text.length < 24) {
    return { language: opts.prefer, confidence: 0.55 }
  }
  return { language: detected, confidence: 0.85 }
}
