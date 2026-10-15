import type { Card, Street } from '@/engine/cards'
import { formatCard, streetFromBoard } from '@/engine/cards'
import type { Action, Position } from '@/engine/strategy'

export type HandOutcome = 'won' | 'lost' | 'folded' | 'chop' | 'unknown'

export interface StreetSnapshot {
  street: Street
  boardLen: number
  winPct: number
  tiePct: number
  losePct: number
  action: Action
  actionLabel: string
  handLabel: string
  draws: string[]
  at: string
}

export interface HandRecord {
  id: string
  startedAt: string
  endedAt: string
  hole: Card[]
  board: Card[]
  opponents: number
  position: Position
  snapshots: StreetSnapshot[]
  finalWinPct: number
  advisedAction: Action
  outcome: HandOutcome
  note?: string
}

export interface DaySession {
  dateKey: string // YYYY-MM-DD local
  hands: HandRecord[]
  updatedAt: string
}

export interface FlowInsight {
  level: 'hot' | 'warm' | 'neutral' | 'cold' | 'ice'
  title: string
  summary: string
  bullets: string[]
}

export interface FlowReport {
  handCount: number
  avgFinalEquity: number
  avgPreflopEquity: number
  equityDeltaAvg: number // river/last - preflop
  recentForm: number // last 5 outcomes score -1..1
  winRateKnown: number | null // among known outcomes
  foldRate: number
  raiseRate: number
  aggression: number // raise+allin / decisions
  momentum: number // -100..100
  equityTrend: 'up' | 'flat' | 'down'
  streetLeak: string | null
  insight: FlowInsight
  sparkEquity: number[] // last N final equities
  actionMix: Record<Action, number>
}

const LS_KEY = 'holdem-edge-sessions-v1'

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function loadAllSessions(): Record<string, DaySession> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, DaySession>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveAllSessions(map: Record<string, DaySession>): void {
  localStorage.setItem(LS_KEY, JSON.stringify(map))
}

export function loadDaySession(dateKey = todayKey()): DaySession {
  const all = loadAllSessions()
  return (
    all[dateKey] ?? {
      dateKey,
      hands: [],
      updatedAt: new Date().toISOString(),
    }
  )
}

export function upsertHand(record: HandRecord, dateKey = todayKey()): DaySession {
  const all = loadAllSessions()
  const day = all[dateKey] ?? { dateKey, hands: [], updatedAt: new Date().toISOString() }
  const idx = day.hands.findIndex((h) => h.id === record.id)
  const hands = [...day.hands]
  if (idx >= 0) hands[idx] = record
  else hands.unshift(record)
  const next: DaySession = { dateKey, hands, updatedAt: new Date().toISOString() }
  all[dateKey] = next
  saveAllSessions(all)
  return next
}

export function clearDaySession(dateKey = todayKey()): DaySession {
  const all = loadAllSessions()
  const next: DaySession = { dateKey, hands: [], updatedAt: new Date().toISOString() }
  all[dateKey] = next
  saveAllSessions(all)
  return next
}

