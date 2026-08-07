import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AIE_VERSION,
  buildAieContext,
  buildAieDailyBrief,
  clearAieStorageForTests,
  computeRecommendations,
  decideNextFocus,
  DECISION_STEP_ORDER,
  filterByLearning,
  planActions,
  recordForgottenMemory,
  recordRecommendationsIgnored,
  SMART_PRIORITY_ORDER,
  aiePrepare,
} from './index'
import { saveLifeFlags, resetLifeFlagsForTests } from '../life-os/featureFlags'
import { addReminder, saveReminders } from '../storage'

const store = new Map<string, string>()
const session = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => store.clear(),
})

vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => session.get(key) ?? null,
  setItem: (key: string, value: string) => {
    session.set(key, value)
  },
  removeItem: (key: string) => {
    session.delete(key)
  },
  clear: () => session.clear(),
})

vi.stubGlobal('navigator', { onLine: true, platform: 'test' })

describe('AIZIO Intelligence Engine', () => {
  beforeEach(() => {
    store.clear()
    session.clear()
    clearAieStorageForTests()
    resetLifeFlagsForTests()
  })

  it('exports version and priority tables', () => {
    expect(AIE_VERSION).toMatch(/^\d+\.\d+/)
    expect(DECISION_STEP_ORDER[0]).toBe('STEP1_EMERGENCY')
    expect(DECISION_STEP_ORDER[8]).toBe('STEP9_RECOMMENDATION')
    expect(SMART_PRIORITY_ORDER[0]).toBe('hospital_appointment')
    expect(SMART_PRIORITY_ORDER[SMART_PRIORITY_ORDER.length - 1]).toBe('recommendation')
  })

  it('plans multi-task: schedule then music', () => {
    const plan = planActions('2시에 엄마 병원 예약하고 끝나면 조용한 음악 틀어줘')
    expect(plan.multiTask).toBe(true)
    expect(plan.tasks.length).toBeGreaterThanOrEqual(2)
    const kinds = plan.tasks.map((t) => t.kind)
    expect(kinds).toContain('calendar')
    expect(kinds).toContain('music')
    // calendar/family before music
    expect(kinds.indexOf('calendar')).toBeLessThan(kinds.indexOf('music'))
  })

  it('keeps single-task utterances as one task', () => {
    const plan = planActions('조용한 음악 틀어줘')
    expect(plan.multiTask).toBe(false)
    expect(plan.tasks).toHaveLength(1)
    expect(plan.tasks[0].kind).toBe('music')
  })

  it('does not split 오후 calendar creates (후 ≠ connector)', () => {
    for (const q of ['내일 오후 3시 회의 일정 추가해줘', '내일 오후 3시에 병원 일정 추가해줘']) {
      const plan = planActions(q)
      expect(plan.multiTask, q).toBe(false)
      expect(plan.tasks).toHaveLength(1)
      expect(plan.tasks[0].kind).toBe('calendar')
      expect(plan.tasks[0].text).toBe(q)
    }
  })

  it('builds context with time/date/network/skills', () => {
    const ctx = buildAieContext({ force: true })
    expect(ctx.time).toMatch(/\d+:\d+/)
    expect(ctx.date).toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(ctx.network.online).toBe(true)
    expect(ctx.availableSkills.length).toBeGreaterThan(0)
    expect(ctx.providerState).toBeTruthy()
  })

  it('decision: emergency first', () => {
    const ctx = buildAieContext({ force: true })
    const d = decideNextFocus({ text: '119 긴급 상황이에요', context: ctx })
    expect(d.step).toBe('STEP1_EMERGENCY')
  })

  it('decision: user command is STEP3', () => {
    const ctx = buildAieContext({ force: true })
    const d = decideNextFocus({ text: '메모 보여줘', context: ctx })
    expect(d.step).toBe('STEP3_USER_COMMAND')
  })

  it('recommendations respect proactive flag OFF by default', () => {
    saveReminders([])
    addReminder('병원 방문')
    const ctx = buildAieContext({ force: true })
    expect(computeRecommendations(ctx)).toHaveLength(0)
  })

  it('recommendations appear when proactive ON', () => {
    saveLifeFlags({ proactiveSuggestionsEnabled: true })
    saveReminders([])
    addReminder('엄마 병원')
    const ctx = buildAieContext({ force: true })
    const recs = computeRecommendations(ctx)
    expect(recs.some((r) => /일정|할 일/.test(r.message))).toBe(true)
  })

  it('learning suppresses ignored recommendations', () => {
    saveLifeFlags({ proactiveSuggestionsEnabled: true })
    const base = [
      {
        id: 'rec_a',
        kind: 'schedule',
        message: '오늘 일정이 있습니다.',
        priority: 70,
        sourceStep: 'STEP4_TODAY_SCHEDULE' as const,
        signalKey: 'schedule_today',
      },
    ]
    for (let i = 0; i < 5; i++) recordRecommendationsIgnored(['schedule_today'])
    expect(filterByLearning(base)).toHaveLength(0)
  })

  it('forgotten memories are not re-suggested', () => {
    saveLifeFlags({ proactiveSuggestionsEnabled: true })
    recordForgottenMemory('매운 음식')
    const filtered = filterByLearning([
      {
        id: 'rec_food',
        kind: 'dna',
        message: '매운 음식 관련 추천입니다.',
        priority: 50,
        sourceStep: 'STEP9_RECOMMENDATION',
        signalKey: 'dna_food',
      },
    ])
    expect(filtered).toHaveLength(0)
  })

  it('daily brief includes sections without inventing commute ETA', () => {
    const brief = buildAieDailyBrief({ includeLegacyMorning: false })
    expect(brief).toMatch(/Daily Brief|오늘 일정/)
    expect(brief).toMatch(/출근·이동/)
    expect(brief).toMatch(/미연결|예상 시간/)
  })

  it('aiePrepare multi-task flag', () => {
    const prep = aiePrepare({
      text: '병원 예약하고 조용한 음악 틀어줘',
      skipRecommend: true,
    })
    expect(prep.shouldRunMultiTask).toBe(true)
    expect(prep.decision.step).toBeTruthy()
  })

  it('offline context marks network offline', () => {
    vi.stubGlobal('navigator', { onLine: false, platform: 'test' })
    const ctx = buildAieContext({ force: true })
    expect(ctx.network.online).toBe(false)
    vi.stubGlobal('navigator', { onLine: true, platform: 'test' })
  })
})
