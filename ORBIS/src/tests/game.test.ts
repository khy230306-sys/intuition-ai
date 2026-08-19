import { describe, expect, it } from 'vitest'
import {
  angleDelta,
  createRings,
  createStage,
  isAligned,
  normalizeAngle,
  rotateRing,
  scoreForClear,
} from '../game/align/engine'

describe('ORBIS ALIGN engine', () => {
  it('normalizes angles and deltas', () => {
    expect(normalizeAngle(-30)).toBe(330)
    expect(angleDelta(10, 350)).toBe(20)
  })

  it('creates harder stages at higher levels', () => {
    const easy = createStage(1)
    const hard = createStage(10)
    expect(hard.tolerance).toBeLessThan(easy.tolerance)
    expect(hard.timeLimitSec).toBeLessThanOrEqual(easy.timeLimitSec)
  })

  it('rotates a selected ring', () => {
    const rings = createRings(createStage(1))
    const next = rotateRing(rings, 0, 25)
    expect(next[0]?.angle).toBe(normalizeAngle(rings[0]!.angle + 25))
    expect(next[1]?.angle).toBe(rings[1]?.angle)
  })

  it('detects alignment within tolerance', () => {
    const rings = createRings(createStage(1)).map((ring, index) => ({
      ...ring,
      angle: index === 0 ? 3 : index === 1 ? 358 : 2,
    }))
    expect(isAligned(rings, 8)).toBe(true)
    expect(isAligned(rings, 1)).toBe(false)
  })

  it('scores clears with positive gain', () => {
    expect(scoreForClear(2, 20, 12, [2, 3, 1])).toBeGreaterThan(20)
  })
})
