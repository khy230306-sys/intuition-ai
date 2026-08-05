import type { FusedContext } from '../context-fusion/contextTypes'
import type { Prediction } from '../prediction/predictionTypes'
import type { FocusSession } from '../focus/focusTypes'
import type { HabitRecord } from '../habits/habitTypes'
import type { AutomationV2, AutomationRun } from '../automation/automationTypes'
import type { CoachAdvice } from '../goal-coach/coachTypes'
import type { KnowledgeItem } from '../knowledge/knowledgeTypes'
import { los2Id, nowIso } from '../repository'
import type { LifeOs2UiCard, LifeOs2CardItem } from './cardTypes'

function itemsFromLines(lines: string[], prefix: string): LifeOs2CardItem[] {
  return lines.filter(Boolean).map((label, i) => ({ id: `${prefix}-${i}`, label }))
}

export function buildContextCard(ctx: FusedContext, mode: 'summary' | 'priority' | 'busy' = 'summary'): LifeOs2UiCard {
  const primary: LifeOs2CardItem[] = []
  const more: LifeOs2CardItem[] = []

  primary.push({ id: 'tod', label: `시간대 · ${ctx.timeOfDay}`, meta: ctx.timezone })
  if (ctx.today.events.length) {
    primary.push(...itemsFromLines(ctx.today.events.slice(0, 2), 'ev'))
    more.push(...itemsFromLines(ctx.today.events.slice(2), 'ev2'))
  }
  if (ctx.today.reminders.length) {
    const rem = ctx.today.reminders.filter((r) => !ctx.today.events.includes(r))
    primary.push(...itemsFromLines(rem.slice(0, 2), 'rem'))
    more.push(...itemsFromLines(rem.slice(2, 6), 'rem2'))
  }
  if (ctx.today.familyEvents.length) {
    more.push(...itemsFromLines(ctx.today.familyEvents.slice(0, 3), 'fam'))
  }
  const g = ctx.goals.find((x) => x.status === 'active')
  if (g) primary.push({ id: 'goal', label: `목표 · ${g.title}`, meta: `${Math.round(g.progress * 100)}%` })
  const stalled = ctx.projects.find((p) => p.status === 'active' && p.stalledDays >= 3)
  if (stalled) {
    primary.push({
      id: 'proj',
      label: `정체 프로젝트 · ${stalled.name}`,
      meta: `${stalled.stalledDays}일`,
    })
  }
  if (ctx.music.status && ctx.music.status !== 'idle') {
    more.push({ id: 'music', label: `음악 · ${ctx.music.status}`, detail: ctx.music.title || undefined })
  }
  if (ctx.navigation.hasPendingCandidates) {
    more.push({ id: 'nav', label: '내비게이션 · 후보 선택 대기' })
  }
  if (ctx.focusActive) more.push({ id: 'focus', label: '집중 모드 진행 중' })

  let title = '현재 상황'
  let summary = '등록된 일정을 바탕으로 정리했습니다.'
  if (mode === 'priority') {
    title = '우선순위'
    summary = primary[1]?.label || primary[0]?.label || '우선할 항목이 없습니다.'
  }
  if (mode === 'busy') {
    title = '오늘 일정 밀도'
    const n = ctx.today.reminders.length + ctx.today.events.length
    summary = n === 0 ? '등록된 일정·할 일이 없습니다.' : `등록 ${n}건 기준입니다.`
  }

  return {
    id: los2Id('card'),
    type: mode === 'priority' ? 'priority_recommendation' : 'context_summary',
    title,
    summary,
    status: 'info',
    items: primary.slice(0, 5),
    moreItems: more.length ? more : undefined,
    actions: [{ id: 'exp', type: 'TOGGLE_EXPAND', label: '자세히' }],
    metadata: { online: ctx.network.online, timeOfDay: ctx.timeOfDay },
    createdAt: nowIso(),
    collapsedByDefault: true,
  }
}

