import { lifeId, nowIso } from '../types'
import type { MeetingPerspective, MeetingResult, MeetingRole } from './meetingTypes'

const LABELS: Record<MeetingRole, string> = {
  planning: '기획',
  engineering: '개발',
  ux: 'UX',
  security: '보안',
  ops: '운영·비용',
  qa: '검수',
}

/** Local structured perspectives — no multi-provider fan-out. */
export function composeLocalMeeting(topic: string): MeetingResult {
  const t = topic.trim() || '주제'
  const perspectives: MeetingPerspective[] = (
    Object.keys(LABELS) as MeetingRole[]
  ).map((role) => ({
    role,
    label: LABELS[role],
    points: localPoints(role, t),
  }))
  return {
    id: lifeId('meet'),
    topic: t,
    summary: t,
    perspectives,
    dissent: [
      '범위가 넓으면 일정이 늘어날 수 있습니다.',
      '외부 연동 없이 “완성”처럼 보이면 신뢰가 떨어집니다.',
    ],
    conclusion: `「${t}」는 로컬 템플릿 검토입니다. 실제 AI 회의를 원하면 설정에서 AI Provider를 연결하세요.`,
    nextActions: [
      '핵심 사용자 시나리오 1개 확정',
      'MVP 범위 문서화',
      '위험 요소 체크리스트 작성',
    ],
    usedAi: false,
    providerNote: 'AI Provider 미사용 — 로컬 역할 템플릿',
    createdAt: nowIso(),
  }
}

function localPoints(role: MeetingRole, topic: string): string[] {
  switch (role) {
    case 'planning':
      return [`${topic}의 목표 사용자를 명확히 하세요.`, '성공 지표를 숫자로 정의하세요.']
    case 'engineering':
      return ['기존 Core Brain/Skill에 붙일지 독립 모듈인지 결정하세요.', '오프라인·로컬 저장 우선을 유지하세요.']
    case 'ux':
      return ['홈을 복잡하게 만들지 말고 대화 카드로 결과를 보여 주세요.', '모바일 터치 영역을 확보하세요.']
    case 'security':
      return ['민감정보는 DNA/내보내기에서 차단하세요.', '원격 코드 실행형 Skill은 금지하세요.']
    case 'ops':
      return ['외부 API 호출을 최소화하세요.', 'Feature Flag로 롤백 가능하게 하세요.']
    case 'qa':
      return ['단위 테스트와 회귀(대화·음성·음악)를 통과시키세요.', '미연결 기능을 완성으로 표시하지 마세요.']
  }
}

export function formatMeeting(result: MeetingResult): string {
  const lines = [
    '【AI 회의】',
    `주제: ${result.topic}`,
    `방식: ${result.providerNote}`,
    '',
    '1. 요청 요약',
    result.summary,
  ]
  let n = 2
  for (const p of result.perspectives) {
    lines.push('', `${n}. ${p.label} 관점`)
    for (const pt of p.points) lines.push(`• ${pt}`)
    n++
  }
  lines.push('', `${n}. 반대 의견`)
  for (const d of result.dissent) lines.push(`• ${d}`)
  n++
  lines.push('', `${n}. 공통 결론`, result.conclusion)
  n++
  lines.push('', `${n}. 다음 행동`)
  for (const a of result.nextActions) lines.push(`• ${a}`)
  return lines.join('\n')
}

/**
 * Optional single AI call — caller supplies already-fetched text.
 * Never loops multiple providers here.
 */
export function mergeAiMeetingOverlay(
  base: MeetingResult,
  aiText: string | null,
): MeetingResult {
  if (!aiText?.trim()) return base
  return {
    ...base,
    usedAi: true,
    providerNote: '단일 AI 응답 반영 (다중 Provider 병렬 호출 없음)',
    conclusion: aiText.trim().slice(0, 1200),
  }
}