export function createId(): string {
  return `hand_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function formatHole(hole: Card[]): string {
  return hole.map(formatCard).join(' ')
}

export function formatBoard(board: Card[]): string {
  return board.length ? board.map(formatCard).join(' ') : '-'
}

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function outcomeScore(o: HandOutcome): number {
  if (o === 'won') return 1
  if (o === 'chop') return 0.3
  if (o === 'lost') return -1
  if (o === 'folded') return -0.2
  return 0
}

export function analyzeFlow(session: DaySession): FlowReport {
  const hands = session.hands
  const actionMix: Record<Action, number> = {
    fold: 0,
    check_call: 0,
    raise: 0,
    all_in: 0,
  }
  let decisions = 0
  for (const h of hands) {
    for (const snap of h.snapshots) {
      actionMix[snap.action] += 1
      decisions += 1
    }
  }

  const finals = hands.map((h) => h.finalWinPct)
  const prefops = hands
    .map((h) => h.snapshots.find((s) => s.street === 'preflop')?.winPct)
    .filter((n): n is number => typeof n === 'number')
  const deltas = hands.map((h) => {
    const pre = h.snapshots.find((s) => s.street === 'preflop')?.winPct
    const last = h.snapshots[h.snapshots.length - 1]?.winPct ?? h.finalWinPct
    return pre == null ? 0 : last - pre
  })

  const known = hands.filter((h) => h.outcome === 'won' || h.outcome === 'lost' || h.outcome === 'chop')
  const wins = known.filter((h) => h.outcome === 'won' || h.outcome === 'chop').length
  const winRateKnown = known.length ? (wins / known.length) * 100 : null

  const foldRate = decisions ? (actionMix.fold / decisions) * 100 : 0
  const raiseRate = decisions ? ((actionMix.raise + actionMix.all_in) / decisions) * 100 : 0
  const aggression = decisions ? (actionMix.raise + actionMix.all_in) / decisions : 0

  const recent = hands.slice(0, 5)
  const recentForm = recent.length
    ? recent.reduce((s, h) => s + outcomeScore(h.outcome), 0) / recent.length
    : 0

  // Equity trend: compare first half vs second half of session (chronological = reverse of unshift order)
  const chrono = [...hands].reverse()
  let equityTrend: FlowReport['equityTrend'] = 'flat'
  if (chrono.length >= 4) {
    const mid = Math.floor(chrono.length / 2)
    const early = avg(chrono.slice(0, mid).map((h) => h.finalWinPct))
    const late = avg(chrono.slice(mid).map((h) => h.finalWinPct))
    if (late - early > 4) equityTrend = 'up'
    else if (early - late > 4) equityTrend = 'down'
  }

  // Street leak: where advised fold most often postflop with still-decent equity
  let streetLeak: string | null = null
  const streetFolds: Record<string, { n: number; eq: number }> = {}
  for (const h of hands) {
    for (const snap of h.snapshots) {
      if (snap.action === 'fold' && snap.street !== 'preflop') {
        const cur = streetFolds[snap.street] ?? { n: 0, eq: 0 }
        cur.n += 1
        cur.eq += snap.winPct
        streetFolds[snap.street] = cur
      }
    }
  }
  const leakEntry = Object.entries(streetFolds).sort((a, b) => b[1].n - a[1].n)[0]
  if (leakEntry && leakEntry[1].n >= 2) {
    const avgEq = leakEntry[1].eq / leakEntry[1].n
    streetLeak = `${leakEntry[0]}에서 폴드 권고 ${leakEntry[1].n}회 (평균 승률 ${avgEq.toFixed(0)}%)`
  }

  const avgFinalEquity = avg(finals)
  const avgPreflopEquity = avg(prefops)
  const equityDeltaAvg = avg(deltas)

  // Momentum -100..100
  const momentum = Math.max(
    -100,
    Math.min(
      100,
      recentForm * 45 +
        (equityTrend === 'up' ? 20 : equityTrend === 'down' ? -20 : 0) +
        (avgFinalEquity - 40) * 0.8 +
        (winRateKnown != null ? (winRateKnown - 50) * 0.35 : 0) +
        aggression * 15 -
        foldRate * 0.15,
    ),
  )

  const insight = buildInsight({
    handCount: hands.length,
    avgFinalEquity,
    equityDeltaAvg,
    recentForm,
    winRateKnown,
    foldRate,
    raiseRate,
    aggression,
    momentum,
    equityTrend,
    streetLeak,
  })

  return {
    handCount: hands.length,
    avgFinalEquity,
    avgPreflopEquity,
    equityDeltaAvg,
    recentForm,
    winRateKnown,
    foldRate,
    raiseRate,
    aggression,
    momentum,
    equityTrend,
    streetLeak,
    insight,
    sparkEquity: chrono.map((h) => h.finalWinPct).slice(-12),
    actionMix,
  }
}

function buildInsight(input: {
  handCount: number
  avgFinalEquity: number
  equityDeltaAvg: number
  recentForm: number
  winRateKnown: number | null
  foldRate: number
  raiseRate: number
  aggression: number
  momentum: number
  equityTrend: FlowReport['equityTrend']
  streetLeak: string | null
}): FlowInsight {
  if (input.handCount === 0) {
    return {
      level: 'neutral',
      title: '오늘 세션 시작 전',
      summary: '핸드를 저장하며 진행하면 당일 승률·흐름이 쌓입니다.',
      bullets: [
        '핸드마다 결과(승/패/폴드)를 기록하세요',
        '스트리트별로 승률 변화를 추적합니다',
        '5핸드 이상이면 흐름 분석이 정확해집니다',
      ],
    }
  }

  let level: FlowInsight['level'] = 'neutral'
  if (input.momentum >= 35) level = 'hot'
  else if (input.momentum >= 12) level = 'warm'
  else if (input.momentum <= -35) level = 'ice'
  else if (input.momentum <= -12) level = 'cold'

  const titles: Record<FlowInsight['level'], string> = {
    hot: '상승 흐름 — 공격적으로 밀어볼 타이밍',
    warm: '양호한 흐름 — 선택적으로 압박',
    neutral: '중립 흐름 — 기준선 유지',
    cold: '하락 흐름 — 타이트하게 재정비',
    ice: '냉각 구간 — 리스크 최소화',
  }

  const bullets: string[] = []
  bullets.push(
    `평균 최종 승률 ${input.avgFinalEquity.toFixed(1)}% · 프리플랍 대비 ${input.equityDeltaAvg >= 0 ? '+' : ''}${input.equityDeltaAvg.toFixed(1)}%p`,
  )
  if (input.winRateKnown != null) {
    bullets.push(`기록된 결과 기준 승률 ${input.winRateKnown.toFixed(0)}%`)
  } else {
    bullets.push('아직 승/패 결과가 적어 실전 승률은 참고용입니다')
  }
  bullets.push(
    input.equityTrend === 'up'
      ? '세션 후반 승률이 올라가는 추세'
      : input.equityTrend === 'down'
        ? '세션 후반 승률이 내려가는 추세 — 핸드 선택 재점검'
        : '승률 추세는 비교적 평탄',
  )
  if (input.foldRate >= 45) bullets.push(`폴드 권고 비중 ${input.foldRate.toFixed(0)}% — 진입을 더 까다롭게`)
  if (input.raiseRate >= 40) bullets.push(`레이즈/올인 비중 ${input.raiseRate.toFixed(0)}% — 공격 템포가 빠른 날`)
  if (input.streetLeak) bullets.push(`주의: ${input.streetLeak}`)
  if (level === 'hot' || level === 'warm') {
    bullets.push('좋은 스팟에서는 벨류를 두껍게, 블러프는 상대 성향 보고')
  }
  if (level === 'cold' || level === 'ice') {
    bullets.push('스펙핸드·마진 스팟은 줄이고 프리미엄 위주로 리셋')
  }

  return {
    level,
    title: titles[level],
    summary: `${input.handCount}핸드 누적 · 모멘텀 ${input.momentum >= 0 ? '+' : ''}${input.momentum.toFixed(0)}`,
    bullets,
  }
}

export function snapshotFromLive(input: {
  board: Card[]
  winPct: number
  tiePct: number
  losePct: number
  action: Action
  actionLabel: string
  handLabel: string
  draws: string[]
}): StreetSnapshot {
  return {
    street: streetFromBoard(input.board),
    boardLen: input.board.length,
    winPct: input.winPct,
    tiePct: input.tiePct,
    losePct: input.losePct,
    action: input.action,
    actionLabel: input.actionLabel,
    handLabel: input.handLabel,
    draws: input.draws,
    at: new Date().toISOString(),
  }
}
