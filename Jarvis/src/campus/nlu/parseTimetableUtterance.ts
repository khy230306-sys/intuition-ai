import { parseKoreanTime, parseKoreanWeekday } from '../id'

export type ParsedTimetableAdd = {
  weekday: number
  startTime: string
  endTime: string
  courseName: string
  room?: string
  professor?: string
}

function extractCourseName(text: string): string {
  // Prefer explicit 「X 수업 넣어/추가」
  const explicit =
    text.match(/([가-힣A-Za-z][가-힣A-Za-z0-9]{1,30})\s*(?:수업|강의)\s*(?:넣어|추가|등록|만들어)/)?.[1] ||
    text.match(/(?:수업|강의)\s*([가-힣A-Za-z][가-힣A-Za-z0-9]{1,30})\s*(?:넣어|추가|등록)/)?.[1]
  if (explicit && !/시|분|월|화|수|목|금|토|일|오전|오후/.test(explicit)) {
    return explicit.trim()
  }

  // After end-time marker 「…까지 NAME」
  const afterUntil = text.match(
    /까지\s*([가-힣A-Za-z][가-힣A-Za-z0-9_]{1,30})(?:\s*(?:수업|강의))?\s*(?:넣어|추가|등록|만들어)?/,
  )?.[1]
  if (afterUntil && !/^(시|분|반)$/.test(afterUntil)) return afterUntil.trim()

  // Strip temporal tokens then take remaining noun
  const stripped = text
    .replace(
      /(월요일|화요일|수요일|목요일|금요일|토요일|일요일|오전|오후|\d{1,2}\s*시(?:\s*(?:반|\d{1,2}\s*분))?|\d{1,2}:\d{2}|부터|까지|수업|강의|넣어\s*줘|추가해\s*줘|등록해\s*줘|만들어\s*줘|넣어|추가|등록|만들어)/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
  const token = stripped.split(' ').find((t) => /[가-힣A-Za-z]{2,}/.test(t))
  return (token || '').trim()
}

/**
 * Parse NL like: "월요일 10시부터 11시 반까지 자료구조 수업 넣어줘"
 */
export function parseTimetableAddUtterance(text: string): ParsedTimetableAdd | null {
  const t = text.trim()
  const weekday = parseKoreanWeekday(t)
  if (weekday === null) return null
  if (!/(수업|시간표|강의|넣어|추가|등록)/.test(t)) return null

  const range =
    t.match(
      /((?:오전|오후)?\s*\d{1,2}\s*시(?:\s*(?:반|\d{1,2}\s*분))?|\d{1,2}:\d{2})\s*(?:부터|~|-|–)\s*((?:오전|오후)?\s*\d{1,2}\s*시(?:\s*(?:반|\d{1,2}\s*분))?|\d{1,2}:\d{2})/,
    ) ||
    t.match(
      /((?:오전|오후)?\s*\d{1,2}\s*시(?:\s*(?:반|\d{1,2}\s*분))?)\s*[-~]\s*((?:오전|오후)?\s*\d{1,2}\s*시(?:\s*(?:반|\d{1,2}\s*분))?)/,
    )

  let startTime: string | null = null
  let endTime: string | null = null
  if (range) {
    startTime = parseKoreanTime(range[1])
    endTime = parseKoreanTime(range[2])
  } else {
    const one = t.match(/((?:오전|오후)?\s*\d{1,2}\s*시(?:\s*(?:반|\d{1,2}\s*분))?|\d{1,2}:\d{2})/)
    if (one) {
      startTime = parseKoreanTime(one[1])
      if (startTime) {
        const [h, m] = startTime.split(':').map(Number)
        const endM = h * 60 + m + 90
        endTime = `${String(Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`
      }
    }
  }
  if (!startTime || !endTime) return null

  const courseName = extractCourseName(t)
  if (!courseName || courseName.length < 2) return null

  const room = t.match(/(?:강의실|교실|호실)\s*([A-Za-z0-9가-힣\-]+)/)?.[1]
  const professor = t.match(/([가-힣]{2,5})\s*교수/)?.[1]

  return {
    weekday,
    startTime,
    endTime,
    courseName,
    room,
    professor,
  }
}
