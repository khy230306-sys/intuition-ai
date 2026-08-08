import { extractTodoTitle, isTodoCreateUtterance } from '../life/todoShopping'
import { extractKoreanDate, extractKoreanTime, extractReminderOffset } from './datetimeParse'
import type { LifeAssistantIntentResult } from './types'

function base(sourceText: string, partial: Partial<LifeAssistantIntentResult>): LifeAssistantIntentResult {
  const date = partial.date ?? extractKoreanDate(sourceText)
  const time = partial.time ?? extractKoreanTime(sourceText)
  const reminderOffset = partial.reminderOffset ?? extractReminderOffset(sourceText)
  const entities = {
    ...partial.extractedEntities,
    date: partial.extractedEntities?.date ?? date,
    time: partial.extractedEntities?.time ?? time,
    title: partial.extractedEntities?.title ?? partial.title,
    person: partial.extractedEntities?.person ?? partial.person,
    location: partial.extractedEntities?.location ?? partial.location,
    reminderOffset: partial.extractedEntities?.reminderOffset ?? reminderOffset,
  }
  return {
    intent: partial.intent || 'unknown',
    confidence: partial.confidence ?? 0.5,
    extractedEntities: entities,
    date: entities.date,
    time: entities.time,
    title: entities.title,
    person: entities.person,
    location: entities.location,
    reminderOffset: entities.reminderOffset,
    sourceText,
    requiresConfirmation: Boolean(partial.requiresConfirmation),
    missingFields: partial.missingFields || [],
    source: 'rules',
  }
}

