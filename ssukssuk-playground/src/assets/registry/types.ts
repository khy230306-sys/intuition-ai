/**
 * Central Asset Registry types — VISUAL ASSET CONSTITUTION V1.
 * Code must resolve graphics only through registry IDs.
 */

export type AssetStatus = 'APPROVED' | 'ASSET_REQUIRED' | 'REJECTED_QUALITY_GATE'

export type AssetKind =
  | 'character'
  | 'vehicle_part'
  | 'environment'
  | 'building'
  | 'prop'
  | 'ui'
  | 'effect'
  | 'sticker'
  | 'reward'

export type AssetSpec = {
  /** Stable registry ID, e.g. ASSET_FIRETRUCK_BODY */
  id: string
  kind: AssetKind
  labelKo: string
  /** Where this asset is used in the product */
  usage: string
  /** Target pixel size (display / source art guidance) */
  size: { w: number; h: number }
  transparentBackground: boolean
  /** Part structure notes (vehicles/characters) */
  partStructure?: string[]
  /** Pose / animation / interaction states required */
  states?: string[]
  animationRequirements?: string
  status: AssetStatus
  /** Relative path under public/ when APPROVED — never hardcode elsewhere */
  path?: string
  qualityGateNotes?: string
  /** Baseline triad lock: ssukssuk | fire_truck_01 | garage */
  baselineGroup?: 'ssukssuk' | 'fire_truck_01' | 'garage'
}

export type PaintRegionId =
  | 'BODY'
  | 'FRONT_DOOR'
  | 'REAR_DOOR'
  | 'DOOR'
  | 'RIM'
  | 'BUMPER'
  | 'LADDER'
  | 'LIGHT'
  | 'HOSE'
  | 'WINDOW'

export type VehicleDesign = {
  vehicleId: 'FIRE_TRUCK_01'
  /** Independent paint colors per region — never whole-vehicle hue */
  colors: Partial<Record<PaintRegionId, string>>
  assembledParts: string[]
  updatedAt: number
}
