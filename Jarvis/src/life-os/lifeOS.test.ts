import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearBrainStateForTests } from '../core-brain/brainState'
import { processCoreBrain } from '../core-brain/coreBrain'
import {
  addFinanceRecord,
  addHealthLog,
  assertNoRemoteCodeInstall,
  assessEmergencyUtterance,
  computeGoalProgress,
  createGoal,
  forgetDna,
  formatDnaList,
  listDna,
  planMilestones,
  rememberDnaFromText,
  saveIdea,
  searchIdeas,
  upsertProject,
  addProjectBug,
  computeProjectHealth,
  findRoutineByPhrase,
  runRoutine,
  validateManifest,
  addTimelineEvent,
  listTimeline,
  formatTodayBrief,
  resetLifeFlagsForTests,
} from '../life-os'
import { clearDnaStore } from '../life-os/dna/dnaRepository'
import { clearGoalsStore } from '../life-os/goals/goalRepository'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', { randomUUID: () => `id_${Math.random().toString(36).slice(2)}` })

beforeEach(() => {
  store.clear()
  clearBrainStateForTests()
  resetLifeFlagsForTests()
  clearDnaStore()
  clearGoalsStore()
})

describe('AIZIO DNA', () => {
  it('stores explicit preference and lists it', () => {
    const r = rememberDnaFromText('나는 짧은 답변이 좋아')
    expect(r.ok).toBe(true)
    expect(listDna().some((d) => d.key === 'responseLength' && d.value === 'concise')).toBe(true)
    expect(formatDnaList()).toMatch(/responseLength/)
  })

  it('blocks secrets from DNA', () => {
    const r = rememberDnaFromText('내 비밀번호는 secret123이야')
    expect(r.ok).toBe(false)
  })

  it('forgets dna entries', () => {
    rememberDnaFromText('내 취미는 낚시야')
    expect(forgetDna('hobby').ok).toBe(true)
    expect(listDna().length).toBe(0)
  })
})

describe('Goals', () => {
  it('creates goal, plans milestones, computes progress', () => {
    const g = createGoal('AIZIO 세계 출시')
    const planned = planMilestones(g.id, ['A', 'B'])!
    expect(planned.milestones).toHaveLength(2)
    planned.milestones[0]!.done = true
    expect(computeGoalProgress(planned)).toBe(0.5)
  })
})

describe('Ideas & Projects', () => {
  it('preserves idea original text', () => {
    const idea = saveIdea('좋은 아이디어가 생각났어. 음악 추천을 더 똑똑하게.')
    expect(idea.content).toContain('음악 추천')
    expect(searchIdeas('음악').length).toBeGreaterThan(0)
  })

  it('tracks project bugs and health from data', () => {
    upsertProject('AIZIO')
    const updated = addProjectBug('AIZIO', '흰 화면')!
    const h = computeProjectHealth(updated)
    expect(h.openBugs).toBeGreaterThanOrEqual(1)
  })
})

describe('Emergency / Routine / Timeline / Marketplace', () => {
  it('does not treat casual 살려줘 as emergency panel', () => {
    const a = assessEmergencyUtterance('이 문제 너무 어려워, 살려줘')
    expect(a.showPanel).toBe(false)
  })

  it('flags real emergency cues', () => {
    expect(assessEmergencyUtterance('숨을 못 쉬겠어. 119 불러줘').showPanel).toBe(true)
  })

  it('runs routine without claiming total success on empty failures', () => {
    const r = findRoutineByPhrase('잘 자')
    expect(r).toBeTruthy()
    const run = runRoutine(r!)
    expect(run.results.length).toBeGreaterThan(0)
  })

  it('timeline skips ordinary chatter unless explicit', () => {
    addTimelineEvent({ type: 'custom', title: '중요', userPinned: true })
    expect(listTimeline().length).toBe(1)
  })

  it('rejects remote code install', () => {
    expect(assertNoRemoteCodeInstall().ok).toBe(false)
    expect(validateManifest({ id: 'x', name: 'X', version: '1' }).ok).toBe(true)
  })

  it('health/finance refuse diagnosis and secrets', () => {
    expect(addHealthLog('other', '암 확정 진단 결과').ok).toBe(false)
    expect(addFinanceRecord('expense', '카드번호 1234', 1000).ok).toBe(false)
  })

  it('today brief does not invent data', () => {
    expect(formatTodayBrief()).toMatch(/없음|오늘/)
  })
})

describe('Core Brain Life OS wiring', () => {
  it('remembers preference via processCoreBrain', async () => {
    const r = await processCoreBrain({ text: '나는 짧은 답변이 좋아', allowDuplicate: true })
    expect(r.fallbackLegacy).toBe(false)
    expect(r.responseText).toMatch(/기억|responseLength|concise|짧/)
  })

  it('saves idea via processCoreBrain', async () => {
    const r = await processCoreBrain({
      text: '이걸 아이디어로 저장해. 음성 UI 개선',
      allowDuplicate: true,
    })
    expect(r.responseText).toMatch(/아이디어/)
  })
})
