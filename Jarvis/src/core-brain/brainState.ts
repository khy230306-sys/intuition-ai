import type { CoreIntent } from './types'

const MAX_RECENT = 8

type RecentTurn = {
  at: number
  intent: CoreIntent
  entities: Record<string, unknown>
  textHash: string
}

let recent: RecentTurn[] = []
const inFlight = new Map<string, number>()
const DEDUPE_MS = 1600

function hashText(s: string): string {
  let h = 0
  const t = s.trim().toLowerCase()
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0
  return String(h)
}

export function rememberTurn(intent: CoreIntent, entities: Record<string, unknown>, text: string): void {
  recent.push({ at: Date.now(), intent, entities: { ...entities }, textHash: hashText(text) })
  if (recent.length > MAX_RECENT) recent = recent.slice(-MAX_RECENT)
}

export function lastTurn(): RecentTurn | null {
  return recent.length ? recent[recent.length - 1]! : null
}

export function lastIntent(): CoreIntent | null {
  return lastTurn()?.intent ?? null
}

export function lastEntities(): Record<string, unknown> {
  return lastTurn()?.entities ?? {}
}

/** Prevent identical rapid double-submits (voice + send). */
export function isDuplicateRequest(text: string): boolean {
  const h = hashText(text)
  const now = Date.now()
  const prev = inFlight.get(h)
  if (prev && now - prev < DEDUPE_MS) return true
  inFlight.set(h, now)
  for (const [k, at] of inFlight) {
    if (now - at > DEDUPE_MS * 4) inFlight.delete(k)
  }
  return false
}

export function clearBrainStateForTests(): void {
  recent = []
  inFlight.clear()
}
