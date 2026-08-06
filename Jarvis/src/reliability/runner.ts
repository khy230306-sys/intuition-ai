/**
 * Reliability suite runner — Intent regression + multi-turn.
 * Never stores raw utterances into metrics (only pass/fail aggregates).
 */

import { routeCommand } from '../commandRouter'
import { endTranslationSession } from '../commandRouter/session'
import { think } from '../brain'
import { clearBrainStateForTests } from '../core-brain'
import { handleRestaurantAgent } from '../restaurantAgent'
import { clearRestaurantSession } from '../restaurantAgent/session'
import { handleTravelAgent } from '../travelAgent'
import { clearTravelSession } from '../travelAgent/session'
import { clearInterpretMode } from '../translateBrain'
import { ADVERSARIAL_COMMANDS } from './adversarial'
import { GOLDEN_COMMAND_SET, goldenSetStats } from './goldenSet'
import { recordMetric } from './metrics'
import { MULTI_TURN_SCENARIOS } from './multiTurn'
import type { GoldenCase, MultiTurnScenario } from './types'

export type CaseResult = {
  id: string
  ok: boolean
  input: string
  expected: string
  actual: string
  reason?: string
  durationMs: number
}

export type SuiteReport = {
  at: string
  goldenTotal: number
  goldenPass: number
  goldenPassRate: number
  adversarialTotal: number
  adversarialPass: number
  multiTurnTotal: number
  multiTurnPass: number
  avgRoutingMs: number
  categoryStats: Record<string, number>
  failures: CaseResult[]
  collisionViolations: number
  intentPassRate: number
  commandSuccessRate: number
}

function matchIntent(expected: string | RegExp, actual: string): boolean {
  if (typeof expected === 'string') return actual === expected || actual.startsWith(expected + '.')
  return expected.test(actual)
}

function forbiddenHit(bad: string, intent: string, action: string): boolean {
  const needle = bad.replace(/\.\*$/, '')
  if (needle === 'weather') return intent === 'weather.query' || intent.startsWith('weather.')
  if (needle === 'calendar') return intent.startsWith('calendar.')
  if (needle === 'translation') return intent.startsWith('translation.')
  if (needle === 'restaurant') return intent.startsWith('restaurant.')
  if (needle === 'family') return intent.startsWith('family.')
  if (needle === 'travel') return intent.startsWith('travel.')
  if (needle === 'travel.booking') return intent.startsWith('travel.booking')
  if (needle === 'restaurant.booking') return intent.startsWith('restaurant.booking')
  if (needle === 'restaurant.search') return intent === 'restaurant.search'
  return intent === needle || intent.startsWith(needle) || action === needle || action.startsWith(needle)
}

function clearAllSessions(): void {
  clearInterpretMode()
  endTranslationSession()
  clearTravelSession()
  clearRestaurantSession()
  clearBrainStateForTests()
}

export function runGoldenCase(c: GoldenCase): CaseResult {
  const t0 = performance.now()
  const routed = routeCommand({ text: c.input })
  const durationMs = Math.round(performance.now() - t0)
  const actual = routed.intent
  const okIntent = matchIntent(c.expectedIntent, actual)
  let violation = false
  for (const bad of c.forbiddenActions || []) {
    if (forbiddenHit(bad, actual, routed.action)) violation = true
  }
  const ok = okIntent && !violation
  recordMetric(
    {
      intent: actual,
      action: 'golden_check',
      success: ok,
      status: ok ? 'success' : 'failed',
      durationMs,
      fallback: false,
      retry: false,
      errorCode: ok ? undefined : 'ROUTER-001',
      category: c.category,
    },
    { force: true },
  )
  return {
    id: c.id,
    ok,
    input: c.input,
    expected: String(c.expectedIntent),
    actual,
    reason: !okIntent ? 'intent_mismatch' : violation ? 'forbidden_violation' : undefined,
    durationMs,
  }
}

export function runGoldenSuite(): {
  results: CaseResult[]
  passRate: number
  avgMs: number
  collisions: number
} {
  const results = GOLDEN_COMMAND_SET.map(runGoldenCase)
  const pass = results.filter((r) => r.ok).length
  const collisions = results.filter((r) => r.reason === 'forbidden_violation').length
  const avgMs = results.length
    ? Math.round(results.reduce((s, r) => s + r.durationMs, 0) / results.length)
    : 0
  return {
    results,
    passRate: results.length ? Math.round((pass / results.length) * 1000) / 10 : 0,
    avgMs,
    collisions,
  }
}

export function runAdversarialSuite(): { results: CaseResult[]; passRate: number } {
  const results = ADVERSARIAL_COMMANDS.map(runGoldenCase)
  const pass = results.filter((r) => r.ok).length
  return {
    results,
    passRate: results.length ? Math.round((pass / results.length) * 1000) / 10 : 0,
  }
}

