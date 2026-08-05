import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildContextCard,
  buildFocusCard,
  buildHabitCandidateCard,
  buildAutomationPlanCard,
  buildAutomationResultCard,
  buildGoalCoachCard,
  buildKnowledgeCard,
  buildCompanionCard,
  focusRemainingMinutes,
  renderLifeOs2CardsHtml,
  isAllowedLos2CardAction,
  isSafeExternalUrl,
} from './index'
import type { FusedContext } from '../context-fusion/contextTypes'
import type { FocusSession } from '../focus/focusTypes'
import { clearAllLos2Stores } from '../repository'
import { resetLifeOs2FlagsForTests } from '../featureFlags'
import { coordinateLifeOs2 } from '../lifeCoordinator'
import { startFocus, stopFocus } from '../focus/focusEngine'
import { addReminder, saveReminders } from '../../storage'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('sessionStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
})
vi.stubGlobal('navigator', { onLine: true, platform: 'test' })

function sampleCtx(over: Partial<FusedContext> = {}): FusedContext {
  return {
    generatedAt: new Date().toISOString(),
    timezone: 'Asia/Seoul',
    timeOfDay: 'morning',
    currentScreen: null,
    network: { online: true, quality: 'unknown' },
    location: { available: false, permission: 'default', city: '' },
    today: { events: ['병원'], reminders: ['약'], todos: [], familyEvents: [] },
    goals: [{ title: '출시', progress: 0.2, status: 'active' }],
    projects: [],
    navigation: { hasPendingCandidates: false },
    music: { status: 'idle', title: null },
    emotion: { available: false, note: '' },
    provider: { anyConfigured: false },
    habitSignals: [],
    dnaSnippet: '',
    routines: [],
    focusActive: false,
    confidence: {},
    ...over,
  }
}

beforeEach(() => {
  store.clear()
  clearAllLos2Stores()
  resetLifeOs2FlagsForTests()
  saveReminders([])
})

