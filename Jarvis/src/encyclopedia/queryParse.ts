/**
 * Extract a knowledge / definition query from natural Korean (and light English).
 */

/** Strip pasted chat chrome like 「성규 13:28 …」 */
export function stripChatPasteNoise(text: string): string {
  let t = String(text || '').trim()
  // leading speaker + clock
  t = t.replace(/^(?:성\s+)?[가-힣A-Za-z]{1,20}\s+\d{1,2}:\d{2}\s+/u, '')
  // leftover clocks
  t = t.replace(/\b\d{1,2}:\d{2}\b/g, ' ')
  return t.replace(/\s+/g, ' ').trim()
}

function looksLikeScheduleOrReminder(text: string): boolean {
  return /(?:알림|리마인더|예약|진찰|병원|회의|미팅|약속|\d+\s*시|\d+\s*분\s*(?:뒤|후)|일정\s*(?:뭐|알려|보여))/.test(
    text,
  )
}

export function isKnowledgeQuestion(text: string): boolean {
  const t = stripChatPasteNoise(text)
  if (!t || t.length > 120) return false
  if (looksLikeScheduleOrReminder(t)) return false
  if (
    /무슨\s*뜻|뜻이야|의미\s*(야|에요|인가요|지)|설명해\s*줘|정의해|정의가|뭐\s*뜻|알고\s*싶|what\s+is|who\s+is|what\s+does|mean\??$/i.test(
      t,
    )
  ) {
    return true
  }
  // 「X 뭐야?」 but not schedule
  if (/(?:은|는|이|가)?\s*뭐야\??$|무엇이야|뭐지\??$/.test(t) && !/일정|예약|알림/.test(t)) {
    return true
  }
  // 「X란?」「X은?」 short topic asks
  if (/^[A-Za-z가-힣0-9][A-Za-z가-힣0-9\s.\-]{0,40}(?:이란|란)\??$/.test(t)) return true
  return false
}

/** Topic string suitable for Wikipedia search, or null. */
export function extractKnowledgeTopic(text: string): string | null {
  const t = stripChatPasteNoise(text)
  if (!t || looksLikeScheduleOrReminder(t)) return null

  const patterns: RegExp[] = [
    /^(.+?)\s*(?:아|야)?\s*(?:무슨\s*뜻(?:이야|인가요|이예요|이에요)?|뜻이야)\s*\??$/i,
    /^(.+?)(?:은|는|이|가)\s*(?:뭐야|무엇이야|뭔가요|뭔지)\s*\??$/i,
    /^(.+?)\s*(?:뭐야|무엇이야)\s*\??$/i,
    /^(.+?)\s*(?:에\s*대해|에\s*관해서)?\s*(?:설명해\s*줘)\s*\??$/i,
    /^(?:what\s+is|who\s+is|what's)\s+(.+?)\s*\??$/i,
    /^(.+?)\s*(?:이란|란)\s*\??$/i,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m?.[1]) {
      const topic = cleanTopic(m[1])
      if (topic) return topic
    }
  }
  if (isKnowledgeQuestion(t) && t.length <= 48) {
    const topic = cleanTopic(
      t
        .replace(/무슨\s*뜻.*$/i, '')
        .replace(/뜻이야.*$/i, '')
        .replace(/설명해\s*줘.*$/i, '')
        .replace(/뭐야\??$/i, '')
        .trim(),
    )
    if (topic) return topic
  }
  return null
}

function cleanTopic(raw: string): string | null {
  let s = raw
    .replace(/^(?:그|저|이)\s*/, '')
    .replace(/[?？!！.。]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  // drop trailing vocative / topic particles
  s = s.replace(/([A-Za-z])[아야]\s*$/u, '$1')
  s = s.replace(/\s*[아야]\s*$/u, '').trim()
  s = s.replace(/[은는이가을를의]$/u, '').trim()
  if (s.length < 1 || s.length > 60) return null
  if (/^(알림|일정|예약|날씨|브리핑|로또|회의)$/i.test(s)) return null
  return s
}