async function runStepText(
  category: string,
  input: string,
): Promise<{ text: string; intent?: string }> {
  if (category === 'travel') {
    const r = await handleTravelAgent(input)
    if (r) return { text: r.text, intent: r.travelIntent }
  }
  if (category === 'restaurant') {
    const r = await handleRestaurantAgent(input)
    if (r) return { text: r.text, intent: r.restaurantIntent }
  }
  const reply = await think(input)
  return { text: reply.text }
}

async function runMultiTurnScenario(
  sc: MultiTurnScenario,
): Promise<{ ok: boolean; failedStep?: number; detail?: string }> {
  clearAllSessions()
  for (let i = 0; i < sc.steps.length; i++) {
    const step = sc.steps[i]
    const routed = routeCommand({ text: step.input })

    if (step.expectIntent && !step.expectText && !step.forbidText) {
      if (!matchIntent(step.expectIntent, routed.intent)) {
        return { ok: false, failedStep: i, detail: `intent ${routed.intent} ≠ ${step.expectIntent}` }
      }
      continue
    }

    const out = await runStepText(sc.category, step.input)
    if (step.expectIntent && !matchIntent(step.expectIntent, routed.intent)) {
      // Agent categories may resolve via session follow-up even if bare route differs
      if (sc.category !== 'travel' && sc.category !== 'restaurant') {
        return { ok: false, failedStep: i, detail: `intent ${routed.intent}` }
      }
    }
    if (step.expectText && !step.expectText.test(out.text)) {
      return { ok: false, failedStep: i, detail: `text miss: ${out.text.slice(0, 80)}` }
    }
    if (step.forbidText && step.forbidText.test(out.text)) {
      return { ok: false, failedStep: i, detail: `forbidden text hit` }
    }
  }
  return { ok: true }
}

export async function runMultiTurnSuite(): Promise<{
  total: number
  pass: number
  passRate: number
  failures: string[]
}> {
  const failures: string[] = []
  let pass = 0
  for (const sc of MULTI_TURN_SCENARIOS) {
    const r = await runMultiTurnScenario(sc)
    if (r.ok) pass++
    else failures.push(`${sc.id}@${r.failedStep}: ${r.detail}`)
    recordMetric(
      {
        intent: `multiturn.${sc.category}`,
        action: 'multiturn_check',
        success: r.ok,
        status: r.ok ? 'success' : 'failed',
        durationMs: 0,
        fallback: false,
        retry: false,
        category: sc.category,
      },
      { force: true },
    )
  }
  return {
    total: MULTI_TURN_SCENARIOS.length,
    pass,
    passRate: MULTI_TURN_SCENARIOS.length
      ? Math.round((pass / MULTI_TURN_SCENARIOS.length) * 1000) / 10
      : 0,
    failures,
  }
}

export async function runFullReliabilitySuite(): Promise<SuiteReport> {
  clearAllSessions()
  const golden = runGoldenSuite()
  const adv = runAdversarialSuite()
  const mt = await runMultiTurnSuite()
  const failures = [...golden.results, ...adv.results].filter((r) => !r.ok).slice(0, 40)
  const intentPassRate =
    Math.round(
      ((golden.results.filter((r) => r.ok).length + adv.results.filter((r) => r.ok).length) /
        Math.max(1, golden.results.length + adv.results.length)) *
        1000,
    ) / 10
  return {
    at: new Date().toISOString(),
    goldenTotal: golden.results.length,
    goldenPass: golden.results.filter((r) => r.ok).length,
    goldenPassRate: golden.passRate,
    adversarialTotal: adv.results.length,
    adversarialPass: adv.results.filter((r) => r.ok).length,
    multiTurnTotal: mt.total,
    multiTurnPass: mt.pass,
    avgRoutingMs: golden.avgMs,
    categoryStats: goldenSetStats(),
    failures,
    collisionViolations: golden.collisions,
    intentPassRate,
    commandSuccessRate: golden.passRate,
  }
}

export function formatSuiteReport(r: SuiteReport): string {
  return [
    `【AIZIO 명령 신뢰성 테스트】`,
    `Golden: ${r.goldenPass}/${r.goldenTotal} (${r.goldenPassRate}%)`,
    `Adversarial: ${r.adversarialPass}/${r.adversarialTotal}`,
    `Multi-turn: ${r.multiTurnPass}/${r.multiTurnTotal}`,
    `Intent 정확도: ${r.intentPassRate}%`,
    `평균 라우팅: ${r.avgRoutingMs}ms`,
    `충돌(forbidden): ${r.collisionViolations}`,
    r.failures.length
      ? `실패 예시: ${r.failures
          .slice(0, 5)
          .map((f) => f.input)
          .join(' · ')}`
      : '실패 없음',
  ].join('\n')
}
