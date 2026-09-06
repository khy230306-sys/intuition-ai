import { parseTimetableAddUtterance, type ParsedTimetableAdd } from './parseTimetableUtterance'

export type CampusIntentKind =
  | 'open_campus'
  | 'campus_today'
  | 'campus_tomorrow'
  | 'campus_timetable_list'
  | 'campus_timetable_add'
  | 'campus_assignments'
  | 'campus_exams'
  | 'campus_urgent'
  | 'campus_summary'
  | 'campus_quiz'
  | 'campus_quiz_wrong'
  | 'campus_review'
  | 'campus_study_plan'
  | 'campus_email'
  | 'campus_search'
  | 'campus_focus'
  | 'campus_gpa'

export type CampusIntent = {
  kind: CampusIntentKind
  confidence: number
  courseHint?: string
  query?: string
  count?: number
  days?: number
  timetable?: ParsedTimetableAdd
  emailRequest?: string
}

/**
 * Dedicated Campus NLU — specific cues only to avoid stealing weather/todo/reminder.
 */
export function parseCampusIntent(text: string): CampusIntent | null {
  const t = text.trim()
  if (!t) return null

  // Open campus
  if (
    /캠퍼스\s*(열어|보여|가|켜)|campus\s*open|에이아이지오\s*캠퍼스|aizio\s*campus/i.test(t) ||
    /^캠퍼스$|^campus$/i.test(t)
  ) {
    return { kind: 'open_campus', confidence: 0.96 }
  }

  const tt = parseTimetableAddUtterance(t)
  if (tt && /(넣|추가|등록|만들어)/.test(t)) {
    return { kind: 'campus_timetable_add', confidence: 0.94, timetable: tt, courseHint: tt.courseName }
  }

  if (/내\s*시간표|시간표\s*(보여|알려|열어)|주간\s*시간표/.test(t)) {
    return { kind: 'campus_timetable_list', confidence: 0.93 }
  }

  if (/내일\s*수업|내일\s*강의|내일\s*뭐\s*들어/.test(t)) {
    return { kind: 'campus_tomorrow', confidence: 0.93 }
  }

  if (/오늘\s*수업|오늘\s*강의|오늘\s*뭐\s*들어|수업\s*뭐야/.test(t)) {
    return { kind: 'campus_today', confidence: 0.93 }
  }

  if (
    /이번\s*주\s*과제|과제\s*뭐\s*있|과제\s*있|남은\s*과제|캠퍼스\s*과제|[가-힣A-Za-z0-9_]{2,20}\s*과제/.test(
      t,
    )
  ) {
    const courseHint = t.match(/([가-힣A-Za-z0-9_]{2,20})\s*과제/)?.[1]
    return {
      kind: 'campus_assignments',
      confidence: 0.92,
      courseHint: courseHint && !/이번|남은|주/.test(courseHint) ? courseHint : undefined,
    }
  }

  if (/가장\s*급한|뭐\s*먼저|급한\s*게|우선순위/.test(t) && /(과제|시험|공부|수업)/.test(t)) {
    return { kind: 'campus_urgent', confidence: 0.9 }
  }

  if (/시험\s*공부|시험\s*준비|시험\s*대비/.test(t)) {
    return { kind: 'campus_review', confidence: 0.9 }
  }

  if (/시험까지\s*며칠|시험\s*디데이|중간고사|기말고사|시험\s*언제/.test(t)) {
    return { kind: 'campus_exams', confidence: 0.91 }
  }

  const plan = t.match(
    /([가-힣A-Za-z0-9_]{2,20})\s*시험까지\s*(\d{1,2})\s*일|(\d{1,2})\s*일\s*남.*계획/,
  )
  if (plan || (/계획\s*짜|공부\s*계획/.test(t) && /시험/.test(t))) {
    return {
      kind: 'campus_study_plan',
      confidence: 0.92,
      courseHint: plan?.[1],
      days: Number(plan?.[2] || plan?.[3] || 10),
    }
  }

  if (/지난\s*(수업|강의)\s*요약|강의\s*요약|수업\s*요약|요약해\s*줘/.test(t) && /(수업|강의|지난)/.test(t)) {
    const courseHint =
      t.match(/([가-힣A-Za-z0-9_]{2,20})\s*(?:지난|수업|강의)/)?.[1] ||
      t.match(/^([가-힣A-Za-z0-9_]{2,20})\s+/)?.[1]
    return { kind: 'campus_summary', confidence: 0.9, courseHint }
  }

  if (
    /틀린\s*(?:것|거|문제|것만)|오답|틀린\s*만|다시\s*내/.test(t) &&
    /(문제|퀴즈|풀|다시\s*내|오답)/.test(t)
  ) {
    const courseHint = t.match(/([가-힣A-Za-z0-9_]{2,20})\s*(?:문제|퀴즈|오답)/)?.[1]
    return { kind: 'campus_quiz_wrong', confidence: 0.92, courseHint, count: 5 }
  }

  const quiz = t.match(/([가-힣A-Za-z0-9_]{2,20})?\s*(?:문제|퀴즈)\s*(\d{1,2})\s*개|(?:문제|퀴즈)\s*(\d{1,2})\s*개\s*내/)
  if (quiz || (/문제\s*내|퀴즈\s*내|연습\s*문제/.test(t) && /(과목|수업|캠퍼스|자료구조|마케팅|영어)?/.test(t))) {
    if (/문제|퀴즈/.test(t)) {
      return {
        kind: 'campus_quiz',
        confidence: 0.9,
        courseHint: quiz?.[1] || t.match(/([가-힣A-Za-z0-9_]{2,20})\s*(?:문제|퀴즈)/)?.[1],
        count: Number(quiz?.[2] || quiz?.[3] || 5),
      }
    }
  }

  if (/먼저\s*공부|뭘\s*먼저|복습\s*추천|오늘\s*추천/.test(t)) {
    return { kind: 'campus_review', confidence: 0.9 }
  }

  if (/교수님께|교수(?:님)?(?:에게|한테)|이메일\s*(써|작성|초안)/.test(t)) {
    return { kind: 'campus_email', confidence: 0.9, emailRequest: t }
  }

  if (/학점\s*(계산|알려|평점)|GPA|졸업\s*학점/.test(t)) {
    return { kind: 'campus_gpa', confidence: 0.9 }
  }

  if (/집중\s*(타이머|공부)|포모도로|캠퍼스\s*포커스|focus\s*timer/i.test(t)) {
    return { kind: 'campus_focus', confidence: 0.9 }
  }

  // concept search-ish: "Tree가 뭐였지?"
  if (/가\s*뭐였|이\s*뭐였|찾아줘|검색/.test(t) && !/날씨|시세|환율/.test(t)) {
    const q =
      t.match(/([A-Za-z가-힣0-9_]{2,40})\s*(?:가|이)?\s*뭐였/)?.[1] ||
      t.match(/(?:찾아|검색)\s*([A-Za-z가-힣0-9_\s]{2,40})/)?.[1]
    if (q) return { kind: 'campus_search', confidence: 0.86, query: q.trim() }
  }

  return null
}
