import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  applyShooterSpread,
  ARCADE_META,
  breakoutPaddleBounce,
  flappyPipeCleared,
  levelFromUnits,
  loadArcadeBest,
  loadArcadeBestLevel,
  nextSpreadBoost,
  nextWeaponTier,
  pongPaddleBounce,
  SHOOTER_WIDE_UNLOCK_LEVEL,
  shooterEnemyFallSpeed,
  shooterFirePattern,
  shooterSpawnInterval,
  slideGridSize,
  slideIsSolved,
  slideScramble,
  slideSolvedBoard,
  slideTimeLimitSec,
  GYEOKPA_LASER_BEAM_LEN,
  GYEOKPA_MAX_ALLIES,
  GYEOKPA_WEAPONS,
  gyeokpaAllySlotOffsets,
  gyeokpaNextWeapon,
  gyeokpaWeaponLabel,
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
  })

  it('levels up one step at a time from progress units', () => {
    expect(unitsPerLevel('dodge')).toBe(8)
    expect(unitsPerLevel('slide')).toBe(1)
    expect(unitsPerLevel('gyeokpa')).toBe(6)
    expect(levelFromUnits('flappy', 5)).toBe(2)
    expect(levelFromUnits('shooter', 10)).toBe(3)
    expect(levelFromUnits('pong', 4)).toBe(1)
    expect(levelFromUnits('breakout', 0)).toBe(1)
    expect(levelFromUnits('breakout', 2)).toBe(3)
    expect(levelFromUnits('gyeokpa', 6)).toBe(2)
  })

  it('loads empty best levels by default', () => {
    expect(loadArcadeBestLevel().shooter).toBeNull()
    expect(loadArcadeBestLevel().breakout).toBeNull()
    expect(loadArcadeBest().slide).toBeNull()
    expect(loadArcadeBestLevel().slide).toBeNull()
    expect(loadArcadeBest().gyeokpa).toBeNull()
    expect(loadArcadeBestLevel().gyeokpa).toBeNull()
  })

  it('configures 스페이스2 weapon cycle (no wingmen)', () => {
    expect(ARCADE_META.gyeokpa.title).toBe('스페이스2')
    expect(GYEOKPA_MAX_ALLIES).toBe(0)
    expect(gyeokpaAllySlotOffsets()).toHaveLength(0)
    expect(GYEOKPA_WEAPONS).toEqual(['pulse', 'twin', 'spread', 'laser'])
    expect(GYEOKPA_LASER_BEAM_LEN).toBeGreaterThanOrEqual(240)
    expect(gyeokpaNextWeapon('pulse')).toBe('twin')
    expect(gyeokpaNextWeapon('twin')).toBe('spread')
    expect(gyeokpaNextWeapon('spread')).toBe('laser')
    expect(gyeokpaNextWeapon('laser')).toBe('pulse')
    expect(gyeokpaWeaponLabel('laser')).toBe('레이저')
  })

  it('builds solvable sliding puzzles and grows grid with level', () => {
    expect(slideGridSize(1)).toBe(3)
    expect(slideGridSize(6)).toBe(4)
    expect(slideGridSize(13)).toBe(5)
    expect(slideIsSolved(slideSolvedBoard(3))).toBe(true)
    const { board } = slideScramble(3, 20)
    expect(board).toHaveLength(9)
    expect(board.filter((n) => n === 0)).toHaveLength(1)
    expect(slideTimeLimitSec(1, 3)).toBeGreaterThan(slideTimeLimitSec(20, 3))
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

  it('widens missile fan after Lv20 wide items', () => {
    expect(SHOOTER_WIDE_UNLOCK_LEVEL).toBe(20)
    expect(nextSpreadBoost(0)).toBe(1)
    expect(nextSpreadBoost(3)).toBe(3)
    const base = shooterFirePattern(5, 100, 200, 0)
    const wide1 = shooterFirePattern(5, 100, 200, 1)
    const wide3 = shooterFirePattern(5, 100, 200, 3)
    expect(wide1.length).toBeGreaterThan(base.length)
    expect(wide3.length).toBeGreaterThan(wide1.length)
    const maxAbsVx = (shots: ReturnType<typeof shooterFirePattern>) =>
      Math.max(...shots.map((b) => Math.abs(b.vx)))
    expect(maxAbsVx(wide3)).toBeGreaterThan(maxAbsVx(base))
    expect(applyShooterSpread(base, 100, 200, 0)).toHaveLength(base.length)
  })

  it('slows Space enemy pace from Lv21 onward', () => {
    expect(shooterEnemyFallSpeed(21)).toBeLessThan(260)
    expect(shooterEnemyFallSpeed(21)).toBeLessThan(50 + 21 * 12)
    expect(shooterSpawnInterval(21)).toBeGreaterThanOrEqual(0.55)
    expect(shooterSpawnInterval(21)).toBeGreaterThan(0.28)
    expect(shooterSpawnInterval(21)).toBeGreaterThanOrEqual(shooterSpawnInterval(20))
    expect(shooterEnemyFallSpeed(30)).toBeLessThan(shooterEnemyFallSpeed(21) + 40)
  })
})
