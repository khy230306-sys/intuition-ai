import type { GrowthEvent, GrowthState, ParentReportLine } from './types'

const KEY = 'ssukssuk.growth.v1'

export function loadGrowth(): GrowthState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { events: [], unlockedRewards: [] }
    return JSON.parse(raw) as GrowthState
  } catch {
    return { events: [], unlockedRewards: [] }
  }
}

export function saveGrowth(state: GrowthState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function recordGrowthEvent(event: Omit<GrowthEvent, 'id' | 'at'> & { at?: number }): GrowthState {
  const state = loadGrowth()
  const full: GrowthEvent = {
    ...event,
    id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: event.at ?? Date.now(),
  }
  const next = { ...state, events: [...state.events, full] }
  saveGrowth(next)
  return next
}

export function unlockReward(rewardId: string): GrowthState {
  const state = loadGrowth()
  if (state.unlockedRewards.includes(rewardId)) return state
  const next = { ...state, unlockedRewards: [...state.unlockedRewards, rewardId] }
  saveGrowth(next)
  return next
}

/** Soft descriptive lines for parents — never raw shame scores. */
export function buildParentReport(state: GrowthState = loadGrowth()): ParentReportLine[] {
  const lines: ParentReportLine[] = []
  const bySkill = new Map<string, GrowthEvent[]>()
  for (const e of state.events) {
    const list = bySkill.get(e.skill) ?? []
    list.push(e)
    bySkill.set(e.skill, list)
  }

  const spatial = bySkill.get('spatial_reasoning') ?? []
  if (spatial.length) {
    const fast = spatial.filter((e) => e.hintsUsed === 0 && e.signal >= 0.7).length
    lines.push({
      at: Date.now(),
      skills: ['spatial_reasoning'],
      textKo:
        fast > 0
          ? '오늘 자동차 조립 활동에서 공간 위치를 빠르게 이해했습니다.'
          : '조립에서 위치를 다시 살펴보며 맞춰 보았습니다.',
    })
  }

  const q15 = bySkill.get('quantity_1_5') ?? []
  if (q15.length) {
    const independent = q15.every((e) => e.hintsUsed === 0)
    lines.push({
      at: Date.now(),
      skills: ['quantity_1_5'],
      textKo: independent
        ? '1~5 수량은 도움 없이 해결했습니다.'
        : '1~5 수량에서 함께 세어보는 도움이 조금 있었습니다.',
    })
  }

  const q610 = bySkill.get('quantity_6_10') ?? []
  if (q610.some((e) => e.retries > 0)) {
    lines.push({
      at: Date.now(),
      skills: ['quantity_6_10'],
      textKo: '6~10에서는 다시 세어보는 행동이 나타났습니다.',
    })
  }

  return lines
}

export function softHint(ko: string): string {
  // Phase 15 — never expose WRONG/FAIL copy from growth layer
  return ko
}
