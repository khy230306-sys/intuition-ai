import { describe, expect, it } from 'vitest'
import {
  generateCombinations,
  GeneratorValidationError,
  generateRandomGames,
} from '../src/lotto/generator/generator'
import { GOLDEN_DRAWS, GOLDEN_DATASET_VERSION } from './golden/dataset'

describe('generateCombinations', () => {
  it('generates requested game count with ids and DNA', async () => {
    const combos = await generateCombinations({
      draws: GOLDEN_DRAWS,
      asOfDrawNumber: 8,
      datasetVersion: GOLDEN_DATASET_VERSION,
      mode: 'BALANCED',
      gameCount: 3,
      fixed: [],
      excluded: [],
      watch: [],
      seed: 123,
    })

    expect(combos.length).toBe(3)
    for (const c of combos) {
      expect(c.id).toBeTruthy()
      expect(c.numbers.length).toBe(6)
      expect(c.dna.dnaString).toBeTruthy()
      expect(c.score).toBeGreaterThanOrEqual(0)
      expect(c.score).toBeLessThanOrEqual(100)
    }
  })

  it('is deterministic with same seed', async () => {
    const opts = {
      draws: GOLDEN_DRAWS,
      asOfDrawNumber: 6,
      datasetVersion: GOLDEN_DATASET_VERSION,
      mode: 'RANDOM' as const,
      gameCount: 2,
      fixed: [],
      excluded: [],
      watch: [],
      seed: 999,
    }
    const a = await generateCombinations(opts)
    const b = await generateCombinations(opts)
    expect(a.map((c) => c.numbers)).toEqual(b.map((c) => c.numbers))
  })

  it('rejects fixed/excluded conflict', async () => {
    await expect(
      generateCombinations({
        draws: GOLDEN_DRAWS,
        datasetVersion: GOLDEN_DATASET_VERSION,
        mode: 'MASTER',
        gameCount: 1,
        fixed: [5],
        excluded: [5],
        watch: [],
        seed: 1,
      }),
    ).rejects.toThrow(GeneratorValidationError)
  })

  it('rejects too many fixed numbers', async () => {
    await expect(
      generateCombinations({
        draws: GOLDEN_DRAWS,
        datasetVersion: GOLDEN_DATASET_VERSION,
        mode: 'MASTER',
        gameCount: 1,
        fixed: [1, 2, 3, 4, 5, 6, 7],
        excluded: [],
        watch: [],
        seed: 1,
      }),
    ).rejects.toThrow(GeneratorValidationError)
  })

  it('respects fixed numbers', async () => {
    const combos = await generateCombinations({
      draws: GOLDEN_DRAWS,
      asOfDrawNumber: 8,
      datasetVersion: GOLDEN_DATASET_VERSION,
      mode: 'RANDOM',
      gameCount: 2,
      fixed: [7, 14],
      excluded: [],
      watch: [],
      seed: 55,
    })
    for (const c of combos) {
      expect(c.numbers).toContain(7)
      expect(c.numbers).toContain(14)
    }
  })
})

describe('generateRandomGames', () => {
  it('produces valid games without excluded numbers', () => {
    const games = generateRandomGames(3, [], [1, 2, 3], 77)
    for (const g of games) {
      expect(g.length).toBe(6)
      expect(g.some((n) => n <= 3)).toBe(false)
    }
  })
})
