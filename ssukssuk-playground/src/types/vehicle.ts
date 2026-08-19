/** Shared runtime types (entity + workshop). Graphics via Asset Registry only. */

export type AssetStatus = 'APPROVED' | 'ASSET_REQUIRED' | 'REJECTED_QUALITY_GATE'

export type VehicleTypeId =
  | 'firetruck'
  | 'excavator'
  | 'dumptruck'
  | 'crane'
  | 'ambulance'
  | 'police'

export type WorkshopStage =
  | 'select'
  | 'assemble'
  | 'paint'
  | 'wash'
  | 'repair'
  | 'drive'
  | 'mission'
  | 'reward'
  | 'growth'

export type Vec2 = { x: number; y: number }

export type MissionDefinition = {
  id: string
  title: string
  hint: string
  target: Vec2
  radius: number
  rewardStars: number
}

export type PaintSwatch = {
  id: string
  ko: string
  hex: string
}
