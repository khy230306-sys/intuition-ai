import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  guessUpdown,
  loadBest,
  memoryStartRound,
  memoryTap,
  newMemory,
  newReaction,
  newUpdown,
  reactionArm,
  reactionGo,
  reactionTap,
  saveBest,
} from './gamesLogic'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v)
  },
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('offline games', () => {
  beforeEach(() => {
    store.clear()
    saveBest({ updown: null, memory: null, reaction: null })
  })

  it('updown hints and wins', () => {
    const s0 = { ...newUpdown(() => 0.41), secret: 42 }
    const low = guessUpdown(s0, 10)
    expect(low.lastHint).toMatch(/업/)
    const high = guessUpdown(low, 90)
    expect(high.lastHint).toMatch(/다운/)
    const win = guessUpdown(high, 42)
    expect(win.status).toBe('won')
    expect(loadBest().updown).toBe(3)
  })

  it('memory fails on wrong pad and clears on full match', () => {
    let s = memoryStartRound(newMemory(), () => 0) // pad 0
    s = { ...s, phase: 'input' }
    expect(memoryTap(s, 1).phase).toBe('fail')
    const ok = memoryTap(s, 0)
    expect(ok.phase).toBe('clear')
    expect(loadBest().memory).toBe(1)
  })

  it('reaction records ms and rejects early tap', () => {
    let s = newReaction()
    s = reactionArm(s, 1000, 1000).state
    expect(reactionTap(s, 1500).phase).toBe('early')
    s = reactionGo(s, 2000)
    const done = reactionTap(s, 2230)
    expect(done.phase).toBe('result')
    expect(done.resultMs).toBe(230)
    expect(loadBest().reaction).toBe(230)
  })
})
