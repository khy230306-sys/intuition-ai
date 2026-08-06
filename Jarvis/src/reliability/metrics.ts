/**
 * Command Reliability Metrics — metadata only, never raw user text / PII.
 */

import type { ActionExecutionResult, ReliabilityKpis, ReliabilityMetricEvent } from './types'

const KEY = 'aizio_reliability_metrics_v1'
const OPT_IN_KEY = 'aizio_reliability_opt_in_v1'
const MAX = 400

function nid(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function isReliabilityOptIn(): boolean {
  try {
    return localStorage.getItem(OPT_IN_KEY) === '1'
  } catch {
    return false
  }
}

export function setReliabilityOptIn(on: boolean): void {
  localStorage.setItem(OPT_IN_KEY, on ? '1' : '0')
}

export function categoryFromIntent(intent: string): string {
  if (intent.startsWith('translation')) return 'translation'
  if (intent.startsWith('weather')) return 'weather'
  if (intent.startsWith('calendar') || intent.startsWith('reminder') || intent.startsWith('todo'))
    return 'calendar'
  if (intent.startsWith('family')) return 'family'
  if (intent.startsWith('vision')) return 'vision'
  if (intent.startsWith('travel') || intent.includes('flight') || intent.includes('hotel'))
    return 'travel'
  if (intent.startsWith('restaurant')) return 'restaurant'
  if (intent.startsWith('memory')) return 'memory'
  if (intent.startsWith('music')) return 'music'
  if (intent === 'general.chat' || intent === 'clarify') return 'general'
  return 'other'
}

export function loadMetricEvents(): ReliabilityMetricEvent[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as ReliabilityMetricEvent[]
  } catch {
    return []
  }
}

export function clearMetricEvents(): void {
  localStorage.removeItem(KEY)
}

export function recordMetric(
  partial: Omit<ReliabilityMetricEvent, 'id' | 'at'>,
  opts?: { force?: boolean },
): void {
  // 실사용 테스트 모드(opt-in) 또는 Reliability Center / suite force 시에만 저장.
  // 저장 내용은 메타데이터만 — 원문 발화·PII 금지.
  if (!opts?.force && !isReliabilityOptIn()) return
  const events = loadMetricEvents()
  events.unshift({
    id: nid(),
    at: Date.now(),
    ...partial,
  })
  localStorage.setItem(KEY, JSON.stringify(events.slice(0, MAX)))
}

export function recordFromExecution(result: ActionExecutionResult, retry = false): void {
  recordMetric({
    intent: result.intent,
    action: result.action,
    success: result.success,
    status: result.status,
    durationMs: result.durationMs || 0,
    fallback: Boolean(result.fallback),
    provider: result.provider,
    retry,
    errorCode: result.errorCode,
    category: categoryFromIntent(result.intent),
  })
}

export function computeKpis(events = loadMetricEvents()): ReliabilityKpis {
  const total = events.length
  const success = events.filter((e) => e.success).length
  const providerFails = events.filter((e) => e.errorCode?.startsWith('PROVIDER') || e.errorCode?.includes('001')).length
  const fallbacks = events.filter((e) => e.fallback).length
  const retries = events.filter((e) => e.retry)
  const retryOk = retries.filter((e) => e.success).length
  const avgDurationMs =
    total === 0 ? 0 : Math.round(events.reduce((s, e) => s + (e.durationMs || 0), 0) / total)

  const byCategory: ReliabilityKpis['byCategory'] = {}
  for (const e of events) {
    const c = e.category || 'other'
    if (!byCategory[c]) byCategory[c] = { total: 0, success: 0, rate: 0 }
    byCategory[c].total++
    if (e.success) byCategory[c].success++
  }
  for (const c of Object.keys(byCategory)) {
    const b = byCategory[c]
    b.rate = b.total ? Math.round((b.success / b.total) * 1000) / 10 : 0
  }

  const recentErrorCodes = events
    .filter((e) => e.errorCode)
    .slice(0, 12)
    .map((e) => e.errorCode!)

  return {
    total,
    successRate: total ? Math.round((success / total) * 1000) / 10 : 100,
    avgDurationMs,
    providerFailRate: total ? Math.round((providerFails / total) * 1000) / 10 : 0,
    fallbackRate: total ? Math.round((fallbacks / total) * 1000) / 10 : 0,
    retrySuccessRate: retries.length ? Math.round((retryOk / retries.length) * 1000) / 10 : 0,
    byCategory,
    recentErrorCodes,
  }
}
