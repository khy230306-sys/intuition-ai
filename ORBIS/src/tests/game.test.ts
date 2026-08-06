import { describe, expect, it } from 'vitest'
import { evaluateDraws, settleTrinityPayout, sideMark } from '../game/trinity/engine'

describe('ORBIS CORE TRINITY engine', () => {
  it('detects majority wins', () => {
    const outcome = evaluateDraws(['blue', 'blue', 'gold'])
    expect(outcome.pattern).toBe('majority')
    expect(outcome.winner).toBe('blue')
  })

  it('detects trinity wins', () => {
    const outcome = evaluateDraws(['violet', 'violet', 'violet'])
    expect(outcome.pattern).toBe('trinity')
    expect(outcome.winner).toBe('violet')
  })

  it('detects void when all different', () => {
    const outcome = evaluateDraws(['blue', 'gold', 'violet'])
    expect(outcome.pattern).toBe('void')
    expect(outcome.winner).toBe('void')
  })

  it('settles demo payouts', () => {
    const majority = evaluateDraws(['gold', 'gold', 'blue'])
    expect(settleTrinityPayout('gold', 100, majority)).toBe(200)
    expect(settleTrinityPayout('blue', 100, majority)).toBe(0)

    const trinity = evaluateDraws(['blue', 'blue', 'blue'])
    expect(settleTrinityPayout('blue', 100, trinity)).toBe(500)

    const voidRound = evaluateDraws(['blue', 'gold', 'violet'])
    expect(settleTrinityPayout('void', 100, voidRound)).toBe(400)
  })

  it('maps road marks', () => {
    expect(sideMark('blue')).toBe('B')
    expect(sideMark('gold')).toBe('G')
    expect(sideMark('violet')).toBe('V')
    expect(sideMark('void')).toBe('Ø')
  })
})
