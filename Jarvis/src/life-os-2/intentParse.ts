/**
 * Life OS 2.0 intent parse — maps to CoreIntent strings.
 */

export type LifeOs2Parsed =
  | { intent: 'ask_current_context' }
  | { intent: 'ask_priority' }
  | { intent: 'ask_prediction' }
  | { intent: 'show_habits' }
  | { intent: 'confirm_habit' }
  | { intent: 'reject_habit' }
  | { intent: 'start_focus'; text: string }
  | { intent: 'stop_focus' }
  | { intent: 'focus_status' }
  | { intent: 'save_relationship'; text: string }
  | { intent: 'search_relationship'; text: string }
  | { intent: 'search_knowledge'; text: string }
  | { intent: 'create_automation'; text: string }
  | { intent: 'run_automation' }
  | { intent: 'stop_automation' }
  | { intent: 'goal_coaching'; text: string }
  | { intent: 'morning_brief' }
  | { intent: 'evening_summary' }
  | { intent: 'show_recommendations' }

export function parseLifeOs2Intent(text: string): LifeOs2Parsed | null {
  const t = text.trim()
  if (!t) return null

  if (/모닝\s*브리프|아침\s*브리프|morning\s*companion/i.test(t)) return { intent: 'morning_brief' }
  if (/저녁\s*요약|이브닝|evening\s*summary/i.test(t)) return { intent: 'evening_summary' }

  if (/집중\s*끝|집중\s*종료|집중\s*취소/.test(t)) return { intent: 'stop_focus' }
  if (/집중\s*모드\s*시작|집중\s*시작|분\s*동안.+집중|집중할래/.test(t)) {
    return { intent: 'start_focus', text: t }
  }
  if (/집중\s*기록|집중\s*상태|집중\s*현황/.test(t)) return { intent: 'focus_status' }

  if (/습관\s*확인|습관\s*승인/.test(t)) return { intent: 'confirm_habit' }
  if (/습관\s*거절|습관\s*거부/.test(t)) return { intent: 'reject_habit' }
  if (
    /습관\s*(보여|목록|후보)|^습관$/.test(t) ||
    /(?:출근\s*)?(?:Routine|루틴)\s*후보/.test(t) ||
    /Routine\s*후보\s*보여/.test(t)
  ) {
    return { intent: 'show_habits' }
  }

  if (/오늘\s*뭐\s*해야|현재\s*상황|컨텍스트/.test(t)) return { intent: 'ask_current_context' }
  if (/가장\s*중요한\s*일|우선순위/.test(t)) return { intent: 'ask_priority' }
  if (/예측|출발하면\s*여유|놓치기\s*쉬운|오래\s*멈춘\s*프로젝트/.test(t)) {
    return { intent: 'ask_prediction' }
  }

  if (/자동화\s*중지/.test(t)) return { intent: 'stop_automation' }
  if (/자동화\s*실행/.test(t)) return { intent: 'run_automation' }
  if (/자동화|퇴근하면.+길|퇴근하면.+음악/.test(t)) return { intent: 'create_automation', text: t }

  if (/목표.+(상황|코칭|다음|왜|계획)|다음\s*한\s*가지|이번\s*주\s*계획\s*짜/.test(t)) {
    return { intent: 'goal_coaching', text: t }
  }

  if (/관련\s*(일정|메모)|마지막\s*얘기/.test(t)) return { intent: 'search_relationship', text: t }
  if (/담당자야|외주\s*담당|동료야|거래처/.test(t)) return { intent: 'save_relationship', text: t }

  if (
    /지식\s*검색|통합\s*검색|예전에\s*.+?(?:얘기|내용)|아이디어\s*찾아|기록\s*검색|관련\s*.+?\s*모두\s*보여/.test(
      t,
    ) ||
    (
      /찾아줘|검색해줘/.test(t) &&
      /메모|프로젝트|아이디어|목표|타임라인|일정/.test(t) &&
      // Block map/nav asks, but allow 「네비게이션 관련 아이디어」 knowledge search
      !(/길\s*안내|지도\s*열어|내비\s*켜|네비\s*켜/.test(t) && !/아이디어|메모|기록/.test(t))
    )
  ) {
    return { intent: 'search_knowledge', text: t }
  }

  if (/제안\s*정책|프로액티브|추천\s*보여/.test(t)) return { intent: 'show_recommendations' }

  return null
}
