/**
 * Smoke: device-test phrases → cards / Core Brain routing.
 * Run: npm test -- src/life-os-2/phrase-smoke.test.ts
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllLos2Stores } from './repository'
import { resetLifeOs2FlagsForTests } from './featureFlags'
import { coordinateLifeOs2 } from './lifeCoordinator'
import { processCoreBrain, clearBrainStateForTests } from '../core-brain'
import { createGoal } from '../life-os/goals/goalService'
import { saveIdea } from '../life-os/ideas/ideaService'
import { addReminder, saveReminders } from '../storage'
import { addObservation } from './habits/habitRepository'
import { refreshHabitCandidates } from './habits/habitEngine'
import { MIN_HABIT_OBSERVATIONS } from './habits/habitTypes'

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
vi.stubGlobal('crypto', { randomUUID: () => `id-${Math.random().toString(16).slice(2)}` })

beforeEach(() => {
  store.clear()
  clearAllLos2Stores()
  resetLifeOs2FlagsForTests()
  clearBrainStateForTests()
  saveReminders([])
  addReminder('엄마 병원')
  createGoal('AIZIO 출시')
  saveIdea('네비게이션 관련 아이디어: 내부 지도 후보 카드')
  for (let i = 0; i < MIN_HABIT_OBSERVATIONS; i++) addObservation('commute', '출근', 8)
  refreshHabitCandidates()
})

const PHRASES: Array<{ text: string; expectCard?: string; expectIntent?: string }> = [
  { text: '오늘 뭐 해야 해?', expectCard: 'context_summary', expectIntent: 'ask_current_context' },
  { text: '30분 동안 AIZIO 개발에 집중할래.', expectCard: 'focus_session', expectIntent: 'start_focus' },
  { text: '집중 상태 보여줘.', expectCard: 'focus_session', expectIntent: 'focus_status' },
  { text: '집중 끝.', expectCard: 'focus_session', expectIntent: 'stop_focus' },
  { text: '출근 Routine 후보 보여줘.', expectCard: 'habit_candidate', expectIntent: 'show_habits' },
  {
    text: '퇴근하면 집으로 길 안내하고 음악 준비해줘.',
    expectCard: 'automation_plan',
    expectIntent: 'create_automation',
  },
  { text: 'AIZIO 출시 목표 다음 할 일 알려줘.', expectCard: 'goal_coach', expectIntent: 'goal_coaching' },
  { text: '네비게이션 관련 아이디어 찾아줘.', expectCard: 'knowledge_results', expectIntent: 'search_knowledge' },
  { text: '모닝 브리프.', expectCard: 'morning_brief', expectIntent: 'morning_brief' },
  { text: '저녁 요약.', expectCard: 'evening_summary', expectIntent: 'evening_summary' },
]

describe('Life OS 2.0 phrase smoke (device-test script)', () => {
  for (const p of PHRASES) {
    it(`${p.text}`, async () => {
      // Focus chain: ensure start before status/end for those phrases
      if (p.text === '집중 상태 보여줘.' || p.text === '집중 끝.') {
        await coordinateLifeOs2('30분 동안 AIZIO 개발에 집중할래.')
      }
      const r = await coordinateLifeOs2(p.text)
      expect(r?.handled).toBe(true)
      if (p.expectCard) {
        expect(r?.lifeCards?.[0]?.type).toBe(p.expectCard)
      }
      const brain = await processCoreBrain({ text: p.text, allowDuplicate: true })
      if (p.expectIntent) {
        expect(brain.intent).toBe(p.expectIntent)
        expect(brain.fallbackLegacy).toBe(false)
        expect(brain.selectedSkills).toContain('lifeOS2')
      }
      // Explicit companion asks must not be blocked by quiet hours
      if (p.expectCard === 'morning_brief' || p.expectCard === 'evening_summary') {
        expect(r?.text).not.toMatch(/방해 금지/)
      }
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          phrase: p.text,
          intent: brain.intent,
          card: r?.lifeCards?.[0]?.type,
          title: r?.lifeCards?.[0]?.title,
          summary: r?.lifeCards?.[0]?.summary?.slice(0, 80),
          textHead: r?.text?.split('\n')[0]?.slice(0, 80),
        }),
      )
    })
  }
})
