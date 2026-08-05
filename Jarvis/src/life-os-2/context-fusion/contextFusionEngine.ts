import { isLifeOs2Enabled } from '../featureFlags'
import { loadLos2Privacy } from '../privacyBoundary'
import { emitLifeOs2Event } from '../lifeEventBus'
import { los2Log } from '../logger'
import { loadItems, LOS2_KEYS } from '../repository'
import type { FocusSession } from '../focus/focusTypes'
import { getCachedContext, invalidateContextCache, setCachedContext, shouldDebounce } from './contextCache'
import {
  onlineNow,
  readCity,
  readDna,
  readFamily,
  readGoals,
  readMusic,
  readNavPending,
  readProjects,
  readProvider,
  readReminders,
  readRoutines,
  readTodos,
  timeOfDay,
  timezoneNow,
} from './contextSources'
import type { ContextFusionOptions, FusedContext } from './contextTypes'
import { overallConfidence } from './contextConfidence'

export { invalidateContextCache }

export function fuseContext(opts?: ContextFusionOptions): FusedContext | null {
  if (!isLifeOs2Enabled('contextFusionEnabled')) return null
  if (!loadLos2Privacy().recordContext && !opts?.force) {
    // Still allow on-demand fusion for explicit user asks
  }

  if (!opts?.force) {
    if (shouldDebounce()) {
      const c = getCachedContext()
      if (c) return c
    }
    const cached = getCachedContext()
    if (cached) return cached
  }

  const rem = readReminders()
  const todos = readTodos()
  const goals = readGoals()
  const projects = readProjects()
  const family = readFamily()
  const music = readMusic()
  const provider = readProvider()
  const city = readCity()

  let focusActive = false
  try {
    const sessions = loadItems<FocusSession>(LOS2_KEYS.focus)
    focusActive = sessions.some((s) => s.status === 'active')
  } catch {
    focusActive = false
  }

  const ctx: FusedContext = {
    generatedAt: new Date().toISOString(),
    timezone: timezoneNow(),
    timeOfDay: timeOfDay(),
    currentScreen: opts?.activeView || null,
    network: { online: onlineNow(), quality: 'unknown' },
    location: {
      available: Boolean(city),
      permission: 'default',
      city,
    },
    today: {
      events: rem.items.filter((t) => /일정|예약|미팅|회의|병원/.test(t)),
      reminders: rem.items,
      todos: todos.items,
      familyEvents: family.familyEvents,
    },
    goals: goals.goals,
    projects: projects.projects,
    navigation: { hasPendingCandidates: readNavPending() },
    music: music.music,
    emotion: {
      available: false,
      note: 'Emotion Engine 미구현 — 감정 상태를 확정하지 않습니다.',
    },
    provider: provider.provider,
    habitSignals: [],
    dnaSnippet: readDna(),
    routines: readRoutines(),
    focusActive,
    confidence: {
      reminders: rem.conf,
      todos: todos.conf,
      goals: goals.conf,
      projects: projects.conf,
      family: family.conf,
      music: music.conf,
      provider: provider.conf,
    },
  }

  setCachedContext(ctx)
  emitLifeOs2Event('context.fused', { overall: overallConfidence(ctx) })
  los2Log('debug', 'context.fused', { overall: overallConfidence(ctx) })
  return ctx
}

export function formatFusedContextSummary(ctx?: FusedContext | null): string {
  const c = ctx ?? fuseContext({ force: true })
  if (!c) return 'Context Fusion이 꺼져 있습니다.'

  const lines = ['【Context Fusion】', `${c.timeOfDay} · ${c.timezone} · ${c.network.online ? '온라인' : '오프라인'}`]
  if (c.location.city) lines.push(`도시: ${c.location.city}`)
  if (c.today.reminders.length) lines.push(`오늘 할 일·알림: ${c.today.reminders.slice(0, 5).join(' · ')}`)
  else lines.push('오늘 할 일·알림: (없음)')
  const activeGoals = c.goals.filter((g) => g.status === 'active')
  if (activeGoals.length) {
    lines.push(
      `목표: ${activeGoals
        .slice(0, 3)
        .map((g) => `${g.title} ${Math.round(g.progress * 100)}%`)
        .join(', ')}`,
    )
  }
  const activeProj = c.projects.filter((p) => p.status === 'active')
  if (activeProj.length) {
    lines.push(
      `프로젝트: ${activeProj
        .slice(0, 3)
        .map((p) => `${p.name}${p.stalledDays >= 3 ? `(${p.stalledDays}일 정체)` : ''}`)
        .join(', ')}`,
    )
  }
  if (c.today.familyEvents.length) lines.push(`가족: ${c.today.familyEvents.slice(0, 3).join(', ')}`)
  if (c.focusActive) lines.push('집중 모드: 진행 중')
  lines.push(`신뢰도(평균): ${overallConfidence(c)}`)
  lines.push('없는 항목은 만들지 않았습니다.')
  return lines.join('\n')
}

export function answerPriorityQuestion(ctx?: FusedContext | null): string {
  const c = ctx ?? fuseContext({ force: true })
  if (!c) return 'Context Fusion이 꺼져 있습니다.'

  const stalled = c.projects.find((p) => p.status === 'active' && p.stalledDays >= 3)
  if (c.today.events.length) {
    return `지금 가장 중요한 후보: 일정·예약 「${c.today.events[0]}」입니다. (확정이 아니라 등록 데이터 기준입니다.)`
  }
  if (c.today.reminders.length) {
    return `지금 가장 중요한 후보: 할 일 「${c.today.reminders[0]}」입니다.`
  }
  if (stalled) {
    return `지금 가장 중요한 후보: 정체 프로젝트 「${stalled.name}」(${stalled.stalledDays}일)입니다.`
  }
  const g = c.goals.find((x) => x.status === 'active')
  if (g) return `지금 가장 중요한 후보: 목표 「${g.title}」 다음 행동입니다.`
  return '등록된 일정·할 일·활성 목표가 없어 우선순위를 정하지 않았습니다.'
}

export function answerBusyToday(ctx?: FusedContext | null): string {
  const c = ctx ?? fuseContext({ force: true })
  if (!c) return 'Context Fusion이 꺼져 있습니다.'
  const n = c.today.reminders.length + c.today.events.length
  if (n === 0) return '오늘 등록된 일정·할 일이 없어 바쁘다고 판단하지 않았습니다.'
  if (n >= 5) return `오늘 등록된 항목이 ${n}건입니다. 꽤 바쁜 편으로 보입니다.`
  if (n >= 2) return `오늘 등록된 항목이 ${n}건입니다. 보통 수준으로 보입니다.`
  return `오늘 등록된 항목이 ${n}건입니다.`
}
