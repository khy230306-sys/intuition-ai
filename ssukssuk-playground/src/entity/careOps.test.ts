import { describe, expect, it } from 'vitest'
import {
  applySoap,
  createCareState,
  isRepairComplete,
  isWashComplete,
  resolveIssue,
  rinseWater,
  scrubSponge,
} from './careOps'
import { createFiretruckEntity } from './createFiretruck'

describe('wash + repair care ops', () => {
  it('reduces dirt with soap + sponge + rinse', () => {
    let care = createCareState({ dirtLevel: 0.9 })
    care = applySoap(care)
    care = scrubSponge(care, 0.2)
    care = scrubSponge(care, 0.2)
    care = scrubSponge(care, 0.2)
    care = rinseWater(care)
    expect(care.dirtLevel).toBeLessThan(0.5)
    expect(care.spongeStrokes).toBe(3)
    expect(care.waterRinses).toBe(1)
  })

  it('completes wash only when clean enough and rinsed', () => {
    let care = createCareState({ dirtLevel: 0.2, waterRinses: 0 })
    expect(isWashComplete(care)).toBe(false)
    care = createCareState({ dirtLevel: 0.05, waterRinses: 1 })
    expect(isWashComplete(care)).toBe(true)
  })

  it('resolves all repair issues', () => {
    let care = createCareState()
    expect(isRepairComplete(care)).toBe(false)
    for (const issue of care.issues) {
      care = resolveIssue(care, issue.id)
    }
    expect(isRepairComplete(care)).toBe(true)
  })

  it('attaches care on firetruck entity factory', () => {
    const v = createFiretruckEntity()
    expect(v.care.dirtLevel).toBeGreaterThan(0)
    expect(v.care.issues.length).toBe(4)
  })
})
