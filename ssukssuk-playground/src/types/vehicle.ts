/** Vehicle Entity — production runtime model for workshop vehicles. */

export type AssetStatus = 'READY' | 'ASSET_REQUIRED'

export type VehicleTypeId = 'firetruck' | 'excavator' | 'dumptruck' | 'crane' | 'ambulance'

export type FiretruckPartId =
  | 'shadow'
  | 'body'
  | 'door'
  | 'window'
  | 'bumper'
  | 'ladder'
  | 'light'
  | 'frontWheel'
  | 'rearWheel'

export type VehiclePartId = FiretruckPartId

export type WorkshopStage =
  | 'select'
  | 'assemble'
  | 'paint'
  | 'drive'
  | 'mission'
  | 'reward'

export type VehicleAnimation =
  | 'idle'
  | 'bounce'
  | 'drive'
  | 'siren'
  | 'celebrate'
  | 'sad'

export type MissionState = 'locked' | 'ready' | 'active' | 'complete' | 'failed'

export type Vec2 = { x: number; y: number }

export type VehiclePartState = {
  id: VehiclePartId
  /** Current fill color for paintable parts. */
  color: string
  /** Whether the part is snapped onto the chassis. */
  assembled: boolean
  /** Tray / free position before assembly (stage coords). */
  trayPos: Vec2
  /** Local offset on chassis (fixed slot). */
  slotPos: Vec2
  rotation: number
  paintable: boolean
  /** Optional per-part scale for bounce FX. */
  scale: number
}

export type VehicleEntity = {
  id: string
  type: VehicleTypeId
  labelKo: string
  assetStatus: AssetStatus
  parts: Record<string, VehiclePartState>
  assembleOrder: VehiclePartId[]
  position: Vec2
  rotation: number
  velocity: Vec2
  selected: boolean
  animation: VehicleAnimation
  missionState: MissionState
  /** Wheel spin radians while driving. */
  wheelAngle: number
  /** Siren blink phase 0..1 */
  sirenPhase: number
  sfxKey: string
}

export type PaintSwatch = {
  id: string
  ko: string
  hex: string
}

export type MissionDefinition = {
  id: string
  title: string
  hint: string
  target: Vec2
  radius: number
  rewardStars: number
}
