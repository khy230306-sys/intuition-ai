/**
 * Per-turn latency trace for release-speed gates.
 * Lightweight — no heavy serialization; ring buffer in memory + optional localStorage.
 */

export type TraceMark =
  | 'T0_submit'
  | 'T1_ui_ack'
  | 'T2_normalize'
  | 'T3_route'
  | 'T4_tool_start'
  | 'T5_tool_complete'
  | 'T6_llm_start'
  | 'T7_llm_first'
  | 'T8_llm_complete'
  | 'T9_ui_rendered'

export type TurnTrace = {
  id: string
  utterance: string
  t0: number
  marks: Partial<Record<TraceMark, number>>
  meta?: Record<string, unknown>
}

const RING_MAX = 80
const ring: TurnTrace[] = []
let active: TurnTrace | null = null

function nid(): string {
  return `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function beginTurnTrace(utterance: string): TurnTrace {
  const tr: TurnTrace = {
    id: nid(),
    utterance: (utterance || '').slice(0, 120),
    t0: performance.now(),
    marks: { T0_submit: 0 },
  }
  active = tr
  ring.push(tr)
  if (ring.length > RING_MAX) ring.shift()
  return tr
}

export function markTurn(mark: TraceMark, meta?: Record<string, unknown>): void {
  if (!active) return
  active.marks[mark] = Math.round(performance.now() - active.t0)
  if (meta) active.meta = { ...(active.meta || {}), ...meta }
}

export function endTurnTrace(extra?: Record<string, unknown>): TurnTrace | null {
  if (!active) return null
  markTurn('T9_ui_rendered', extra)
  const done = active
  active = null
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aizio_last_turn_trace_v1', JSON.stringify(done))
    }
  } catch {
    /* ignore */
  }
  return done
}

export function getRecentTurnTraces(): TurnTrace[] {
  return [...ring]
}

export function summarizeTraceDurations(traces: TurnTrace[]): {
  count: number
  p50: number
  p75: number
  p90: number
  p95: number
  p99: number
  max: number
  over20s: number
} {
  const totals = traces
    .map((t) => t.marks.T9_ui_rendered ?? t.marks.T8_llm_complete ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
  const pct = (p: number) => {
    if (!totals.length) return 0
    const i = Math.min(totals.length - 1, Math.max(0, Math.ceil((p / 100) * totals.length) - 1))
    return totals[i]
  }
  return {
    count: totals.length,
    p50: pct(50),
    p75: pct(75),
    p90: pct(90),
    p95: pct(95),
    p99: pct(99),
    max: totals.length ? totals[totals.length - 1] : 0,
    over20s: totals.filter((n) => n >= 20_000).length,
  }
}

/** Deterministic status copy for immediate UI feedback (no fake tool results). */
export function thinkingStatusFor(text: string): string {
  const t = (text || '').trim()
  if (/날씨|비\s*옴|비옴|우산|기온/.test(t)) return '날씨를 확인하고 있어요…'
  if (/갈\s*만|장소|찾아|맛집|식당|고기집/.test(t)) return '장소를 찾고 있어요…'
  if (/비행|항공|호텔|여행/.test(t)) return '여행 정보를 확인하고 있어요…'
  if (/일정|병원|리마인더|알림|기억해/.test(t)) return '일정을 확인하고 있어요…'
  if (/음악|노래|틀어|재생/.test(t)) return '음악을 준비하고 있어요…'
  if (/번역|통역/.test(t)) return '번역을 준비하고 있어요…'
  return '확인하고 있어요…'
}
