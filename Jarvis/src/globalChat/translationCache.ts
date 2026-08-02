import type { MessageTranslation } from './types'

const KEY = 'jarvis.globalChat.translationCache.v1'
const MAX = 400

function loadAll(): MessageTranslation[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as MessageTranslation[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveAll(list: MessageTranslation[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)))
  } catch {
    /* quota */
  }
}

export function cacheKey(messageId: string, targetLanguage: string): string {
  return `${messageId}::${targetLanguage}`
}

export function getCachedTranslation(
  messageId: string,
  targetLanguage: string,
): MessageTranslation | null {
  const id = cacheKey(messageId, targetLanguage)
  return (
    loadAll().find((t) => cacheKey(t.messageId, t.targetLanguage) === id && t.status === 'completed') ||
    null
  )
}

export function putCachedTranslation(entry: MessageTranslation): void {
  const list = loadAll().filter(
    (t) => !(t.messageId === entry.messageId && t.targetLanguage === entry.targetLanguage),
  )
  list.push(entry)
  saveAll(list)
}

export function invalidateMessageTranslations(messageId: string): void {
  saveAll(loadAll().filter((t) => t.messageId !== messageId))
}

export function clearTranslationCache(): void {
  localStorage.removeItem(KEY)
}