function extractTitle(text: string, strip: RegExp): string | undefined {
  const cleaned = text
    .replace(strip, ' ')
    .replace(/오늘|내일|모레|오전|오후|아침|저녁|밤|\d+\s*시|\d+\s*분|에|을|를|해줘|해주세요|추가|등록|알려|보여/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length >= 2 ? cleaned.slice(0, 80) : undefined
}

function extractPerson(text: string): string | undefined {
  const m = text.match(/(엄마|아빠|아내|남편|아이|아들|딸|한영|부모님|[가-힣]{2,4})(?:이|가|의|을|를)?/)
  if (!m) return undefined
  if (/오늘|내일|일정|할일|주차|번역|요약/.test(m[1])) return undefined
  return m[1]
}

/**
 * High-coverage local rules for Korean life commands.
 * Returns null when confidence is too low (caller may try AI / fall through).
 */
export function classifyLifeAssistantRules(text: string): LifeAssistantIntentResult | null {
  const t = text.trim()
  if (!t || t.length > 240) return null

  // Camera / vision handoff
  if (
    /(이\s*)?(문서|사진|안내문|알림장).*(읽어|번역|일정|분석|저장)|이\s*사진\s*번역|안내문\s*준비물|카메라\s*(열어|켜)|사진\s*(찍어|분석)|음식\s*뭔지|준비물\s*안내문/.test(
      t,
    )
  ) {
    return base(t, { intent: 'camera.open', confidence: 0.93 })
  }

  // Translation mode
  if (/지금부터\s*번역\s*모드|번역\s*모드로\s*바꿔|통역\s*모드\s*(켜|시작)|번역\s*모드\s*(켜|시작)/.test(t)) {
    return base(t, { intent: 'translation.enable', confidence: 0.95 })
  }

  // Reply suggest
  const reply = t.match(/(?:이\s*문장(?:을|를)?\s*)?(?:자연스럽게\s*)?답장(?:해|추천)|답장\s*추천[:\s]*(.+)/)
  if (reply || /답장해줘|답장\s*만들어/.test(t)) {
    const replySource =
      t.match(/[「"'](.+?)[」"']/)?.[1] ||
      t.replace(/이\s*문장을?\s*|자연스럽게\s*|답장해줘|답장\s*추천해줘|답장\s*만들어줘/g, '').trim()
    return base(t, {
      intent: 'reply.suggest',
      confidence: 0.9,
      extractedEntities: { replySource: replySource || undefined },
      title: replySource || undefined,
      missingFields: replySource ? [] : ['replySource'],
      requiresConfirmation: !replySource,
    })
  }

  // Parking
  if (/주차\s*(위치|한\s*곳|한곳|메모).*(기억|저장)|주차\s*기억|주차했어|여기\s*주차/.test(t)) {
    // Longer tokens first so 「기억해줘」 is not split into 「기억해」+「줘」
    const afterRemember = t.match(/(?:기억해줘|저장해줘|기억해|저장해)\s*(.+)$/)?.[1]?.trim()
    const beforePark = t.match(/^(.+?)\s*주차/)?.[1]?.trim()
    const rawLoc =
      afterRemember ||
      t.match(/(?:위치|곳|장소|메모)(?:은|는)?\s*([^\s].*)$/)?.[1]?.replace(/기억해.*$|저장해.*$/, '').trim() ||
      (beforePark && !/^(오늘|내일|여기|내|나의)$/.test(beforePark) ? beforePark : undefined)
    const cleaned =
      rawLoc
        ?.replace(/^(해줘|주세요)\s*/, '')
        .replace(/^(줘|요)$/g, '')
        .trim() || undefined
    return base(t, {
      intent: 'parking.save',
      confidence: 0.94,
      location: cleaned,
      extractedEntities: { location: cleaned, note: cleaned },
    })
  }
  if (/주차\s*(위치|한\s*곳|한곳|메모).*(알려|어디|보여)|내가\s*주차|주차\s*어디/.test(t)) {
    return base(t, { intent: 'parking.read', confidence: 0.94 })
  }

  // Daily summary / briefing
  if (/오늘\s*하루\s*요약|하루\s*요약|데일리\s*브리핑|생활\s*브리핑|오늘\s*브리핑/.test(t)) {
    return base(t, { intent: 'daily.summary', confidence: 0.94 })
  }

  // Missed schedule
  if (/놓친\s*일정|미룬\s*일정|지나간\s*일정/.test(t)) {
    return base(t, {
      intent: 'calendar.read',
      confidence: 0.9,
      extractedEntities: { missedOnly: true },
    })
  }

  // Important week
  if (/이번\s*주\s*중요\s*일정|중요한\s*일정만/.test(t)) {
    return base(t, {
      intent: 'calendar.read',
      confidence: 0.9,
      extractedEntities: { importantOnly: true },
      date: extractKoreanDate(t),
    })
  }

  // Reminder — before family patterns so 「2시간 뒤 … 알려줘」 is not stolen
  if (
    (/(\d+\s*분|\d+\s*시간)\s*(뒤|후)/.test(t) && /알려|알림|리마인더|만들|잊지/.test(t)) ||
    (/약\s*먹/.test(t) && /알려|알림/.test(t)) ||
    (/알림\s*(설정|등록|추가|만들)/.test(t) && /(\d+\s*분|\d+\s*시간|시)/.test(t)) ||
    /잊지\s*않게\s*해/.test(t)
  ) {
    const title =
      extractTitle(t, /\d+\s*분\s*(뒤|후)|\d+\s*시간\s*(뒤|후)|알려줘|알림|해줘|리마인더|만들어줘|잊지\s*않게/g) ||
      '알림'
    return base(t, {
      intent: 'reminder.create',
      confidence: 0.94,
      title,
      reminderOffset: extractReminderOffset(t),
      missingFields: extractReminderOffset(t) || extractKoreanTime(t) ? [] : ['time'],
    })
  }

  // Family schedule create — 「한영이 하원 4시 반」「엄마 병원 다음 주 월요일」
  if (
    /(한영이?|엄마|아빠|아이|아들|딸).*(하원|하교|등교|등원|학원|병원|예방접종)/.test(t) ||
    /가족\s*일정/.test(t)
  ) {
    const person = extractPerson(t)
    const wantsWrite =
      /추가|등록|넣어|잡아|기억해|저장/.test(t) ||
      Boolean(extractKoreanTime(t) || extractKoreanDate(t))
    if (wantsWrite && !/보여|알려|목록|정리해줘$/.test(t)) {
      const title =
        extractTitle(t, /가족\s*일정|추가|등록|해줘|잡아|넣어/g) ||
        (/하원|하교/.test(t) ? '하원' : /병원/.test(t) ? '병원' : '가족 일정')
      const missing: string[] = []
      if (!extractKoreanDate(t) && !/오늘|내일|모레|다음|이번|[월화수목금토일]요일/.test(t))
        missing.push('date')
      return base(t, {
        intent: 'family.schedule.create',
        confidence: 0.9,
        title,
        person,
        date: extractKoreanDate(t),
        time: extractKoreanTime(t),
        missingFields: missing.slice(0, 1),
        requiresConfirmation: missing.length > 0,
      })
    }
    if (/가족\s*일정|보여|알려|목록/.test(t)) {
      return base(t, { intent: 'family.schedule.read', confidence: 0.92, person })
    }
  }

  // Tasks — sentence structure: 「할 일 X 추가」 before shopping keywords
  if (isTodoCreateUtterance(t)) {
    const title = extractTodoTitle(t)
    return base(t, {
      intent: 'task.create',
      confidence: 0.93,
      title,
      missingFields: title ? [] : ['title'],
      requiresConfirmation: !title,
    })
  }
  if (/할\s*일.*(우선|정리|보여|목록|알려)|오늘\s*해야\s*할\s*일|투두/.test(t)) {
    if (/추가|등록|넣/.test(t)) {
      const title = extractTitle(t, /할\s*일|추가|등록|해줘/g)
      return base(t, {
        intent: 'task.create',
        confidence: 0.9,
        title,
        missingFields: title ? [] : ['title'],
        requiresConfirmation: !title,
      })
    }
    return base(t, {
      intent: 'task.read',
      confidence: 0.92,
      extractedEntities: { priority: /우선/.test(t) },
    })
  }

  // Calendar create
  if (
    /(일정|예약)\s*(추가|등록|잡아|넣어)|병원\s*예약\s*추가|캘린더에\s*넣|이거\s*일정에\s*넣|일정\s*잡아|예약\s*넣어/.test(
      t,
    ) ||
    (/(병원|회의|약속)/.test(t) && /(추가|등록|잡아|넣어|기억해)/.test(t))
  ) {
    const title =
      extractTitle(t, /일정|예약|추가|등록|잡아|넣어|해줘|캘린더에|이거|기억해/g) ||
      (/병원/.test(t) ? '병원' : undefined)
    const missing: string[] = []
    if (!title) missing.push('title')
    // Ask only for date if missing — never invent a time
    if (!extractKoreanDate(t) && !/오늘|내일|모레|다음|이번|[월화수목금토일]요일/.test(t))
      missing.push('date')
    return base(t, {
      intent: 'calendar.create',
      confidence: 0.91,
      title,
      date: extractKoreanDate(t),
      time: extractKoreanTime(t),
      missingFields: missing.slice(0, 1),
      requiresConfirmation: missing.length > 0,
    })
  }

  // Calendar delete/update (「그 일정 취소해」 / 「아까 병원 일정 취소」)
  if (/(그\s*)?일정\s*(삭제|지워|취소)|일정\s*취소해|취소해/.test(t) && /일정|병원|약속/.test(t)) {
    const title = extractTitle(t, /그|아까|일정|삭제|지워|취소|해줘|해|말이야/g)
    const anaphora = /그거|그것|아까|그\s*일정|병원\s*일정/.test(t)
    const hasTitle = Boolean(title && title.length >= 2 && !/^(그거|그것|이거|아까)$/.test(title))
    return base(t, {
      intent: 'calendar.delete',
      confidence: 0.93,
      title: hasTitle ? title : anaphora ? '병원' : undefined,
      requiresConfirmation: !hasTitle && !anaphora,
      missingFields: hasTitle || anaphora ? [] : ['title'],
    })
  }
  // 「3시로 바꿔」「아 3시로」
  if (
    /(바꿔|변경|수정|옮겨)/.test(t) &&
    /(시|요일|일정|병원)/.test(t)
  ) {
    return base(t, {
      intent: 'calendar.update',
      confidence: 0.9,
      extractedEntities: {
        time: (() => {
          const m = t.match(/(오전|오후)?\s*(\d{1,2})\s*시/)
          if (!m) return undefined
          let h = Number(m[2])
          if (/오후/.test(t) && h < 12) h += 12
          if (/오전/.test(t) && h === 12) h = 0
          return `${String(h).padStart(2, '0')}:00`
        })(),
      },
      title: /병원/.test(t) ? '병원' : undefined,
      requiresConfirmation: false,
      missingFields: [],
    })
  }
  if (/일정\s*(수정|변경|옮겨)/.test(t)) {
    return base(t, {
      intent: 'calendar.update',
      confidence: 0.86,
      title: extractTitle(t, /일정|수정|변경|옮겨|해줘/g),
      requiresConfirmation: true,
      missingFields: ['title'],
    })
  }

  // Calendar read
  if (/오늘\s*일정|내일\s*일정|일정\s*(알려|보여|목록)|캘린더\s*(보여|알려)/.test(t)) {
    return base(t, { intent: 'calendar.read', confidence: 0.93 })
  }

  return null
}
