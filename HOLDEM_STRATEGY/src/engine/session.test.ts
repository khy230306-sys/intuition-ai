import { describe, expect, it } from 'vitest'
import { analyzeFlow, type DaySession, type HandRecord } from '@/engine/session'

function hand(partial: Partial<HandRecord> & Pick<HandRecord, 'id' | 'finalWinPct' | 'outcome'>): HandRecord {
  return {
    startedAt: '2026-08-07T01:00:00.000Z',
    endedAt: '2026-08-07T01:05:00.000Z',
    hole: [
      { rank: 14, suit: 's' },
      { rank: 14, suit: 'h' },
    ],
    board: [],
    opponents: 1,
    position: 'middle',
    snapshots: [
      {
        street: 'preflop',
        boardLen: 0,
        winPct: 80,
        tiePct: 1,
        losePct: 19,
        action: 'raise',
        actionLabel: '레이즈',
        handLabel: '프리미엄 페어',
        draws: [],
        at: '2026-08-07T01:00:00.000Z',
      },
    ],
    advisedAction: 'raise',
    ...partial,
  }
}

describe('analyzeFlow', () => {
  it('returns empty insight with zero hands', () => {
    const session: DaySession = { dateKey: '2026-08-07', hands: [], updatedAt: '' }
    const report = analyzeFlow(session)
    expect(report.handCount).toBe(0)
    expect(report.insight.level).toBe('neutral')
  })

  it('detects hot momentum with strong results', () => {
    const session: DaySession = {
      dateKey: '2026-08-07',
      updatedAt: '',
      hands: [
        hand({ id: '1', finalWinPct: 72, outcome: 'won' }),
        hand({ id: '2', finalWinPct: 68, outcome: 'won' }),
        hand({ id: '3', finalWinPct: 61, outcome: 'won' }),
        hand({ id: '4', finalWinPct: 55, outcome: 'chop' }),
      ],
    }
    const report = analyzeFlow(session)
    expect(report.handCount).toBe(4)
    expect(report.winRateKnown).toBeGreaterThan(70)
    expect(['hot', 'warm']).toContain(report.insight.level)
  })
})