export function buildPredictionCards(preds: Prediction[]): LifeOs2UiCard[] {
  return preds.slice(0, 3).map((p) => ({
    id: los2Id('card'),
    type: 'prediction' as const,
    title: p.title,
    summary: `${p.reason} · 신뢰도 약 ${Math.round(p.confidence * 100)}%`,
    status: p.severity === 'urgent' ? ('failed' as const) : p.severity === 'warning' ? ('partial' as const) : ('info' as const),
    items: [{ id: 'r', label: p.reason }],
    actions: p.recommendedAction?.textHint
      ? [{ id: 'hint', type: 'SEND_HINT' as const, label: p.recommendedAction.label, payload: { hint: p.recommendedAction.textHint } }]
      : [],
    metadata: { predictionId: p.id, type: p.type },
    createdAt: p.createdAt,
    collapsedByDefault: true,
  }))
}

export function buildFocusCard(session: FocusSession | null, mode: 'active' | 'status' | 'ended'): LifeOs2UiCard {
  if (!session) {
    return {
      id: los2Id('card'),
      type: 'focus_session',
      title: '집중 모드',
      summary: '진행 중인 집중 세션이 없습니다.',
      status: 'info',
      items: [],
      actions: [{ id: 'start', type: 'SEND_HINT', label: '집중 시작', payload: { hint: '집중 모드 시작' } }],
      metadata: {},
      createdAt: nowIso(),
    }
  }
  const endMs = Date.parse(session.plannedEndAt)
  const remainMin = Number.isFinite(endMs) ? Math.max(0, Math.round((endMs - Date.now()) / 60_000)) : 0
  const items: LifeOs2CardItem[] = [
    { id: 'title', label: session.title },
    { id: 'start', label: `시작 ${session.startedAt.slice(11, 16)}` },
    { id: 'end', label: `예정 종료 ${session.plannedEndAt.slice(11, 16)}` },
  ]
  if (session.status === 'active') {
    items.push({ id: 'left', label: `남은 시간 약 ${remainMin}분`, meta: 'timestamp 기준' })
  } else {
    items.push({ id: 'done', label: `기록 ${session.completedMinutes}분` })
  }
  items.push({ id: 'os', label: 'OS 무음·알림 차단은 보장하지 않습니다.' })
  if (session.relatedProjectName) {
    items.push({ id: 'proj', label: `프로젝트 · ${session.relatedProjectName}` })
  }
  if (session.musicRequested) {
    items.push({ id: 'music', label: '음악 · 준비 안내만 (자동 재생 단정 없음)' })
  }

  const actions =
    session.status === 'active'
      ? [
          { id: 'stop', type: 'STOP_FOCUS' as const, label: '종료' },
          { id: 'exp', type: 'TOGGLE_EXPAND' as const, label: '자세히' },
        ]
      : [{ id: 'exp', type: 'TOGGLE_EXPAND' as const, label: '자세히' }]

  return {
    id: los2Id('card'),
    type: 'focus_session',
    title: mode === 'ended' ? '집중 종료' : '집중 모드',
    summary:
      session.status === 'active'
        ? `${session.title} · 약 ${remainMin}분 남음`
        : `${session.title} · ${session.completedMinutes}분`,
    status: session.status === 'active' ? 'active' : session.status === 'cancelled' ? 'cancelled' : 'completed',
    items: items.slice(0, 5),
    moreItems: items.slice(5),
    actions,
    metadata: {
      focusId: session.id,
      plannedEndAt: session.plannedEndAt,
      startedAt: session.startedAt,
      status: session.status,
    },
    createdAt: nowIso(),
    collapsedByDefault: false,
  }
}

