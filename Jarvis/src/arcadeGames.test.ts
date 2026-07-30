import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  breakoutPaddleBounce,
  flappyPipeCleared,
  levelFromUnits,
  loadArcadeBest,
  loadArcadeBestLevel,
  nextWeaponTier,
  pongPaddleBounce,
  shooterFirePattern,
  unitsPerLevel,
} from './arcadeGames'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('arcade helpers', () => {
  beforeEach(() => store.clear())

  it('maps paddle hit to bounce vx', () => {
    expect(breakoutPaddleBounce(50, 20, 60)).toBeCloseTo(0)
    expect(breakoutPaddleBounce(80, 20, 60)).toBeGreaterThan(0)
    expect(pongPaddleBounce(80, 20, 60)).toBeGreaterThan(0)
    expect(flappyPipeCleared(90, 40, 28, false)).toBe(true)
    expect(flappyPipeCleared(90, 40, 28, true)).toBe(false)
    expect(loadArcadeBest().flappy).toBeNull()
    expect(loadArcadeBest().dodge).toBeNull()
    expect(loadArcadeBest().pong).toBeNull()
    expect(loadArcadeBest().catch).toBeNull()
    expect(loadArcadeBest().mole).toBeNull()
    expect(loadArcadeBest().lanes).toBeNull()
  })

  it('levels up one step at a time from progress units', () => {
    expect(unitsPerLevel('dodge')).toBe(8)
    expect(unitsPerLevel('catch')).toBe(8)
    expect(unitsPerLevel('mole')).toBe(6)
    expect(unitsPerLevel('lanes')).toBe(12)
    expect(levelFromUnits('flappy', 5)).toBe(2)
    expect(levelFromUnits('shooter', 10)).toBe(3)
    expect(levelFromUnits('pong', 4)).toBe(1)
    expect(levelFromUnits('breakout', 0)).toBe(1)
    expect(levelFromUnits('breakout', 2)).toBe(3)
    expect(levelFromUnits('catch', 8)).toBe(2)
    expect(levelFromUnits('mole', 6)).toBe(2)
    expect(levelFromUnits('lanes', 12)).toBe(2)
  })

  it('loads empty best levels by default', () => {
    expect(loadArcadeBestLevel().shooter).toBeNull()
    expect(loadArcadeBestLevel().breakout).toBeNull()
  })

  it('evolves space missile tiers and fire patterns', () => {
    expect(nextWeaponTier(1)).toBe(2)
    expect(nextWeaponTier(4)).toBe(5)
    expect(nextWeaponTier(5)).toBe(5)
    expect(shooterFirePattern(1, 100, 200)).toHaveLength(1)
    expect(shooterFirePattern(2, 100, 200)).toHaveLength(2)
    expect(shooterFirePattern(3, 100, 200)).toHaveLength(3)
    expect(shooterFirePattern(4, 100, 200)).toHaveLength(5)
    expect(shooterFirePattern(5, 100, 200).some((b) => b.pierce > 0)).toBe(true)
  })
})
