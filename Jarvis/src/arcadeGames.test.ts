import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  breakoutPaddleBounce,
  flappyPipeCleared,
  levelFromUnits,
  loadArcadeBest,
  loadArcadeBestLevel,
  pongPaddleBounce,
  snakeWouldHitSelf,
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

  it('detects snake self collision', () => {
    const body = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ]
    expect(snakeWouldHitSelf(body, { x: 3, y: 5 })).toBe(true)
    expect(snakeWouldHitSelf(body, { x: 6, y: 5 })).toBe(false)
  })

  it('maps paddle hit to bounce vx', () => {
    expect(breakoutPaddleBounce(50, 20, 60)).toBeCloseTo(0)
    expect(breakoutPaddleBounce(80, 20, 60)).toBeGreaterThan(0)
    expect(pongPaddleBounce(80, 20, 60)).toBeGreaterThan(0)
    expect(flappyPipeCleared(90, 40, 28, false)).toBe(true)
    expect(flappyPipeCleared(90, 40, 28, true)).toBe(false)
    expect(loadArcadeBest().flappy).toBeNull()
    expect(loadArcadeBest().dodge).toBeNull()
    expect(loadArcadeBest().pong).toBeNull()
  })

  it('levels up one step at a time from progress units', () => {
    expect(unitsPerLevel('snake')).toBe(3)
    expect(unitsPerLevel('dodge')).toBe(8)
    expect(levelFromUnits('snake', 0)).toBe(1)
    expect(levelFromUnits('snake', 2)).toBe(1)
    expect(levelFromUnits('snake', 3)).toBe(2)
    expect(levelFromUnits('snake', 6)).toBe(3)
    expect(levelFromUnits('flappy', 5)).toBe(2)
    expect(levelFromUnits('shooter', 10)).toBe(3)
    expect(levelFromUnits('pong', 4)).toBe(1)
    expect(levelFromUnits('breakout', 0)).toBe(1)
    expect(levelFromUnits('breakout', 2)).toBe(3)
  })

  it('loads empty best levels by default', () => {
    expect(loadArcadeBestLevel().snake).toBeNull()
    expect(loadArcadeBestLevel().breakout).toBeNull()
  })
})
