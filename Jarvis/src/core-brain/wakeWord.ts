import { APP_BRAND, APP_BRAND_KO } from '../brand'

/**
 * Strip leading AIZIO wake words. Does not strip mid-sentence brand mentions.
 * Handles spaced / STT-near variants: 아이지오, AIZIO, 아이 지오, 에이지오.
 */
/** Wake only when followed by separator/end — not “아이지오가 뭐야”. */
const WAKE_HEAD =
  /^(?:hey\s+)?(?:아이지오|아이\s*지오|에이\s*지오|에이지오|aizio|ai\s*zio)(?:\s*[,，.!?…]+\s*|\s+)/i

export function stripWakeWord(raw: string): { text: string; hadWakeWord: boolean } {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return { text: '', hadWakeWord: false }
  if (WAKE_HEAD.test(trimmed)) {
    const text = trimmed.replace(WAKE_HEAD, '').trim()
    return { text: text || trimmed, hadWakeWord: true }
  }
  // Exact wake-only → keep empty normalized for help-style handling upstream
  const only = new RegExp(`^(?:${APP_BRAND_KO}|${APP_BRAND})$`, 'i')
  if (only.test(trimmed.replace(/\s+/g, ''))) {
    return { text: '', hadWakeWord: true }
  }
  return { text: trimmed, hadWakeWord: false }
}

export function normalizeInputText(raw: string): string {
  return stripWakeWord(raw)
    .text.replace(/\s+/g, ' ')
    .trim()
}
