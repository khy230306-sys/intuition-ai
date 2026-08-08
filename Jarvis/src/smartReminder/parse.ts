import { matchRelation } from '../relationship/catalog'
import { parseAdvanceMinutes, parseScheduleDateTime } from './datetime'
import type { ReminderParseKind } from './types'

export type ReminderUtterance = {
  kind: ReminderParseKind
  title?: string
  personDisplay?: string
  personRelation?: string
  category?: string
  advanceMinutes?: number
  snoozeMinutes?: number
  raw: string
  hasScheduleCue: boolean
}

const SCHEDULE_CUES =
  /예약|진찰|병원|치과|약속|미팅|회의|알림|알람|알려|리마인더|일정|검진|수술|면회|픽업|데리러|맞춰|깨워/

export function parseReminderUtterance(raw: string): ReminderUtterance | null {
  const text = String(raw || '').trim()
  if (!text || text.length > 160) return null

  // How-to / explanation — never treat as reminder ("비행기 예약하는 방법 알려줘")
  if (/(예약하는\s*방법|예약하는\s*법|어떻게\s*예약|예약\s*방법|만드는\s*법|무슨\s*뜻)/.test(text)) {
    return null
  }

  // Definition / encyclopedia — never treat as reminder (even if pasted chat has 「13:28」)
  // Do NOT match bare 「뭐야」 — that also ends schedule asks like 「엄마 오늘 일정 뭐야?」
  if (
    /무슨\s*뜻|뜻이야|의미\s*(야|에요|인가요)|설명해\s*줘|정의해|정의가|뭐\s*뜻|what\s+is|who\s+is|mean\??$/i.test(
      text,
    )
  ) {
    return null
  }

  // Smart-reminder list only — do not steal 「가족 일정」(family space / calendar skill).
  if (
    /(?:스마트\s*)?알림\s*(목록|보여|리스트)|리마인더\s*(목록|보여|리스트)|저장된\s*알림/.test(text) ||
    (/일정\s*(전부|모두)\s*보여|전체\s*일정/.test(text) && /알림|예약|리마인더/.test(text))
  ) {
    return { kind: 'list', raw: text, hasScheduleCue: true }
  }

  if (/다음\s*(병원\s*)?예약|다음\s*일정/.test(text)) {
    const rel = matchRelation(text)
    return {
      kind: 'ask_next',
      raw: text,
      hasScheduleCue: true,
      personDisplay: rel?.display,
      personRelation: rel?.code,
    }
  }

  // “엄마 오늘 일정 뭐야?” — not “예약 있어”(create)
  // 「가족 일정」 alone → calendar / family space (return null); person relation required here.
  if (
    /일정\s*(뭐|알려|보여|있어\??)|예약\s*(뭐|언제)|다음\s*예약/.test(text) &&
    !/(시|분)\s*.*(예약|진찰|병원)|예약\s*있어/.test(text) &&
    !/^가족\s*일정|가족\s*일정\s*(보여|알려|전부|모두)/.test(text)
  ) {
    const rel = matchRelation(text)
    if (rel) {
      return {
        kind: 'ask_person',
        raw: text,
        hasScheduleCue: true,
        personDisplay: rel?.display,
        personRelation: rel?.code,
      }
    }
  }

  if (/^(취소해|취소해줘|일정\s*취소|알림\s*취소)/i.test(text) || /예약\s*취소|알림\s*취소/.test(text)) {
    return { kind: 'cancel', raw: text, hasScheduleCue: true }
  }

  // Require schedule cue — bare 「완료/봤어/확인했」 is casual chat, not reminder complete.
  if (
    /(?:알림|일정|예약|리마인더)\s*(?:완료|끝|체크)|(?:완료|끝)\s*(?:했어|처리)|체크\s*완료/.test(text) &&
    text.length < 36
  ) {
    return { kind: 'complete', raw: text, hasScheduleCue: true }
  }

  const snooze = text.match(/(\d+)\s*분\s*(?:뒤|후)\s*(?:다시\s*)?알려/)
  if (snooze || /다시\s*알려|스누즈|snooze/i.test(text)) {
    return {
      kind: 'snooze',
      raw: text,
      hasScheduleCue: true,
      snoozeMinutes: snooze ? parseInt(snooze[1], 10) : 10,
    }
  }

  const adv = parseAdvanceMinutes(text)
  if (adv != null && /(전에도|사전\s*알림|분\s*전.*알려)/.test(text) && text.length < 48) {
    // follow-up only advance, e.g. “30분 전에도 알려줘”
    return { kind: 'add_advance', raw: text, hasScheduleCue: true, advanceMinutes: adv }
  }

  if (/시간(?:을|를)?\s*(\d+)\s*시|(\d+)\s*시로\s*바꿔/.test(text)) {
    return { kind: 'update_time', raw: text, hasScheduleCue: true }
  }

  const dt = parseScheduleDateTime(text)
  const rel = matchRelation(text)
  const hasExplicitCue = SCHEDULE_CUES.test(text) || /알려줘|알림|리마인더|저장해|기록해/.test(text)
  const hasCue = hasExplicitCue || Boolean(dt)

  // Create: need a real schedule/reminder cue — bare 「13:28」 in pasted chat is not enough
  if ((dt && hasExplicitCue) || (rel && SCHEDULE_CUES.test(text))) {
    let title = text
      .replace(/(오늘|내일|모레|오전|오후|아침|저녁|\d+\s*시|\d+\s*분|매주|이번\s*주|다음\s*주)/g, ' ')
      .replace(/(월|화|수|목|금|토|일)요일/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (rel) {
      // Prefer “엄마 병원 진찰 예약”
      const short = text.match(
        new RegExp(`${rel.display}\\s*[가-힣A-Za-z\\s]{0,20}(?:예약|진찰|병원|치과|약속|검진)`),
      )
      if (short) title = short[0]!.replace(/\s+/g, ' ').trim()
      else if (!title.includes(rel.display)) title = `${rel.display} ${title}`.trim()
    }
    title = title.replace(/^(에|있어|해줘)\s*/, '').trim() || (rel ? `${rel.display} 일정` : '일정')

    let category: string | null = null
    if (/병원|진찰|검진|수술|치과/.test(text)) category = 'medical-appointment'
    else if (/약속|미팅|회의/.test(text)) category = 'appointment'

    return {
      kind: 'create',
      raw: text,
      hasScheduleCue: hasCue,
      title: title.slice(0, 60),
      personDisplay: rel?.display,
      personRelation: rel?.code,
      category: category || undefined,
      advanceMinutes: adv ?? undefined,
    }
  }

  // “30분 뒤에 약 먹으라고 알려줘”
  if (dt && /알려|알림|리마인더/.test(text)) {
    return {
      kind: 'create',
      raw: text,
      hasScheduleCue: true,
      title: text.replace(/\d+\s*분\s*(?:뒤|후)|알려줘|알림/g, ' ').replace(/\s+/g, ' ').trim() || '알림',
    }
  }

  return null
}

export function wantsSmartReminder(text: string): boolean {
  return parseReminderUtterance(text) !== null
}
