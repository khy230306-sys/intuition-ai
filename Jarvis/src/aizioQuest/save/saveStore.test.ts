import { describe, expect, it } from 'vitest'
import { applyXp, defaultSave, unlockHeroesForStage, xpToNext } from './saveStore'

describe('quest save progression', () => {
  it('levels up from XP and unlocks heroes by stage', () => {
    const base = defaultSave()
    let next = applyXp({ ...base, heroId: 'kael', credit: 120 }, xpToNext(1) + 10)
    expect(next.level).toBeGreaterThanOrEqual(2)
    next = unlockHeroesForStage({ ...next, stageCleared: 3 }, 3)
    expect(next.unlockedHeroes).toContain('mira')
    next = unlockHeroesForStage({ ...next, stageCleared: 7 }, 7)
    expect(next.unlockedHeroes).toContain('nyx')
  })
})
