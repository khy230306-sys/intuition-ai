import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  breakoutPaddleBounce,
  flappyPipeCleared,
  loadArcadeBest,
  pongPaddleBounce,
  snakeWouldHitSelf,
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
})