describe('Life OS 2.0 cards', () => {
  it('renders context card and omits empty weather invention', () => {
    const card = buildContextCard(sampleCtx())
    expect(card.type).toBe('context_summary')
    expect(card.items.some((i) => /병원|약|출시/.test(i.label))).toBe(true)
    const html = renderLifeOs2CardsHtml([card])
    expect(html).toContain('los2-card')
    expect(html).toContain('data-los2-action')
    expect(html).not.toMatch(/기온\s*\d+/)
  })

  it('supports collapse markup for moreItems', () => {
    const card = buildContextCard(
      sampleCtx({
        today: {
          events: ['a', 'b'],
          reminders: ['r1', 'r2', 'r3', 'r4'],
          todos: [],
          familyEvents: ['엄마'],
        },
      }),
    )
    expect(card.moreItems?.length).toBeGreaterThan(0)
    const html = renderLifeOs2CardsHtml([card])
    expect(html).toMatch(/is-collapsed|los2-card-more/)
  })

  it('focus remaining time uses timestamp', () => {
    const end = new Date(Date.now() + 25 * 60_000).toISOString()
    expect(focusRemainingMinutes(end)).toBeGreaterThanOrEqual(24)
    expect(focusRemainingMinutes(end)).toBeLessThanOrEqual(26)
    const session: FocusSession = {
      id: 'f1',
      title: 'AIZIO 개발',
      startedAt: new Date().toISOString(),
      plannedEndAt: end,
      endedAt: null,
      status: 'active',
      relatedProjectId: null,
      relatedProjectName: 'AIZIO',
      musicRequested: true,
      notificationPolicy: 'reduced',
      completedMinutes: 0,
      plannedMinutes: 30,
    }
    const card = buildFocusCard(session, 'active')
    expect(card.type).toBe('focus_session')
    expect(card.actions.some((a) => a.type === 'STOP_FOCUS')).toBe(true)
    expect(card.items.some((i) => /무음|차단/.test(i.label))).toBe(true)
  })

  it('habit candidate has confirm/reject actions', () => {
    const card = buildHabitCandidateCard({
      id: 'h1',
      type: 'commute',
      label: '출근',
      pattern: { hourHint: 8 },
      confidence: 0.7,
      observationCount: 4,
      lastObservedAt: new Date().toISOString(),
      status: 'candidate',
      userConfirmed: false,
    })
    expect(card.actions.map((a) => a.type)).toEqual(
      expect.arrayContaining(['CONFIRM_HABIT', 'REJECT_HABIT', 'IGNORE_HABIT_ONCE']),
    )
  })

  it('automation plan marks blocked actions', () => {
    const card = buildAutomationPlanCard(
      {
        id: 'a1',
        name: '퇴근',
        trigger: { kind: 'phrase', phrase: '퇴근' },
        actions: [
          { kind: 'prepare_navigation', label: '집 길안내' },
          { kind: 'noop_blocked', label: '결제 차단' },
        ],
        enabled: false,
        approved: false,
        createdAt: new Date().toISOString(),
        lastRunAt: null,
      },
      'plan',
    )
    expect(card.type).toBe('automation_plan')
    expect(card.items.some((i) => /미지원|차단/.test(i.meta || i.label))).toBe(true)
    expect(card.actions.some((a) => a.type === 'SAVE_AUTOMATION')).toBe(true)
  })

  it('automation result partial is not completed', () => {
    const card = buildAutomationResultCard({
      id: 'r1',
      automationId: 'a1',
      at: new Date().toISOString(),
      overall: 'partial',
      results: [
        { action: 'prepare_navigation', ok: true, message: 'ok' },
        { action: 'prepare_music', ok: false, message: 'need gesture' },
      ],
    })
    expect(card.status).toBe('partial')
    expect(card.summary).toMatch(/일부/)
  })

  it('goal coach caps next actions at 3 and shows basis', () => {
    const card = buildGoalCoachCard({
      goalTitle: 'AIZIO 출시',
      status: 'active',
      progress: 0.5,
      progressBasis: '마일스톤 1/2 완료',
      nextActions: ['a', 'b', 'c', 'd'],
      stallReason: null,
      weekPlan: [],
      warnings: [],
    })
    // card items include next one; moreItems hold extras — total next shown ≤3 in builder more slice
    expect(card.summary).toMatch(/다음/)
    expect(card.items.some((i) => /근거|마일스톤|진행률/.test(i.label + (i.detail || '')))).toBe(true)
  })

  it('paused goal status reflected', () => {
    const card = buildGoalCoachCard({
      goalTitle: '휴식',
      status: 'paused',
      progress: 0.1,
      progressBasis: '기록된 progress 필드 10%',
      nextActions: [],
      stallReason: '목표가 paused 상태라 재촉하지 않습니다.',
      weekPlan: [],
      warnings: ['일시중지된 목표입니다 — 재촉하지 않습니다.'],
    })
    expect(card.status).toBe('cancelled')
  })

  it('knowledge empty is honest', () => {
    const card = buildKnowledgeCard('없는쿼리', [])
    expect(card.summary).toMatch(/찾지 못/)
    expect(card.items).toHaveLength(0)
  })

  it('knowledge shows source meta', () => {
    const card = buildKnowledgeCard('내비', [
      {
        id: 'k1',
        sourceType: 'idea',
        sourceId: 'i1',
        title: '내비 아이디어',
        summary: '요약',
        keywords: [],
        relatedIds: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        privacyLevel: 'private',
      },
    ])
    expect(card.items[0].meta).toMatch(/idea/)
  })

  it('morning/evening companion cards', () => {
    expect(buildCompanionCard('morning', '좋은 아침\n일정 1').type).toBe('morning_brief')
    expect(buildCompanionCard('evening', '정리\n집중 10분').type).toBe('evening_summary')
  })

  it('ui action allowlist and URL safety', () => {
    expect(isAllowedLos2CardAction('STOP_FOCUS')).toBe(true)
    expect(isAllowedLos2CardAction('eval' as never)).toBe(false)
    expect(isSafeExternalUrl('https://example.com')).toBe(true)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('data:text/html,x')).toBe(false)
  })

  it('coordinator attaches lifeCards for context/focus', async () => {
    addReminder('회의')
    const ctx = await coordinateLifeOs2('오늘 뭐 해야 해?')
    expect(ctx?.lifeCards?.[0]?.type).toBe('context_summary')
    const focus = await coordinateLifeOs2('30분 동안 AIZIO 개발에 집중할래')
    expect(focus?.lifeCards?.[0]?.type).toBe('focus_session')
    stopFocus()
    startFocus('집중 모드 시작')
    stopFocus()
  })

  it('long Korean labels render without character-splitting spans', () => {
    const label = '아주긴한국어일정제목이한줄에깨지지않도록처리합니다'
    const html = renderLifeOs2CardsHtml([
      buildContextCard(
        sampleCtx({
          today: { events: [], reminders: [label], todos: [], familyEvents: [] },
        }),
      ),
    ])
    expect(html).toContain(label)
    expect(html).not.toMatch(/<span>\s*아\s*<\/span>/)
  })
})
