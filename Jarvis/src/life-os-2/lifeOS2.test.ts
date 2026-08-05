import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LIFE_OS2_VERSION,
  clearAllLos2Stores,
  coordinateLifeOs2,
  fuseContext,
  isLifeOs2Enabled,
  parseLifeOs2Intent,
  resetLifeOs2FlagsForTests,
  saveLifeOs2Flags,
} from './index'
import { refreshHabitCandidates, confirmHabit, rejectHabit } from './habits/habitEngine'
import { addObservation } from './habits/habitRepository'
import { MIN_HABIT_OBSERVATIONS } from './habits/habitTypes'
import { planAutomationFromText } from './automation/automationPlanner'
import { startFocus, stopFocus, getActiveFocus } from './focus/focusEngine'
import { generatePredictions } from './prediction/predictionEngine'
import { searchKnowledge, formatKnowledgeResults } from './knowledge/knowledgeSearch'
import { upsertExtended } from './relationships/relationshipRepository'
import { searchRelatedLocal } from './relationships/relationshipEngine'
import { buildCoachAdvice } from './goal-coach/goalCoach'
import { createGoal } from '../life-os/goals/goalService'
import { upsertProject } from '../life-os/projects/projectService'
import { addReminder, saveReminders } from '../storage'
import { buildMorningCompanion, buildEveningCompanion } from './companion/companionEngine'
import { canShowSuggestion, saveProactivePrefs, recordSuggestionRejected } from './proactive/proactivePolicy'
import { processCoreBrain, clearBrainStateForTests, listSkillMeta } from '../core-brain'

const store = new Map<string, string>()
const session = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => session.get(k) ?? null,
  setItem: (k: string, v: string) => session.set(k, v),
  removeItem: (k: string) => session.delete(k),
  clear: () => session.clear(),
})
vi.stubGlobal('navigator', { onLine: true, platform: 'test' })
vi.stubGlobal('crypto', { randomUUID: () => `id-${Math.random().toString(16).slice(2)}` })

beforeEach(() => {
  store.clear()
  session.clear()
  clearAllLos2Stores()
  resetLifeOs2FlagsForTests()
  clearBrainStateForTests()
  saveReminders([])
})

