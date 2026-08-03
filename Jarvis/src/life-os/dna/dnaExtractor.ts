import { looksLikeForbiddenSecret } from '../privacyPolicy'

/** Block auto-save of secrets / highly sensitive payloads. */
export function shouldBlockDnaValue(value: string): boolean {
  return looksLikeForbiddenSecret(value) || value.length > 500
}

export type DnaExtract = {
  category: 'preference' | 'interest' | 'communication' | 'routine'
  key: string
  value: string
  confidence: number
} | null

export function extractExplicitDna(text: string): DnaExtract {
  const t = text.trim()
  if (!t || shouldBlockDnaValue(t)) return null

  let m =
    t.match(/나는\s*짧은\s*답변(?:이\s*)?좋/i) ||
    t.match(/짧게\s*(대답|답변|말해)/i) ||
    t.match(/답변(?:을|은)?\s*짧게/i)
  if (m) return { category: 'communication', key: 'responseLength', value: 'concise', confidence: 1 }

  m = t.match(/긴\s*답변(?:이\s*)?좋|자세히\s*(설명|말해)/i)
  if (m) return { category: 'communication', key: 'responseLength', value: 'detailed', confidence: 1 }

  m = t.match(/명령어(?:는|를)?\s*한\s*번에/i)
  if (m) {
    return { category: 'preference', key: 'commandStyle', value: 'batch-commands', confidence: 1 }
  }

  m = t.match(/(?:잔잔한|조용한)\s*음악(?:을\s*)?좋아/i)
  if (m) return { category: 'interest', key: 'musicMood', value: 'calm', confidence: 1 }

  m = t.match(/내\s*취미(?:는|가)\s*(.+?)(?:야|이야|입니다|예요|\.|$)/i)
  if (m?.[1]) {
    return {
      category: 'interest',
      key: 'hobby',
      value: m[1].trim().slice(0, 80),
      confidence: 1,
    }
  }

  m = t.match(/나는\s*(.+?)\s*(?:을|를)?\s*좋아해/i)
  if (m?.[1] && m[1].length < 40 && !/짧은|긴/.test(m[1])) {
    return {
      category: 'interest',
      key: 'likes',
      value: m[1].trim(),
      confidence: 0.95,
    }
  }

  return null
}
