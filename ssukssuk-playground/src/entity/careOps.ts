/**
 * Wash + repair care logic for FIRE_TRUCK_01.
 * Pure entity state — no temporary wash/repair graphics.
 */

import type { VehicleEntity } from './createFiretruck'

export type RepairIssueId =
  | 'loose_ladder'
  | 'flat_front_tire'
  | 'dirty_hose'
  | 'dim_headlight'

export type RepairIssue = {
  id: RepairIssueId
  labelKo: string
  hintKo: string
  resolved: boolean
}

export type CareState = {
  /** 0 = clean, 1 = fully dirty */
  dirtLevel: number
  soapBubbles: number
  spongeStrokes: number
  waterRinses: number
  issues: RepairIssue[]
}

export const DEFAULT_ISSUES: RepairIssue[] = [
  {
    id: 'loose_ladder',
    labelKo: '사다리가 흔들려요',
    hintKo: '사다리를 톡톡 눌러 고정해요',
    resolved: false,
  },
  {
    id: 'flat_front_tire',
    labelKo: '앞바퀴 바람이 빠졌어요',
    hintKo: '앞바퀴를 문질러 바람을 넣어요',
    resolved: false,
  },
  {
    id: 'dirty_hose',
    labelKo: '호스가 더러워요',
    hintKo: '호스를 닦아 주세요',
    resolved: false,
  },
  {
    id: 'dim_headlight',
    labelKo: '헤드라이트가 어두워요',
    hintKo: '헤드라이트를 눌러 켜요',
    resolved: false,
  },
]

export function createCareState(partial?: Partial<CareState>): CareState {
  return {
    dirtLevel: partial?.dirtLevel ?? 0.85,
    soapBubbles: partial?.soapBubbles ?? 0,
    spongeStrokes: partial?.spongeStrokes ?? 0,
    waterRinses: partial?.waterRinses ?? 0,
    issues: (partial?.issues ?? DEFAULT_ISSUES).map((i) => ({ ...i })),
  }
}

export function applySoap(care: CareState, amount = 0.12): CareState {
  return {
    ...care,
    soapBubbles: Math.min(1, care.soapBubbles + amount),
  }
}

export function scrubSponge(care: CareState, strength = 0.08): CareState {
  const soapBoost = 1 + care.soapBubbles * 0.6
  const nextDirt = Math.max(0, care.dirtLevel - strength * soapBoost)
  return {
    ...care,
    dirtLevel: nextDirt,
    spongeStrokes: care.spongeStrokes + 1,
    soapBubbles: Math.max(0, care.soapBubbles - 0.04),
  }
}

export function rinseWater(care: CareState): CareState {
  return {
    ...care,
    waterRinses: care.waterRinses + 1,
    soapBubbles: Math.max(0, care.soapBubbles - 0.25),
    dirtLevel: Math.max(0, care.dirtLevel - 0.05),
  }
}

export function isWashComplete(care: CareState): boolean {
  return care.dirtLevel <= 0.08 && care.waterRinses >= 1
}

export function resolveIssue(care: CareState, id: RepairIssueId): CareState {
  return {
    ...care,
    issues: care.issues.map((issue) =>
      issue.id === id ? { ...issue, resolved: true } : issue,
    ),
  }
}

export function isRepairComplete(care: CareState): boolean {
  return care.issues.length > 0 && care.issues.every((i) => i.resolved)
}

export function attachCare(entity: VehicleEntity, care: CareState): VehicleEntity {
  return { ...entity, care }
}

export function careSummary(care: CareState): string {
  const open = care.issues.filter((i) => !i.resolved).length
  return `dirt ${(care.dirtLevel * 100).toFixed(0)}% · soap ${(care.soapBubbles * 100).toFixed(0)}% · 이슈 ${open}/${care.issues.length}`
}
