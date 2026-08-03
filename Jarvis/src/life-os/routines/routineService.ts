import { appendAudit } from '../auditLog'
import { emitLifeEvent } from '../lifeEventBus'
import { nextActions } from '../goals/goalService'
import { loadStoreList, saveStoreList } from '../lifeRepository'
import { lifeId, nowIso } from '../types'
import { buildAction, isActionAllowed } from './automationPolicy'
import type { RoutineActionId, RoutineRecord, RoutineRunResult } from './routineTypes'

const KEY = 'aizio_life_routines_v1'
const SCHEMA = 1

const DEFAULTS: Array<Omit<RoutineRecord, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: '잘 자',
    triggerPhrases: ['잘 자', '잘자', '굿나잇', 'good night'],
    actions: [
      buildAction('summarize_tomorrow'),
      buildAction('check_sleep_reminder'),
      buildAction('prepare_calm_music'),
    ],
    enabled: true,
  },
  {
    name: '좋은 아침',
    triggerPhrases: ['좋은 아침', '굿모닝', 'good morning'],
    actions: [
      buildAction('today_schedule'),
      buildAction('today_todos'),
      buildAction('family_schedule'),
      buildAction('goal_next_actions'),
      buildAction('weather_if_available'),
    ],
    enabled: true,
  },
  {
    name: '출근',
    triggerPhrases: ['출근', '출근이야'],
    actions: [buildAction('today_schedule'), buildAction('today_todos'), buildAction('prepare_calm_music')],
    enabled: true,
  },
]

export function ensureDefaultRoutines(): RoutineRecord[] {
  let items = loadStoreList<RoutineRecord>(KEY, SCHEMA)
  if (!items.length) {
    const now = nowIso()
    items = DEFAULTS.map((d) => ({
      ...d,
      id: lifeId('rtn'),
      createdAt: now,
      updatedAt: now,
    }))
    saveStoreList(KEY, SCHEMA, items, 40)
  }
  return items
}

export function findRoutineByPhrase(text: string): RoutineRecord | null {
  const t = text.trim().toLowerCase()
  return (
    ensureDefaultRoutines().find(
      (r) => r.enabled && r.triggerPhrases.some((p) => t === p.toLowerCase() || t.includes(p.toLowerCase())),
    ) || null
  )
}

export function previewRoutine(routine: RoutineRecord): string {
  return [
    `【Routine 계획 · ${routine.name}】`,
    '저장·실행 전 계획입니다. 위험 Action은 포함되지 않습니다.',
    ...routine.actions.map((a) => `• ${a.label}${a.allowed ? '' : ' (차단)'}`),
  ].join('\n')
}

export function runRoutine(routine: RoutineRecord): RoutineRunResult {
  const results: RoutineRunResult['results'] = []
  for (const action of routine.actions) {
    if (!action.allowed || !isActionAllowed(action.id)) {
      results.push({ actionId: action.id, ok: false, detail: '정책상 차단된 Action' })
      continue
    }
    results.push(executeLocalAction(action.id))
  }
  const allOk = results.every((r) => r.ok)
  emitLifeEvent('routine.ran', { id: routine.id, allOk })
  appendAudit('routine.run', `${routine.name}:${allOk ? 'ok' : 'partial'}`)
  return { routineId: routine.id, results, allOk }
}

function executeLocalAction(id: RoutineActionId): {
  actionId: RoutineActionId
  ok: boolean
  detail: string
} {
  switch (id) {
    case 'summarize_tomorrow':
      return { actionId: id, ok: true, detail: '내일 일정 요약 슬롯 준비됨(로컬).' }
    case 'check_sleep_reminder':
      return { actionId: id, ok: true, detail: '취침 알림 설정을 확인해 주세요.' }
    case 'prepare_calm_music':
      return { actionId: id, ok: true, detail: '「잔잔한 음악 틀어줘」로 재생을 요청할 수 있어요.' }
    case 'today_schedule':
      return { actionId: id, ok: true, detail: '오늘 일정은 생활/가족 탭 또는 「오늘 일정」으로 확인하세요.' }
    case 'today_todos':
      return { actionId: id, ok: true, detail: '할 일은 생활 탭에서 확인하세요.' }
    case 'family_schedule':
      return { actionId: id, ok: true, detail: '가족 일정은 로컬 가족 공간 기준입니다(서버 실시간 공유 미연결).' }
    case 'goal_next_actions': {
      const next = nextActions(3)
      return {
        actionId: id,
        ok: true,
        detail: next.length ? next.join(' / ') : '활성 목표의 다음 행동이 없습니다.',
      }
    }
    case 'weather_if_available':
      return {
        actionId: id,
        ok: true,
        detail: '날씨는 「오늘 날씨」로 요청하세요. 여기서 자동 호출하지 않습니다.',
      }
    default:
      return { actionId: id, ok: false, detail: '알 수 없는 Action' }
  }
}

export function formatRoutineRun(run: RoutineRunResult, name: string): string {
  const lines = [
    `【Routine 실행 · ${name}】`,
    run.allOk ? '결과: 허용된 Action 모두 처리' : '결과: 일부 실패/안내 — 전체 성공으로 보지 마세요',
    ...run.results.map((r) => `${r.ok ? '✓' : '✗'} ${r.actionId}: ${r.detail}`),
  ]
  return lines.join('\n')
}
