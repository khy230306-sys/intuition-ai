import {
  FIRETRUCK_ASSEMBLE_ORDER,
  FIRETRUCK_PART_META,
  FIRETRUCK_TRAY_LAYOUT,
} from '../assets/vehicles/firetruck/manifest'
import type { FiretruckPartId, VehicleEntity, VehiclePartState } from '../types/vehicle'

let seq = 0

export function createFiretruckEntity(opts?: {
  assembled?: boolean
  id?: string
}): VehicleEntity {
  const assembled = opts?.assembled ?? false
  const parts = {} as Record<string, VehiclePartState>

  for (const id of Object.keys(FIRETRUCK_PART_META) as FiretruckPartId[]) {
    const meta = FIRETRUCK_PART_META[id]
    const auto = !meta.assembleable
    parts[id] = {
      id,
      color: meta.defaultColor,
      assembled: assembled || auto,
      trayPos: { ...FIRETRUCK_TRAY_LAYOUT[id] },
      slotPos: { ...meta.slotPos },
      rotation: 0,
      paintable: meta.paintable,
      scale: 1,
    }
  }

  return {
    id: opts?.id ?? `firetruck-${++seq}`,
    type: 'firetruck',
    labelKo: '소방차',
    assetStatus: 'READY',
    parts,
    assembleOrder: [...FIRETRUCK_ASSEMBLE_ORDER],
    position: { x: 210, y: 150 },
    rotation: 0,
    velocity: { x: 0, y: 0 },
    selected: false,
    animation: 'idle',
    missionState: 'locked',
    wheelAngle: 0,
    sirenPhase: 0,
    sfxKey: 'firetruck',
  }
}

export function isFullyAssembled(entity: VehicleEntity): boolean {
  return entity.assembleOrder.every((id) => entity.parts[id]?.assembled)
}

export function paintedPartCount(entity: VehicleEntity): number {
  return Object.values(entity.parts).filter((p) => p.paintable && p.assembled).length
}

export function cloneEntity(entity: VehicleEntity): VehicleEntity {
  return {
    ...entity,
    position: { ...entity.position },
    velocity: { ...entity.velocity },
    assembleOrder: [...entity.assembleOrder],
    parts: Object.fromEntries(
      Object.entries(entity.parts).map(([k, p]) => [
        k,
        { ...p, trayPos: { ...p.trayPos }, slotPos: { ...p.slotPos } },
      ]),
    ),
  }
}
