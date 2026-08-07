/**
 * Action Planner — split one utterance into ordered tasks.
 * Does not execute; Core Brain / legacy think() still run each segment.
 */

import type { AieActionPlan, AiePlannedTask, AieTaskKind } from './types'

// Note: bare 「후」 must NOT match inside 「오후」 — use word-ish boundaries.
const CONNECTOR =
  /\s*(?:그리고|그\s*다음|다음에|끝난\s*뒤|끝나면|한\s*뒤|하고\s*나서|하고|,|\n|(?:(?<=\s)|^)후(?:에)?(?=\s|$))\s*/i

function classifyKind(text: string): AieTaskKind {
  const t = text.toLowerCase()
  if (/음악|노래|틀어|재생|멈춰|pause|play|spotify|유튜브\s*뮤직/i.test(t)) return 'music'
  if (/예약|일정|캘린더|병원|미팅|회의|스케줄/i.test(t)) return 'calendar'
  if (/알림|리마인더|알려|깨워|알람/i.test(t)) return 'reminder'
  if (/길\s*안내|내비|가는\s*길|지도|네비|출발/i.test(t)) return 'navigation'
  if (/가족|엄마|아빠|아내|남편|아들|딸/i.test(t) && /일정|예약|연락|전화/i.test(t)) return 'family'
  if (/프로젝트|이슈|버그|태스크/i.test(t)) return 'project'
  if (/아이디어|메모해|적어/i.test(t)) return 'idea'
  if (/잘\s*자|굿나잇|출근|좋은\s*아침|루틴/i.test(t)) return 'routine'
  return 'chat'
}

function kindReason(kind: AieTaskKind): string {
  switch (kind) {
    case 'calendar':
      return '일정/예약 작업'
    case 'reminder':
      return '알림 작업'
    case 'music':
      return '음악 작업'
    case 'navigation':
      return '내비게이션 작업'
    case 'family':
      return '가족 관련 작업'
    case 'project':
      return '프로젝트 작업'
    case 'idea':
      return '아이디어/메모 작업'
    case 'routine':
      return '루틴 작업'
    default:
      return '일반 대화/기타'
  }
}

function orderBoost(kind: AieTaskKind): number {
  // schedule/reminders before music/chat
  const order: AieTaskKind[] = [
    'family',
    'calendar',
    'reminder',
    'navigation',
    'project',
    'routine',
    'idea',
    'music',
    'chat',
    'unknown',
  ]
  return order.indexOf(kind)
}

function splitSegments(text: string): string[] {
  const raw = text.trim()
  if (!raw) return []

  // Pattern: "A하고 B" / "A 끝나면 B"
  const parts = raw
    .split(CONNECTOR)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)

  if (parts.length >= 2) return parts

  // Fallback: "…하고 …틀어줘" without explicit connector match after first verb
  const andMatch = raw.match(/^(.+?(?:예약|알림|추가|등록|저장|적어)(?:해|해줘|해\s*줘)?)(?:\s*하고\s*)(.+)$/i)
  if (andMatch) {
    return [andMatch[1].trim(), andMatch[2].trim()].filter((s) => s.length >= 2)
  }

  return [raw]
}

/**
 * Build an action plan from user text.
 * Single-task utterances return multiTask=false with one task.
 */
export function planActions(text: string): AieActionPlan {
  const original = text.trim()
  const segments = splitSegments(original)
  const tasks: AiePlannedTask[] = segments.map((seg, i) => {
    const kind = classifyKind(seg)
    return {
      id: `task_${i + 1}`,
      order: i,
      kind,
      text: seg,
      reason: kindReason(kind),
    }
  })

  // Stable semantic order when multiple kinds present
  if (tasks.length >= 2) {
    tasks.sort((a, b) => orderBoost(a.kind) - orderBoost(b.kind) || a.order - b.order)
    tasks.forEach((t, i) => {
      t.order = i
      t.id = `task_${i + 1}`
    })
  }

  const multiTask =
    tasks.length >= 2 &&
    new Set(tasks.map((t) => t.kind)).size >= 2 &&
    // Avoid splitting ordinary long chat sentences with commas only
    (CONNECTOR.test(original) || /하고\s/.test(original))

  if (!multiTask) {
    return {
      original,
      multiTask: false,
      tasks: [
        {
          id: 'task_1',
          order: 0,
          kind: classifyKind(original),
          text: original,
          reason: kindReason(classifyKind(original)),
        },
      ],
    }
  }

  return { original, multiTask: true, tasks }
}

export function formatActionPlanSummary(plan: AieActionPlan): string {
  if (!plan.multiTask) return ''
  const lines = ['【작업 계획】', ...plan.tasks.map((t) => `${t.order + 1}. ${t.reason}: ${t.text}`)]
  return lines.join('\n')
}
