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

/**
 * Record a turn for short follow-ups.
 * Soft social/general_chat does not overwrite skill context (music/reminder/project),
 * so 「고마워」 after music does not poison the next clear music control cue window
 * beyond what applyContextFollowUp already guards — skill intents stay sticky until
 * another skill-owned intent lands.
 */
export function rememberTurn(intent: CoreIntent, entities: Record<string, unknown>, text: string): void {
  const softSocial =
    (intent === 'general_chat' || intent === 'ask_information' || intent === 'unknown') &&
    Boolean(entities.social || /고마|감사|최고|피곤|심심|안녕|대박|ㅋㅋ|ㅎㅎ|thanks|hello|^hi\b/i.test(text))
  if (softSocial) {
    const prev = lastTurn()
    if (
      prev &&
      (prev.intent === 'play_music' ||
        prev.intent === 'control_music' ||
        prev.intent === 'create_reminder' ||
        prev.intent === 'update_reminder' ||
        prev.intent === 'ask_person_schedule' ||
        prev.intent === 'project_status' ||
        prev.intent === 'project_planning')
    ) {
      // Keep previous skill intent for a short window; still push a marker without replacing intent.
      recent.push({
        at: Date.now(),
        intent: prev.intent,
        entities: { ...prev.entities, socialAck: true },
        textHash: hashText(text),
      })
      if (recent.length > MAX_RECENT) recent = recent.slice(-MAX_RECENT)
      return
    }
  }
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
