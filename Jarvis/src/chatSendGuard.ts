/**
 * Prevents duplicate chat sends (double-tap 전송, iOS ghost click after remount,
 * voice final + 전송 racing). Same text within the window is ignored.
 */

export type ChatSendGuardState = {
  text: string
  at: number
}

const DEFAULT_WINDOW_MS = 1800

export function shouldAcceptChatSend(
  text: string,
  busy: boolean,
  last: ChatSendGuardState | null,
  now = Date.now(),
  windowMs = DEFAULT_WINDOW_MS,
): boolean {
  const t = text.trim()
  if (!t || busy) return false
  if (last && last.text === t && now - last.at < windowMs) return false
  return true
}

export function nextChatSendGuard(text: string, now = Date.now()): ChatSendGuardState {
  return { text: text.trim(), at: now }
}
