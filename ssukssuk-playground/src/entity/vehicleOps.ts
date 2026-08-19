import type { FireTruck01PartId } from '../assets/registry'
import type { Vec2 } from '../types/vehicle'
import { isFullyAssembled, type VehicleEntity } from './createFiretruck'

const SNAP_RADIUS = 48

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function trySnapPart(
  entity: VehicleEntity,
  partId: FireTruck01PartId,
  pointer: Vec2,
): VehicleEntity {
  const part = entity.parts[partId]
  if (!part || part.assembled) return entity
  const slot = part.slotPos
  if (distance(pointer, slot) > SNAP_RADIUS) {
    return {
      ...entity,
      parts: {
        ...entity.parts,
        [partId]: { ...part, trayPos: { ...pointer } },
      },
    }
  }
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

export function paintPart(
  entity: VehicleEntity,
  partId: FireTruck01PartId,
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

export function moveVehicle(
  entity: VehicleEntity,
  next: Vec2,
  bounds: { w: number; h: number },
): VehicleEntity {
  const x = Math.min(bounds.w - 40, Math.max(40, next.x))
  const y = Math.min(bounds.h - 40, Math.max(60, next.y))
  const dx = x - entity.position.x
  return {
    ...entity,
    position: { x, y },
    velocity: { x: dx, y: y - entity.position.y },
    wheelAngle: entity.wheelAngle + dx * 0.04,
    animation: Math.abs(dx) > 0.5 ? 'drive' : entity.animation,
    rotation: Math.max(-8, Math.min(8, dx * 0.15)),
  }
}

export function tickVehicle(entity: VehicleEntity, dt: number): VehicleEntity {
  const parts = { ...entity.parts }
  let changed = false
  for (const [id, part] of Object.entries(parts) as [FireTruck01PartId, (typeof parts)[FireTruck01PartId]][]) {
    if (part.scale !== 1) {
      const next = 1 + (part.scale - 1) * Math.exp(-dt * 8)
      parts[id] = { ...part, scale: Math.abs(next - 1) < 0.01 ? 1 : next }
      changed = true
    }
  }
  let nextEntity = changed ? { ...entity, parts } : entity
  const sirenPhase =
    nextEntity.animation === 'siren' || nextEntity.animation === 'celebrate'
      ? (nextEntity.sirenPhase + dt * 3) % 1
      : nextEntity.sirenPhase
  let animation = nextEntity.animation
  if (animation === 'drive' && Math.hypot(nextEntity.velocity.x, nextEntity.velocity.y) < 0.2) {
    animation = 'idle'
  }
  return {
    ...nextEntity,
    sirenPhase,
    animation,
    rotation: nextEntity.rotation * Math.exp(-dt * 6),
    velocity: {
      x: nextEntity.velocity.x * Math.exp(-dt * 8),
      y: nextEntity.velocity.y * Math.exp(-dt * 8),
    },
  }
}

export function hitTestPart(
  entity: VehicleEntity,
  pointer: Vec2,
  assembledOnly: boolean,
): FireTruck01PartId | null {
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
    if (distance(pointer, pos) <= 42) return id
  }
  return null
}

export function startMission(entity: VehicleEntity): VehicleEntity {
  if (!isFullyAssembled(entity)) return entity
  return { ...entity, missionState: 'active', animation: 'siren' }
}

export function completeMission(entity: VehicleEntity): VehicleEntity {
  return {
    ...entity,
    missionState: 'complete',
    animation: 'celebrate',
    velocity: { x: 0, y: 0 },
  }
}
