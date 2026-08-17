/**
 * Prototype 01 workshop stage flow — includes wash + repair.
 * Visual entry stays gated by isWorkshopPlayable(); this module is logic only.
 */

import type { WorkshopStage } from '../types/vehicle'

export const STAGE_FLOW: WorkshopStage[] = [
  'select',
  'assemble',
  'paint',
  'wash',
  'repair',
  'drive',
  'mission',
  'reward',
  'growth',
]

export const STAGE_LABELS: Record<WorkshopStage, string> = {
  select: '선택',
  assemble: '조립',
  paint: '색칠',
  wash: '세차',
  repair: '정비',
  drive: '운전',
  mission: '미션',
  reward: '보상',
  growth: '성장',
}

export const STAGE_HINTS: Record<WorkshopStage, string> = {
  select: 'FIRE_TRUCK_01만 Prototype 01 기준 차량입니다.',
  assemble: '파츠를 끌어 슬롯에 스냅합니다.',
  paint: '파츠별 색 상태만 저장합니다. hue-filter 금지.',
  wash: '문지르기 · 물 · 거품 · 스펀지로 dirt를 낮춥니다.',
  repair: '관찰 · 찾기 · 시도 · 해결로 이슈를 고칩니다.',
  drive: '같은 customization으로 운전합니다.',
  mission: '화재 신고 → 출동 → 호스 → 진압 → 구조.',
  reward: '보상은 Registry APPROVED 비트맵만.',
  growth: '부모 리포트용 Growth 이벤트를 기록합니다.',
}

export function unlockThrough(stage: WorkshopStage): WorkshopStage[] {
  const idx = STAGE_FLOW.indexOf(stage)
  if (idx < 0) return ['select']
  return STAGE_FLOW.slice(0, idx + 1)
}

export function nextStage(stage: WorkshopStage): WorkshopStage | null {
  const idx = STAGE_FLOW.indexOf(stage)
  if (idx < 0 || idx >= STAGE_FLOW.length - 1) return null
  return STAGE_FLOW[idx + 1]
}

/** Visual play stages beyond select require triad GAME_READY. */
export function requiresApprovedArt(stage: WorkshopStage): boolean {
  return stage !== 'select' && stage !== 'growth'
}
