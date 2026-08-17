import { beforeEach, describe, expect, it, vi } from 'vitest'

// Minimal localStorage mock for node environment without happy-dom
class MemoryStorage {
  private data = new Map<string, string>()
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v))
  }
  removeItem(k: string) {
    this.data.delete(k)
  }
  clear() {
    this.data.clear()
  }
}

describe('storage persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage())
  })

  it('restores history and prediction records after reload', async () => {
    const { loadStore, saveStore } = await import('./storage')
    const store = loadStore()
    store.history.push('P', 'B', 'T', 'B')
    store.predictionRecords.push({
      pick: 'P',
      confidence: 61,
      reason: 'test',
      pattern: ['P', 'B'],
      createdAt: '2026-01-01T00:00:00.000Z',
      expectedPath: 'PPPP',
      alternativePath: null,
      hiddenPath: null,
      matchCount: 2,
      nextSideAgreement: 0.6,
      actualResult: 'P',
      result: 'WIN',
      judgedAt: '2026-01-01T00:00:01.000Z',
    })
    saveStore(store)

    const reloaded = loadStore()
    expect(reloaded.history).toEqual(['P', 'B', 'T', 'B'])
    expect(reloaded.predictionRecords).toHaveLength(1)
    expect(reloaded.predictionRecords[0]?.result).toBe('WIN')
    expect(reloaded.predictionRecords[0]?.expectedPath).toBe('PPPP')
  })

  it('preserves patternMemory key from old engine', async () => {
    localStorage.setItem('patternMemory', JSON.stringify({ BBBP: { P: 2, B: 1 } }))
    localStorage.setItem('intuitionHistory', JSON.stringify(['B', 'B', 'B', 'P']))
    const { loadStore } = await import('./storage')
    const store = loadStore()
    expect(store.patternMemory.BBBP).toEqual({ P: 2, B: 1 })
    expect(store.history).toEqual(['B', 'B', 'B', 'P'])
  })
})
