import type { HybridProviderId, UsageDayStats } from './types'

const USAGE_KEY = 'jarvis_ai_usage_v1'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function emptyDay(day = today()): UsageDayStats {
  return { day, requests: 0, success: 0, failure: 0, fallbacks: 0, byProvider: {} }
}

export function loadUsageStats(): UsageDayStats {
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    if (!raw) return emptyDay()
    const parsed = JSON.parse(raw) as UsageDayStats
    if (parsed.day !== today()) return emptyDay()
    return { ...emptyDay(), ...parsed, byProvider: { ...parsed.byProvider } }
  } catch {
    return emptyDay()
  }
}

function save(stats: UsageDayStats): void {
  localStorage.setItem(USAGE_KEY, JSON.stringify(stats))
}

export function recordUsage(event: {
  provider?: HybridProviderId
  ok: boolean
  fallback?: boolean
}): void {
  const stats = loadUsageStats()
  stats.requests += 1
  if (event.ok) stats.success += 1
  else stats.failure += 1
  if (event.fallback) stats.fallbacks += 1
  if (event.provider) {
    stats.byProvider[event.provider] = (stats.byProvider[event.provider] || 0) + 1
  }
  save(stats)
}

/** AIZIO-internal counters only — not provider official remaining quota. */
export function usageSummaryLine(): string {
  const s = loadUsageStats()
  return `오늘 앱 내부 요청 ${s.requests}회 (성공 ${s.success} · 실패 ${s.failure} · 폴백 ${s.fallbacks}) · Provider 공식 잔여 한도와 다를 수 있음`
}
