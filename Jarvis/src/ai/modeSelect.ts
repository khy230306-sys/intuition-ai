import type { AiMode } from './types'
import { isKnowledgeQuestion } from '../encyclopedia/queryParse'

/**
 * Infer request mode from Korean/English user text.
 * Ambiguous → chat.
 */
export function selectAiMode(text: string): AiMode {
  const t = text.trim()
  if (!t) return 'chat'

  if (isKnowledgeQuestion(t)) return 'knowledge'

  if (
    /코드|버그|오류|에러|리팩터|리팩토|타입스크립트|typescript|javascript|python|함수|컴포넌트|빌드\s*실패|스택\s*트레이스|stack\s*trace|pr\b|pull\s*request|git\s*diff|테스트\s*작성|unit\s*test|css|html|api\s*설계|구현해|고쳐|수정해|디버그/i.test(
      t,
    )
  ) {
    return 'coding'
  }

  if (
    /계획|플랜|로드맵|단계\s*로|체크리스트|우선순위|일정\s*짜|목표\s*세|어떻게\s*진행|다음\s*할\s*일|마일스톤|스프린트|todo\s*list|breakdown/i.test(
      t,
    )
  ) {
    return 'planning'
  }

  if (
    /분석|비교|장단점|위험|리스크|평가|검토|왜\s*그런|근거|pros\s*and\s*cons|trade-?off|원인\s*분석|리뷰해/i.test(
      t,
    )
  ) {
    return 'analysis'
  }

  return 'chat'
}
