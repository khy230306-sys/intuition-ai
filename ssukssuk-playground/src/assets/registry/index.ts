/**
 * Central Asset Registry — sole graphic resolution point.
 * VISUAL ASSET CONSTITUTION V1: never hardcode image paths in feature code.
 */

import { GARAGE_ASSETS, OTHER_VEHICLE_PLACEHOLDERS } from './environment'
export { GARAGE_ASSETS, OTHER_VEHICLE_PLACEHOLDERS } from './environment'
import { FIRE_TRUCK_01_ASSETS, FIRE_TRUCK_01_VEHICLE } from './fireTruck01'
import { SSUKSSUK_ASSETS, SSUKSSUK_STATES } from './ssukssuk'
import type { AssetSpec, AssetStatus } from './types'
import { REWARD_ASSETS, UI_ASSETS } from './uiAndRewards'

export * from './types'
export {
  FIRE_TRUCK_01_ASSETS,
  FIRE_TRUCK_01_PART_IDS,
  FIRE_TRUCK_01_VEHICLE,
  type FireTruck01PartId,
} from './fireTruck01'
export { SSUKSSUK_ASSETS, SSUKSSUK_STATES, type SsukssukState } from './ssukssuk'

export const ALL_ASSETS: AssetSpec[] = [
  ...SSUKSSUK_ASSETS,
  ...FIRE_TRUCK_01_ASSETS,
  ...GARAGE_ASSETS,
  ...UI_ASSETS,
  ...REWARD_ASSETS,
  ...OTHER_VEHICLE_PLACEHOLDERS,
]

const byId = new Map(ALL_ASSETS.map((a) => [a.id, a]))

export function getAsset(id: string): AssetSpec {
  const asset = byId.get(id)
  if (!asset) throw new Error(`Unknown asset id: ${id}`)
  return asset
}

export function tryGetAsset(id: string): AssetSpec | undefined {
  return byId.get(id)
}

export function assetsByStatus(status: AssetStatus): AssetSpec[] {
  return ALL_ASSETS.filter((a) => a.status === status)
}

export function baselineTriad() {
  const groups = {
    ssukssuk: ALL_ASSETS.filter((a) => a.baselineGroup === 'ssukssuk'),
    fire_truck_01: ALL_ASSETS.filter((a) => a.baselineGroup === 'fire_truck_01'),
    garage: ALL_ASSETS.filter((a) => a.baselineGroup === 'garage'),
  }
  const approved = (list: AssetSpec[]) =>
    list.length > 0 && list.every((a) => a.status === 'APPROVED')
  return {
    groups,
    ssukssukReady: approved(groups.ssukssuk),
    fireTruckReady: approved(groups.fire_truck_01),
    garageReady: approved(groups.garage),
    allReady:
      approved(groups.ssukssuk) &&
      approved(groups.fire_truck_01) &&
      approved(groups.garage),
    requiredCount: ALL_ASSETS.filter((a) => a.status === 'ASSET_REQUIRED').length,
    approvedCount: ALL_ASSETS.filter((a) => a.status === 'APPROVED').length,
  }
}

export function isWorkshopPlayable(): boolean {
  return baselineTriad().allReady
}

export const VEHICLE_CATALOG = [
  {
    type: 'firetruck' as const,
    vehicleId: FIRE_TRUCK_01_VEHICLE.id,
    labelKo: FIRE_TRUCK_01_VEHICLE.labelKo,
    labelEn: FIRE_TRUCK_01_VEHICLE.labelEn,
    assetStatus: FIRE_TRUCK_01_VEHICLE.status,
    workshopReady: FIRE_TRUCK_01_VEHICLE.workshopReady,
    note: FIRE_TRUCK_01_VEHICLE.note,
  },
  {
    type: 'excavator' as const,
    vehicleId: 'EXCAVATOR_01',
    labelKo: '굴착기',
    labelEn: 'Excavator',
    assetStatus: 'ASSET_REQUIRED' as const,
    workshopReady: false,
    note: '기준 트라이어드(쑥쑥이 + FIRE_TRUCK_01 + 공방) 승인 후 확장.',
  },
  {
    type: 'dumptruck' as const,
    vehicleId: 'DUMPTRUCK_01',
    labelKo: '덤프트럭',
    labelEn: 'Dump truck',
    assetStatus: 'ASSET_REQUIRED' as const,
    workshopReady: false,
    note: '기준 승인 후 확장.',
  },
  {
    type: 'crane' as const,
    vehicleId: 'CRANE_01',
    labelKo: '크레인',
    labelEn: 'Crane',
    assetStatus: 'ASSET_REQUIRED' as const,
    workshopReady: false,
    note: '기준 승인 후 확장.',
  },
  {
    type: 'ambulance' as const,
    vehicleId: 'AMBULANCE_01',
    labelKo: '구급차',
    labelEn: 'Ambulance',
    assetStatus: 'ASSET_REQUIRED' as const,
    workshopReady: false,
    note: '기준 승인 후 확장.',
  },
  {
    type: 'police' as const,
    vehicleId: 'POLICE_01',
    labelKo: '경찰차',
    labelEn: 'Police car',
    assetStatus: 'ASSET_REQUIRED' as const,
    workshopReady: false,
    note: '기준 승인 후 확장.',
  },
]

export const CHARACTER_SLOTS = [
  {
    id: 'ssukssuk',
    labelKo: '쑥쑥이',
    poses: [...SSUKSSUK_STATES],
    assetStatus: 'ASSET_REQUIRED' as const,
    assetIds: SSUKSSUK_ASSETS.map((a) => a.id),
  },
]
