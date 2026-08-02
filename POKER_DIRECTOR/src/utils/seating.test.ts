import { describe, expect, it } from 'vitest'
import { previewSeatAssignment } from '@/utils/seating'
import { suggestBalance, suggestTableBreak } from '@/utils/balancing'
import type { Table, TournamentEntry } from '@/types'

function entry(partial: Partial<TournamentEntry> & { id: string }): TournamentEntry {
  return {
    tournamentId: 't1',
    playerId: partial.id,
    entryNumber: 1,
    accessCode: 'ABC',
    status: 'checked_in',
    paymentStatus: 'paid',
    buyInAmount: 100000,
    rebuyCount: 0,
    reentryCount: 0,
    addonCount: 0,
    currentChips: 30000,
    bountyAmount: 0,
    bountyWon: 0,
    registeredAt: new Date().toISOString(),
    isSeatLocked: false,
    isVipSeat: false,
    excludeFromBalance: false,
    avoidPlayerIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  }
}

function table(n: number, id: string): Table {
  return {
    id,
    tournamentId: 't1',
    number: n,
    maxSeats: 9,
    status: 'active',
    dealerButtonSeat: 1,
    isBreakCandidate: n === 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('seating and balancing', () => {
  it('assigns seats evenly', () => {
    const tables = [table(1, 'a'), table(2, 'b'), table(3, 'c'), table(4, 'd')]
    const entries = Array.from({ length: 36 }, (_, i) => entry({ id: `e${i}`, entryNumber: i + 1 }))
    const names = Object.fromEntries(entries.map((e) => [e.id, e.id]))
    const preview = previewSeatAssignment(entries, tables, names)
    expect(preview).toHaveLength(4)
    expect(preview.reduce((s, t) => s + t.seats.length, 0)).toBe(36)
    const counts = preview.map((t) => t.seats.length)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })

  it('suggests balance moves when uneven', () => {
    const tables = [table(1, 'a'), table(2, 'b')]
    const entries = [
      ...Array.from({ length: 8 }, (_, i) =>
        entry({
          id: `a${i}`,
          status: 'seated',
          currentTableId: 'a',
          currentSeat: i + 1,
        }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        entry({
          id: `b${i}`,
          status: 'seated',
          currentTableId: 'b',
          currentSeat: i + 1,
        }),
      ),
    ]
    const names = Object.fromEntries(entries.map((e) => [e.id, e.id]))
    const suggestions = suggestBalance(tables, entries, names)
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0]?.fromTableNumber).toBe(1)
    expect(suggestions[0]?.toTableNumber).toBe(2)
  })

  it('suggests table break', () => {
    const tables = [table(1, 'a'), table(2, 'b'), table(3, 'c')]
    const entries = [
      ...Array.from({ length: 3 }, (_, i) =>
        entry({ id: `c${i}`, status: 'seated', currentTableId: 'c', currentSeat: i + 1 }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        entry({ id: `a${i}`, status: 'seated', currentTableId: 'a', currentSeat: i + 1 }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        entry({ id: `b${i}`, status: 'seated', currentTableId: 'b', currentSeat: i + 1 }),
      ),
    ]
    const names = Object.fromEntries(entries.map((e) => [e.id, e.id]))
    const plan = suggestTableBreak(tables, entries, names)
    expect(plan).not.toBeNull()
    expect(plan?.breakTableNumber).toBe(3)
    expect(plan?.moves).toHaveLength(3)
  })
})
