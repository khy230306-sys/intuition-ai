import type { AiChatMessage } from './types'

const DEFAULT_MAX_MESSAGES = 14
/** Conservative char budget instead of a tokenizer dependency. */
const DEFAULT_MAX_CHARS = 10_000
const MAX_SINGLE_MSG_CHARS = 1_800

function normalizeRole(role: string): 'user' | 'assistant' {
  return role === 'assistant' ? 'assistant' : 'user'
}

function compressContent(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= MAX_SINGLE_MSG_CHARS) return t
  const head = t.slice(0, 1_200)
  const tail = t.slice(-400)
  return `${head}\n…(생략)…\n${tail}`
}

/**
 * Build AI-bound history without mutating stored chat.
 * Keeps recent turns, drops empties/dupes, enforces char budget.
 */
export function buildAiContext(
  history: Array<{ role: string; text: string }> = [],
  opts?: { maxMessages?: number; maxChars?: number },
): AiChatMessage[] {
  const maxMessages = opts?.maxMessages ?? DEFAULT_MAX_MESSAGES
  const maxChars = opts?.maxChars ?? DEFAULT_MAX_CHARS

  const cleaned: AiChatMessage[] = []
  let prevKey = ''
  for (const m of history) {
    const content = compressContent(m.text || '')
    if (!content) continue
    const role = normalizeRole(m.role)
    const key = `${role}:${content}`
    if (key === prevKey) continue
    prevKey = key
    cleaned.push({ role, content })
  }

  const recent = cleaned.slice(-maxMessages)
  let total = recent.reduce((n, m) => n + m.content.length, 0)
  while (recent.length > 2 && total > maxChars) {
    const removed = recent.shift()
    total -= removed?.content.length ?? 0
  }
  return recent
}
