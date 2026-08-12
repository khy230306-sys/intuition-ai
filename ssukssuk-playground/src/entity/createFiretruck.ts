/**
 * FIRE_TRUCK_01 Vehicle Entity factory.
 * Runtime entity is ready; graphics remain ASSET_REQUIRED until Quality Gate.
 */

import {
  FIRE_TRUCK_01_PART_IDS,
  FIRE_TRUCK_01_VEHICLE,
  type FireTruck01PartId,
  type VehicleDesign,
} from '../assets/registry'
import type { Vec2 } from '../types/vehicle'

export type VehiclePartState = {
  id: FireTruck01PartId
  color: string
  assembled: boolean
  trayPos: Vec2
  slotPos: Vec2
  rotation: number
  scale: number
  paintable: boolean
}

export type VehicleEntity = {
  id: string
  vehicleId: 'FIRE_TRUCK_01'
  type: 'firetruck'
  labelKo: string
  assetStatus: 'ASSET_REQUIRED' | 'APPROVED'
  parts: Record<FireTruck01PartId, VehiclePartState>
  assembleOrder: FireTruck01PartId[]
  position: Vec2
  rotation: number
  velocity: Vec2
  selected: boolean
  animation: 'idle' | 'bounce' | 'drive' | 'siren' | 'celebrate'
  missionState: 'locked' | 'ready' | 'active' | 'complete'
  wheelAngle: number
  sirenPhase: number
  /** Persisted paint design — used identically in drive/mission */
  design: VehicleDesign
}

const DEFAULT_COLORS: Record<FireTruck01PartId, string> = {
  body: '#E53935',
  frontDoor: '#FFD54F',
  rearDoor: '#E53935',
  frontWheel: '#37474F',
  rearWheel: '#37474F',
  frontRim: '#ECEFF1',
  rearRim: '#ECEFF1',
  frontWindow: '#81D4FA',
  sideWindow: '#81D4FA',
  bumper: '#CFD8DC',
  ladder: '#90A4AE',
  emergencyLight: '#29B6F6',
  hose: '#455A64',
  headLight: '#FFF59D',
  shadow: '#000000',
}

const SLOT: Record<FireTruck01PartId, Vec2> = {
  shadow: { x: 210, y: 228 },
  body: { x: 168, y: 148 },
  rearDoor: { x: 120, y: 140 },
  frontDoor: { x: 292, y: 142 },
  frontWindow: { x: 318, y: 112 },
  sideWindow: { x: 250, y: 120 },
  bumper: { x: 368, y: 168 },
  ladder: { x: 150, y: 92 },
  emergencyLight: { x: 300, y: 72 },
  hose: { x: 100, y: 150 },
  headLight: { x: 380, y: 150 },
  rearWheel: { x: 120, y: 198 },
  frontWheel: { x: 310, y: 198 },
  rearRim: { x: 120, y: 198 },
  frontRim: { x: 310, y: 198 },
}

const PAINTABLE = new Set<FireTruck01PartId>([
  'body',
  'frontDoor',
  'rearDoor',
  'frontWheel',
  'rearWheel',
  'frontRim',
  'rearRim',
  'frontWindow',
  'sideWindow',
  'bumper',
  'ladder',
  'emergencyLight',
  'hose',
  'headLight',
])

let seq = 0

export function createFiretruckEntity(opts?: {
  assembled?: boolean
  design?: VehicleDesign | null
}): VehicleEntity {
  const assembled = opts?.assembled ?? false
  const design = opts?.design ?? {
    vehicleId: 'FIRE_TRUCK_01',
    colors: {},
    assembledParts: [],
    updatedAt: Date.now(),
  }

  const parts = {} as Record<FireTruck01PartId, VehiclePartState>
  for (const id of FIRE_TRUCK_01_PART_IDS) {
    const auto = id === 'shadow'
    const regionColor = regionColorForPart(id, design)
    parts[id] = {
      id,
      color: regionColor ?? DEFAULT_COLORS[id],
      assembled: assembled || auto || design.assembledParts.includes(id),
      trayPos: { x: 60 + (FIRE_TRUCK_01_PART_IDS.indexOf(id) % 4) * 90, y: 40 + Math.floor(FIRE_TRUCK_01_PART_IDS.indexOf(id) / 4) * 70 },
      slotPos: { ...SLOT[id] },
      rotation: 0,
      scale: 1,
      paintable: PAINTABLE.has(id),
    }
  }

  return {
    id: `FIRE_TRUCK_01-${++seq}`,
    vehicleId: 'FIRE_TRUCK_01',
    type: 'firetruck',
    labelKo: FIRE_TRUCK_01_VEHICLE.labelKo,
    assetStatus: 'ASSET_REQUIRED',
    parts,
    assembleOrder: FIRE_TRUCK_01_PART_IDS.filter((p) => p !== 'shadow'),
    position: { x: 210, y: 150 },
    rotation: 0,
    velocity: { x: 0, y: 0 },
    selected: false,
    animation: 'idle',
    missionState: 'locked',
    wheelAngle: 0,
    sirenPhase: 0,
    design,
  }
}

function regionColorForPart(part: FireTruck01PartId, design: VehicleDesign): string | undefined {
  const map: Partial<Record<FireTruck01PartId, keyof NonNullable<VehicleDesign['colors']>>> = {
    body: 'BODY',
    frontDoor: 'DOOR',
    rearDoor: 'DOOR',
    frontRim: 'RIM',
    rearRim: 'RIM',
    bumper: 'BUMPER',
    ladder: 'LADDER',
    emergencyLight: 'LIGHT',
    headLight: 'LIGHT',
    hose: 'HOSE',
    frontWindow: 'WINDOW',
    sideWindow: 'WINDOW',
  }
  const region = map[part]
  return region ? design.colors[region] : undefined
}

export function isFullyAssembled(entity: VehicleEntity): boolean {
  return entity.assembleOrder.every((id) => entity.parts[id]?.assembled)
}

export function toDesign(entity: VehicleEntity): VehicleDesign {
  return {
    vehicleId: 'FIRE_TRUCK_01',
    colors: {
      BODY: entity.parts.body.color,
      DOOR: entity.parts.frontDoor.color,
      RIM: entity.parts.frontRim.color,
      BUMPER: entity.parts.bumper.color,
      LADDER: entity.parts.ladder.color,
      LIGHT: entity.parts.emergencyLight.color,
      HOSE: entity.parts.hose.color,
      WINDOW: entity.parts.frontWindow.color,
    },
    assembledParts: entity.assembleOrder.filter((id) => entity.parts[id].assembled),
    updatedAt: Date.now(),
  }
}