export function buildHabitCandidateCard(habit: HabitRecord): LifeOs2UiCard {
  const hour = habit.pattern.hourHint != null ? `${habit.pattern.hourHint}시쯤` : '자주'
  return {
    id: los2Id('card'),
    type: 'habit_candidate',
    title: '습관 후보',
    summary: `${hour} 「${habit.label}」 패턴이 보여요. 저장할까요?`,
    status: 'ready',
    items: [{ id: 'h', label: habit.label, detail: '동의 전 자동 실행하지 않습니다.' }],
    actions: [
      { id: 'save', type: 'CONFIRM_HABIT', label: '습관으로 저장', payload: { habitId: habit.id, hint: habit.label } },
      { id: 'ignore', type: 'IGNORE_HABIT_ONCE', label: '이번만 무시', payload: { habitId: habit.id } },
      { id: 'reject', type: 'REJECT_HABIT', label: '다시 제안하지 않기', payload: { habitId: habit.id, hint: habit.label } },
    ],
    metadata: { habitId: habit.id },
    createdAt: nowIso(),
    collapsedByDefault: false,
  }
}

export function buildAutomationPlanCard(plan: AutomationV2, summaryText: string): LifeOs2UiCard {
  const items: LifeOs2CardItem[] = [
    {
      id: 'tr',
      label: `Trigger · ${plan.trigger.kind}${plan.trigger.phrase ? ` (${plan.trigger.phrase})` : ''}`,
    },
    ...plan.actions.map((a, i) => ({
      id: `a${i}`,
      label: `Action ${i + 1} · ${a.label}`,
      meta: a.kind === 'noop_blocked' ? '미지원/차단' : a.kind,
      detail:
        a.kind === 'prepare_navigation' || a.kind === 'prepare_music'
          ? '외부 앱·사용자 동작이 필요할 수 있음'
          : a.kind === 'noop_blocked'
            ? '이 Action은 실행되지 않습니다'
            : undefined,
    })),
    { id: 'perm', label: '권한 · 위치 도착 Trigger는 현재 미지원' },
  ]
  return {
    id: los2Id('card'),
    type: 'automation_plan',
    title: '자동화 실행 계획',
    summary: '저장 전에 계획을 확인하세요. 승인 전 실행하지 않습니다.',
    status: 'ready',
    items: items.slice(0, 5),
    moreItems: items.slice(5),
    actions: [
      { id: 'save', type: 'SAVE_AUTOMATION', label: '저장', payload: { hint: '자동화 저장' } },
      { id: 'cancel', type: 'CANCEL_AUTOMATION', label: '취소', payload: { hint: '자동화 중지' } },
      { id: 'exp', type: 'TOGGLE_EXPAND', label: '자세히' },
    ],
    metadata: { automationId: plan.id, draft: true, planText: summaryText.slice(0, 200) },
    createdAt: plan.createdAt,
    collapsedByDefault: false,
  }
}

export function buildAutomationResultCard(run: AutomationRun): LifeOs2UiCard {
  const items = run.results.map((r, i) => ({
    id: `r${i}`,
    label: `${r.action} — ${r.ok ? '성공' : '실패'}`,
    detail: r.message,
  }))
  return {
    id: los2Id('card'),
    type: 'automation_result',
    title: `자동화 실행 · ${run.overall}`,
    summary:
      run.overall === 'partial'
        ? '일부만 성공했습니다. 전체를 성공으로 표시하지 않습니다.'
        : run.overall === 'success'
          ? '요청한 Action을 처리했습니다.'
          : '자동화 실행에 문제가 있었습니다.',
    status: run.overall === 'success' ? 'completed' : run.overall === 'partial' ? 'partial' : 'failed',
    items,
    actions: [
      { id: 'stop', type: 'CANCEL_AUTOMATION', label: '자동화 중지', payload: { hint: '자동화 중지' } },
    ],
    metadata: { runId: run.id, automationId: run.automationId, overall: run.overall },
    createdAt: run.at,
  }
}

