/**
 * Production asset registry.
 * Missing graphics must stay ASSET_REQUIRED — never fake-complete with crops/emoji/placeholders.
 */

import type { AssetStatus, VehicleTypeId } from '../types/vehicle'

export type VehicleCatalogEntry = {
  type: VehicleTypeId
  labelKo: string
  labelEn: string
  assetStatus: AssetStatus
  workshopReady: boolean
  note: string
}

export const VEHICLE_CATALOG: VehicleCatalogEntry[] = [
  {
    type: 'firetruck',
    labelKo: '소방차',
    labelEn: 'Fire truck',
    assetStatus: 'READY',
    workshopReady: true,
    note: 'Production parts ready: body, door, window, bumper, ladder, light, wheels, shadow.',
  },
  {
    type: 'excavator',
    labelKo: '굴착기',
    labelEn: 'Excavator',
    assetStatus: 'ASSET_REQUIRED',
    workshopReady: false,
    note: 'Parts not authored. Expand only after firetruck pipeline passes commercial bar.',
  },
  {
    type: 'dumptruck',
    labelKo: '덤프트럭',
    labelEn: 'Dump truck',
    assetStatus: 'ASSET_REQUIRED',
    workshopReady: false,
    note: 'Parts not authored.',
  },
  {
    type: 'crane',
    labelKo: '크레인',
    labelEn: 'Crane',
    assetStatus: 'ASSET_REQUIRED',
    workshopReady: false,
    note: 'Parts not authored.',
  },
  {
    type: 'ambulance',
    labelKo: '구급차',
    labelEn: 'Ambulance',
    assetStatus: 'ASSET_REQUIRED',
    workshopReady: false,
    note: 'Parts not authored.',
  },
]

export type CharacterSlot = {
  id: string
  labelKo: string
  poses: string[]
  assetStatus: AssetStatus
}

export const CHARACTER_SLOTS: CharacterSlot[] = [
  {
    id: 'ssukssuk',
    labelKo: '쑥쑥이',
    poses: ['idle', 'walk', 'jump', 'happy', 'surprised', 'thinking', 'cheer', 'sad', 'celebrate'],
    assetStatus: 'ASSET_REQUIRED',
  },
]

export function getVehicleCatalog(type: VehicleTypeId): VehicleCatalogEntry {
  const found = VEHICLE_CATALOG.find((v) => v.type === type)
  if (!found) throw new Error(`Unknown vehicle type: ${type}`)
  return found
}