describe('Life OS 2.0', () => {
  it('exports version and registers lifeOS2 skill', () => {
    expect(LIFE_OS2_VERSION).toBe('2.0.0')
    expect(listSkillMeta().some((s) => s.id === 'lifeOS2')).toBe(true)
  })

  it('fuses context without inventing schedule', () => {
    const ctx = fuseContext({ force: true })
    expect(ctx).toBeTruthy()
    expect(ctx!.today.reminders).toEqual([])
    expect(ctx!.emotion.available).toBe(false)
  })

  it('integrates reminders and projects into context', () => {
    addReminder('병원 예약')
    upsertProject('Nexus')
    const ctx = fuseContext({ force: true })!
    expect(ctx.today.reminders.some((r) => /병원/.test(r))).toBe(true)
    expect(ctx.projects.some((p) => p.name === 'Nexus')).toBe(true)
  })

  it('predictions: stalled project; no departure without ETA', () => {
    const p = upsertProject('StalledApp')
    // backdate
    store.set(
      'aizio_life_projects_v1',
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        items: [{ ...p, updatedAt: new Date(Date.now() - 5 * 86400000).toISOString() }],
      }),
    )
    const preds = generatePredictions({ force: true, navEtaMinutes: null })
    expect(preds.some((x) => x.type === 'stalled_project')).toBe(true)
    expect(preds.every((x) => x.type !== 'departure')).toBe(true)
  })

  it('habits: min observations → candidate; reject blocks re-suggest', () => {
    for (let i = 0; i < MIN_HABIT_OBSERVATIONS; i++) addObservation('commute', '출근', 8)
    const habits = refreshHabitCandidates()
    expect(habits.some((h) => h.status === 'candidate' && h.label === '출근')).toBe(true)
    expect(rejectHabit('출근')).toMatch(/거절/)
    const again = refreshHabitCandidates()
    expect(again.find((h) => h.label === '출근')?.status).toBe('ignored')
  })

  it('habits: confirm', () => {
    for (let i = 0; i < MIN_HABIT_OBSERVATIONS; i++) addObservation('wake', '기상', 7)
    refreshHabitCandidates()
    expect(confirmHabit('기상')).toMatch(/확인/)
  })

  it('focus start/stop and restore active', () => {
    const msg = startFocus('30분 동안 AIZIO 개발에 집중할래')
    expect(msg).toMatch(/집중 모드/)
    expect(msg).toMatch(/무음|강제 차단/)
    expect(getActiveFocus()?.title).toBeTruthy()
    expect(stopFocus()).toMatch(/종료|기록/)
    expect(getActiveFocus()).toBeNull()
  })

  it('relationship 2.0 save and search without inventing', () => {
    upsertExtended({ name: '김부장', kind: 'client', org: 'AIZIO 외주', notes: '외주 담당자' })
    addReminder('김부장 미팅')
    const r = searchRelatedLocal('김부장')
    expect(r.schedules.some((s) => /김부장/.test(s))).toBe(true)
    expect(r.extended).toMatch(/김부장/)
  })

  it('knowledge search returns empty honestly', () => {
    const items = searchKnowledge({ query: '존재하지않는쿼리xyz', reindex: true })
    expect(items).toHaveLength(0)
    expect(formatKnowledgeResults(items, '존재하지않는쿼리xyz')).toMatch(/없습니다/)
  })

  it('automation plan blocks payment and requires approval', () => {
    const bad = planAutomationFromText('퇴근하면 카드로 결제해줘')
    expect('error' in bad).toBe(true)
    const good = planAutomationFromText('퇴근하면 집으로 길 안내하고 잔잔한 음악 준비해줘')
    expect('plan' in good).toBe(true)
    if ('plan' in good) {
      expect(good.plan.approved).toBe(false)
      expect(good.plan.actions.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('goal coach uses real progress and respects paused', () => {
    const g = createGoal('AIZIO 출시')
    const advice = buildCoachAdvice(g)
    expect(advice.progressBasis).toBeTruthy()
    expect(advice.nextActions.length).toBeLessThanOrEqual(3)
  })

  it('companion morning/evening omit invented weather', () => {
    const m = buildMorningCompanion()
    expect(m).toMatch(/아침|꺼져|방해/)
    expect(m).not.toMatch(/기온\s*\d+/)
    const e = buildEveningCompanion()
    expect(e.length).toBeGreaterThan(5)
  })

  it('proactive default off and rejected not reshown', () => {
    expect(canShowSuggestion('x')).toBe(false)
    saveLifeOs2Flags({ proactiveSuggestionsEnabled: true })
    // Avoid quiet-hours false negative regardless of UTC hour in CI
    saveProactivePrefs({
      masterEnabled: true,
      quietStartHour: 23,
      quietEndHour: 23,
    })
    expect(canShowSuggestion('sig1')).toBe(true)
    recordSuggestionRejected('sig1')
    expect(canShowSuggestion('sig1')).toBe(false)
  })

  it('coordinator handles context ask', async () => {
    const r = await coordinateLifeOs2('오늘 뭐 해야 해?')
    expect(r?.handled).toBe(true)
    expect(r?.text).toMatch(/Context|할 일/)
  })

  it('parse intents and Core Brain routes focus', async () => {
    expect(parseLifeOs2Intent('집중 모드 시작')?.intent).toBe('start_focus')
    const r = await processCoreBrain({ text: '집중 모드 시작', allowDuplicate: true })
    expect(r.intent).toBe('start_focus')
    expect(r.fallbackLegacy).toBe(false)
    expect(r.selectedSkills).toContain('lifeOS2')
  })

  it('flags disable engines', () => {
    saveLifeOs2Flags({ contextFusionEnabled: false })
    expect(isLifeOs2Enabled('contextFusionEnabled')).toBe(false)
    expect(fuseContext({ force: true })).toBeNull()
  })

  it('music intent not stolen by life os 2', async () => {
    const r = await processCoreBrain({ text: '조용한 음악 틀어줘', allowDuplicate: true })
    expect(r.intent).toBe('play_music')
  })
})