export function buildGoalCoachCard(advice: CoachAdvice): LifeOs2UiCard {
  const items: LifeOs2CardItem[] = [
    { id: 'p', label: `진행률 ${Math.round(advice.progress * 100)}%`, detail: advice.progressBasis },
    { id: 's', label: `상태 · ${advice.status}` },
  ]
  if (advice.nextActions[0]) {
    items.push({ id: 'next', label: `다음 한 가지 · ${advice.nextActions[0]}`, meta: '우선' })
  }
  const more = advice.nextActions.slice(1, 3).map((a, i) => ({ id: `n${i}`, label: a }))
  if (advice.stallReason) more.push({ id: 'stall', label: advice.stallReason })
  more.push(...advice.weekPlan.slice(0, 3).map((w, i) => ({ id: `w${i}`, label: w })))
  more.push(...advice.warnings.map((w, i) => ({ id: `warn${i}`, label: w })))

  return {
    id: los2Id('card'),
    type: 'goal_coach',
    title: `Goal Coach · ${advice.goalTitle}`,
    summary: advice.nextActions[0] ? `다음: ${advice.nextActions[0]}` : '다음 행동이 없습니다.',
    status: advice.status === 'paused' ? 'cancelled' : 'info',
    items,
    moreItems: more.length ? more : undefined,
    actions: [{ id: 'exp', type: 'TOGGLE_EXPAND', label: '자세히' }],
    metadata: { goal: advice.goalTitle, progress: advice.progress },
    createdAt: nowIso(),
    collapsedByDefault: true,
  }
}

export function buildKnowledgeCard(query: string, items: KnowledgeItem[]): LifeOs2UiCard {
  if (!items.length) {
    return {
      id: los2Id('card'),
      type: 'knowledge_results',
      title: '지식 검색',
      summary: '저장된 내용에서 찾지 못했어요.',
      status: 'info',
      items: [],
      actions: [],
      metadata: { query, hits: 0 },
      createdAt: nowIso(),
    }
  }
  const rows = items.slice(0, 8).map((k, i) => ({
    id: `k${i}`,
    label: k.title,
    detail: k.summary.slice(0, 100),
    meta: `${k.sourceType} · ${k.createdAt.slice(0, 10)}`,
  }))
  return {
    id: los2Id('card'),
    type: 'knowledge_results',
    title: `지식 검색 · ${query}`,
    summary: `${items.length}건 (출처 표시)`,
    status: 'ready',
    items: rows.slice(0, 3),
    moreItems: rows.slice(3),
    actions: [{ id: 'exp', type: 'TOGGLE_EXPAND', label: '더 보기' }],
    metadata: { query, hits: items.length },
    createdAt: nowIso(),
    collapsedByDefault: true,
  }
}

export function buildCompanionCard(kind: 'morning' | 'evening', text: string): LifeOs2UiCard {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const body = lines.slice(1)
  const items = body.slice(0, 5).map((label, i) => ({ id: `c${i}`, label }))
  const more = body.slice(5, 12).map((label, i) => ({ id: `cm${i}`, label }))
  return {
    id: los2Id('card'),
    type: kind === 'morning' ? 'morning_brief' : 'evening_summary',
    title: kind === 'morning' ? 'Morning Brief' : 'Evening Summary',
    summary: lines[0] || (kind === 'morning' ? '좋은 아침입니다.' : '오늘 하루 요약'),
    status: 'info',
    items,
    moreItems: more.length ? more : undefined,
    actions: more.length ? [{ id: 'exp', type: 'TOGGLE_EXPAND', label: '펼쳐보기' }] : [],
    metadata: { kind },
    createdAt: nowIso(),
    collapsedByDefault: true,
  }
}

export function buildUnavailableCard(title: string, summary: string): LifeOs2UiCard {
  return {
    id: los2Id('card'),
    type: 'unavailable',
    title,
    summary,
    status: 'info',
    items: [],
    actions: [],
    metadata: {},
    createdAt: nowIso(),
  }
}

export function buildWarningCard(title: string, summary: string): LifeOs2UiCard {
  return {
    id: los2Id('card'),
    type: 'warning',
    title,
    summary,
    status: 'partial',
    items: [],
    actions: [],
    metadata: {},
    createdAt: nowIso(),
  }
}

export { focusRemainingMinutes } from './cardRender'
