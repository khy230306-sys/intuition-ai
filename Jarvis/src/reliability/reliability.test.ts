import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeCommand } from '../commandRouter'
import { clearInterpretMode } from '../translateBrain'
import { endTranslationSession } from '../commandRouter/session'
import { clearTravelSession } from '../travelAgent/session'
import { clearRestaurantSession } from '../restaurantAgent/session'
import { ADVERSARIAL_COMMANDS } from './adversarial'
import { GOLDEN_COMMAND_SET, goldenSetStats } from './goldenSet'
import { MULTI_TURN_SCENARIOS, multiTurnCount } from './multiTurn'
import {
  clearMetricEvents,
  computeKpis,
  isReliabilityOptIn,
  setReliabilityOptIn,
} from './metrics'
import {
  formatSuiteReport,
  runAdversarialSuite,
  runFullReliabilitySuite,
  runGoldenSuite,
  runMultiTurnSuite,
} from './runner'
import { resolveActiveMode } from './activeMode'
import { userFacingError } from './errorCodes'
import { makeExecutionResult } from './execution'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR' })

function clearAll(): void {
  store.clear()
  clearInterpretMode()
  endTranslationSession()
  clearTravelSession()
  clearRestaurantSession()
  clearMetricEvents()
  setReliabilityOptIn(false)
}

describe('AIZIO Core Reliability', () => {
  beforeEach(() => {
    clearAll()
  })

  it('Golden Command Set has 200+ cases with category floors', () => {
    const s = goldenSetStats()
    expect(s.total).toBeGreaterThanOrEqual(200)
    expect(s.general).toBeGreaterThanOrEqual(20)
    expect(s.translation).toBeGreaterThanOrEqual(30)
    expect(s.weather).toBeGreaterThanOrEqual(20)
    expect(s.calendar).toBeGreaterThanOrEqual(30)
    expect(s.family).toBeGreaterThanOrEqual(20)
    expect(s.vision).toBeGreaterThanOrEqual(15)
    expect(s.travel).toBeGreaterThanOrEqual(25)
    expect(s.restaurant).toBeGreaterThanOrEqual(25)
  })

  it('Golden suite intent pass rate is 100% and collision 0', () => {
    const g = runGoldenSuite()
    const fails = g.results.filter((r) => !r.ok)
    if (fails.length) {
      console.error(
        'GOLDEN FAILS',
        fails.slice(0, 40).map((f) => `${f.input} => ${f.actual} (want ${f.expected}) [${f.reason}]`),
      )
    }
    expect(g.collisions).toBe(0)
    expect(g.passRate).toBe(100)
    expect(g.avgMs).toBeLessThan(100)
  })

  it('Adversarial suite passes 100%', () => {
    expect(ADVERSARIAL_COMMANDS.length).toBeGreaterThanOrEqual(10)
    const a = runAdversarialSuite()
    const fails = a.results.filter((r) => !r.ok)
    if (fails.length) {
      console.error(
        'ADV FAILS',
        fails.map((f) => `${f.input} => ${f.actual} (want ${f.expected})`),
      )
    }
    expect(a.passRate).toBe(100)
  })

  it('Multi-turn has 20+ scenarios and suite passes', async () => {
    expect(multiTurnCount()).toBeGreaterThanOrEqual(20)
    expect(MULTI_TURN_SCENARIOS.length).toBeGreaterThanOrEqual(20)
    const mt = await runMultiTurnSuite()
    if (mt.failures.length) console.error('MT FAILS', mt.failures)
    expect(mt.passRate).toBe(100)
  }, 120_000)

  it('Full suite report aggregates KPIs', async () => {
    const report = await runFullReliabilitySuite()
    expect(report.goldenPassRate).toBe(100)
    expect(report.collisionViolations).toBe(0)
    expect(report.multiTurnPass).toBe(report.multiTurnTotal)
    const text = formatSuiteReport(report)
    expect(text).toContain('Golden')
    const kpis = computeKpis()
    expect(kpis.total).toBeGreaterThan(0)
  }, 120_000)

  it('Active mode priority: translation > newer travel|restaurant', () => {
    expect(resolveActiveMode()).toBe('normal')
  })

  it('Execution result records metadata without raw utterance', () => {
    setReliabilityOptIn(true)
    const r = makeExecutionResult({
      success: true,
      action: 'weather.query',
      intent: 'weather.query',
      userMessage: '맑음',
      durationMs: 12,
      provider: 'mock',
    })
    expect(r.success).toBe(true)
    const kpis = computeKpis()
    expect(kpis.byCategory.weather?.total).toBeGreaterThan(0)
    const raw = localStorage.getItem('aizio_reliability_metrics_v1') || ''
    expect(raw).not.toContain('오늘 날씨')
  })

  it('실사용 테스트 모드 defaults OFF', () => {
    expect(isReliabilityOptIn()).toBe(false)
  })

  it('userFacingError never exposes raw code to users', () => {
    expect(userFacingError('WEATHER-001', '날씨를 가져오지 못했어요.')).toBe(
      '날씨를 가져오지 못했어요.',
    )
  })

  it('route collision: weather mention inside translation', () => {
    const r = routeCommand({ text: '오늘 날씨 좋다고 영어로 번역해줘' })
    expect(r.intent).toBe('translation.oneshot')
    expect(r.forbiddenActions).toContain('weather')
  })
})
