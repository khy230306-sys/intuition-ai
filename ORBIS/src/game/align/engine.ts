import type { AlignPhase, RingState, StageConfig } from './types'

export function normalizeAngle(degrees: number): number {
  const value = degrees % 360
  return value < 0 ? value + 360 : value
}

export function angleDelta(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b)) % 360
  return diff > 180 ? 360 - diff : diff
}

export function createStage(level: number): StageConfig {
  const clamped = Math.max(1, Math.min(level, 20))
  const tolerance = Math.max(6, 20 - clamped)
  const timeLimitSec = Math.max(20, 55 - clamped * 2)
  const baseDrift = clamped >= 3 ? 4 + clamped * 0.8 : 0
  return {
    level: clamped,
    tolerance,
    timeLimitSec,
    drifts: [baseDrift, -baseDrift * 0.7, baseDrift * 1.15],
  }
}

export function createRings(config: StageConfig): RingState[] {
  const colors: Array<RingState['color']> = ['blue', 'gold', 'violet']
  return colors.map((color, index) => ({
    id: `ring-${index}`,
    angle: randomAngleAvoidingZero(config.tolerance + 20),
    drift: config.drifts[index] ?? 0,
    color,
  }))
}

function randomAngleAvoidingZero(minOffset: number): number {
  for (let i = 0; i < 12; i += 1) {
    const angle = Math.floor(Math.random() * 360)
    if (angleDelta(angle, 0) >= minOffset) return angle
  }
  return 140
}

export function rotateRing(rings: RingState[], index: number, delta: number): RingState[] {
  return rings.map((ring, i) =>
    i === index
      ? { ...ring, angle: normalizeAngle(ring.angle + delta) }
      : ring,
  )
}

export function advanceDrift(rings: RingState[], dtSec: number): RingState[] {
  return rings.map((ring) => ({
    ...ring,
    angle: normalizeAngle(ring.angle + ring.drift * dtSec),
  }))
}

export function isAligned(rings: RingState[], tolerance: number): boolean {
  return rings.every((ring) => angleDelta(ring.angle, 0) <= tolerance)
}

export function alignmentErrors(rings: RingState[]): number[] {
  return rings.map((ring) => Number(angleDelta(ring.angle, 0).toFixed(1)))
}

export function scoreForClear(level: number, timeLeft: number, tolerance: number, errors: number[]): number {
  const precision = errors.reduce((sum, err) => sum + Math.max(0, tolerance - err), 0)
  return Math.max(20, Math.round(level * 40 + timeLeft * 3 + precision * 4))
}

export function nextPhaseAfterTick(
  phase: AlignPhase,
  rings: RingState[],
  tolerance: number,
  timeLeft: number,
): AlignPhase {
  if (phase !== 'playing') return phase
  if (isAligned(rings, tolerance)) return 'cleared'
  if (timeLeft <= 0) return 'failed'
  return 'playing'
}
