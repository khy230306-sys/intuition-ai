import { SNAP_RADIUS } from '../assets/vehicles/firetruck/manifest'
import type { FiretruckPartId, VehicleEntity, Vec2 } from '../types/vehicle'
import { isFullyAssembled } from './createFiretruck'

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function trySnapPart(
  entity: VehicleEntity,
  partId: FiretruckPartId,
  pointer: Vec2,
): VehicleEntity {
  const part = entity.parts[partId]
  if (!part || part.assembled) return entity

  // Assemble stage uses absolute tray coords aligned with chassis slot positions.
  const slot = part.slotPos
  if (distance(pointer, slot) <= SNAP_RADIUS) {
    return {
      ...entity,
      animation: 'bounce',
      parts: {
        ...entity.parts,
        [partId]: {
          ...part,
          assembled: true,
          trayPos: { ...slot },
          scale: 1.08,
        },
      },
    }
  }

  return {
    ...entity,
    parts: {
      ...entity.parts,
      [partId]: {
        ...part,
        trayPos: { ...pointer },
      },
    },
  }
}

export function paintPart(
  entity: VehicleEntity,
  partId: FiretruckPartId,
  color: string,
): VehicleEntity {
  const part = entity.parts[partId]
  if (!part?.paintable || !part.assembled) return entity
  return {
    ...entity,
    animation: 'bounce',
    parts: {
      ...entity.parts,
      [partId]: { ...part, color, scale: 1.06 },
    },
  }
}

export function moveVehicle(entity: VehicleEntity, next: Vec2, bounds: { w: number; h: number }): VehicleEntity {
  const x = Math.min(bounds.w - 40, Math.max(40, next.x))
  const y = Math.min(bounds.h - 40, Math.max(60, next.y))
  const dx = x - entity.position.x
  const wheelAngle = entity.wheelAngle + dx * 0.04
  return {
    ...entity,
    position: { x, y },
    velocity: { x: dx, y: y - entity.position.y },
    wheelAngle,
    animation: Math.abs(dx) > 0.5 ? 'drive' : entity.animation,
    rotation: Math.max(-8, Math.min(8, dx * 0.15)),
  }
}

export function tickVehicle(entity: VehicleEntity, dt: number): VehicleEntity {
  let scaleDecay = entity
  const parts = { ...entity.parts }
  let changed = false
  for (const [id, part] of Object.entries(parts)) {
    if (part.scale !== 1) {
      const next = 1 + (part.scale - 1) * Math.exp(-dt * 8)
      parts[id] = { ...part, scale: Math.abs(next - 1) < 0.01 ? 1 : next }
      changed = true
    }
  }
  if (changed) scaleDecay = { ...entity, parts }

  const sirenPhase =
    scaleDecay.animation === 'siren' || scaleDecay.animation === 'celebrate'
      ? (scaleDecay.sirenPhase + dt * 3) % 1
      : scaleDecay.sirenPhase

  let animation = scaleDecay.animation
  if (animation === 'bounce' && Object.values(parts).every((p) => p.scale === 1)) {
    animation = isFullyAssembled(scaleDecay) ? 'idle' : 'idle'
  }
  if (animation === 'drive' && Math.hypot(scaleDecay.velocity.x, scaleDecay.velocity.y) < 0.2) {
    animation = 'idle'
  }

  return {
    ...scaleDecay,
    sirenPhase,
    animation,
    rotation: scaleDecay.rotation * Math.exp(-dt * 6),
    velocity: {
      x: scaleDecay.velocity.x * Math.exp(-dt * 8),
      y: scaleDecay.velocity.y * Math.exp(-dt * 8),
    },
  }
}

export function hitTestPart(
  entity: VehicleEntity,
  pointer: Vec2,
  assembledOnly: boolean,
): FiretruckPartId | null {
  const order = [...entity.assembleOrder].reverse()
  for (const id of order) {
    const part = entity.parts[id]
    if (!part) continue
    if (assembledOnly && !part.assembled) continue
    if (!assembledOnly && part.assembled) continue
    const pos = part.assembled
      ? {
          x: entity.position.x + (part.slotPos.x - 210),
          y: entity.position.y + (part.slotPos.y - 150),
        }
      : part.trayPos
    // Use generous circular hit for kids.
    if (distance(pointer, pos) <= 42) return id as FiretruckPartId
  }
  return null
}

export function startMission(entity: VehicleEntity): VehicleEntity {
  if (!isFullyAssembled(entity)) return entity
  return {
    ...entity,
    missionState: 'active',
    animation: 'siren',
  }
}

export function completeMission(entity: VehicleEntity): VehicleEntity {
  return {
    ...entity,
    missionState: 'complete',
    animation: 'celebrate',
    velocity: { x: 0, y: 0 },
  }
}
