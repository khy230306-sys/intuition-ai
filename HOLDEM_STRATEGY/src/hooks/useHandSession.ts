import { useEffect, useMemo, useState, useTransition } from 'react'
import type { Card, Street } from '@/engine/cards'
import { cardEquals, nextBoardNeed, streetFromBoard } from '@/engine/cards'
import { estimateEquity, type EquityResult } from '@/engine/equity'
import { buildAdvice, type Position, type StrategyAdvice } from '@/engine/strategy'
import {
  analyzeFlow,
  clearDaySession,
  createId,
  loadDaySession,
  snapshotFromLive,
  todayKey,
  upsertHand,
  type DaySession,
  type FlowReport,
  type HandOutcome,
  type HandRecord,
  type StreetSnapshot,
} from '@/engine/session'

export function useHandSession() {
  const [hole, setHole] = useState<Card[]>([])
  const [board, setBoard] = useState<Card[]>([])
  const [opponents, setOpponents] = useState(1)
  const [position, setPosition] = useState<Position>('middle')
  const [pickerFor, setPickerFor] = useState<'hole' | 'board' | null>(null)
  const [equity, setEquity] = useState<EquityResult | null>(null)
  const [advice, setAdvice] = useState<StrategyAdvice | null>(null)
  const [pending, startTransition] = useTransition()
  const [handId, setHandId] = useState(() => createId())
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString())
  const [snapshots, setSnapshots] = useState<StreetSnapshot[]>([])
  const [daySession, setDaySession] = useState<DaySession>(() => loadDaySession(todayKey()))
  const [lastSavedId, setLastSavedId] = useState<string | null>(null)

  const used = useMemo(() => [...hole, ...board], [hole, board])
  const street: Street = streetFromBoard(board)
  const boardNeed = nextBoardNeed(board.length)
  const flow: FlowReport = useMemo(() => analyzeFlow(daySession), [daySession])

  useEffect(() => {
    if (hole.length !== 2) {
      setEquity(null)
      setAdvice(null)
      return
    }
    startTransition(() => {
      const trials = board.length >= 5 ? 1800 : board.length >= 3 ? 2200 : 2800
      const eq = estimateEquity(hole, board, opponents, trials)
      const adv = buildAdvice(hole, board, eq, position)
      setEquity(eq)
      setAdvice(adv)

      const snap = snapshotFromLive({
        board,
        winPct: eq.winPct,
        tiePct: eq.tiePct,
        losePct: eq.losePct,
        action: adv.action,
        actionLabel: adv.actionLabel,
        handLabel: adv.handLabel,
        draws: adv.draws,
      })
      setSnapshots((prev) => {
        const withoutSameStreet = prev.filter((p) => p.street !== snap.street)
        return [...withoutSameStreet, snap].sort((a, b) => a.boardLen - b.boardLen)
      })
    })
  }, [hole, board, opponents, position])

  const pickCard = (card: Card) => {
    if (used.some((u) => cardEquals(u, card))) return
    if (pickerFor === 'hole') {
      if (hole.length >= 2) return
      if (hole.length === 0) {
        setStartedAt(new Date().toISOString())
        setSnapshots([])
        setLastSavedId(null)
      }
      setHole((h) => [...h, card])
      if (hole.length + 1 >= 2) setPickerFor(null)
      return
    }
    if (pickerFor === 'board') {
      if (board.length >= 5) return
      setBoard((b) => [...b, card])
      const nextLen = board.length + 1
      if (nextLen === 3 || nextLen === 4 || nextLen === 5) setPickerFor(null)
    }
  }

  const removeHole = (index: number) => {
    setHole((h) => h.filter((_, i) => i !== index))
  }

  const removeBoardFrom = (index: number) => {
    setBoard((b) => b.slice(0, index))
  }

  const resetCurrentHand = () => {
    setHole([])
    setBoard([])
    setEquity(null)
    setAdvice(null)
    setPickerFor(null)
    setSnapshots([])
    setHandId(createId())
    setStartedAt(new Date().toISOString())
    setLastSavedId(null)
  }

  const resetBoard = () => {
    setBoard([])
  }

  const saveHand = (outcome: HandOutcome, note?: string) => {
    if (hole.length !== 2 || !equity || !advice) return null
    const record: HandRecord = {
      id: handId,
      startedAt,
      endedAt: new Date().toISOString(),
      hole: [...hole],
      board: [...board],
      opponents,
      position,
      snapshots: [...snapshots],
      finalWinPct: equity.winPct,
      advisedAction: advice.action,
      outcome,
      note,
    }
    const next = upsertHand(record, todayKey())
    setDaySession(next)
    setLastSavedId(record.id)
    return record
  }

  const saveAndNext = (outcome: HandOutcome) => {
    saveHand(outcome)
    resetCurrentHand()
  }

  const clearToday = () => {
    setDaySession(clearDaySession(todayKey()))
  }

  return {
    hole,
    board,
    opponents,
    setOpponents,
    position,
    setPosition,
    pickerFor,
    setPickerFor,
    used,
    street,
    boardNeed,
    equity,
    advice,
    pending,
    snapshots,
    daySession,
    flow,
    lastSavedId,
    pickCard,
    removeHole,
    removeBoardFrom,
    reset: resetCurrentHand,
    resetBoard,
    saveHand,
    saveAndNext,
    clearToday,
  }
}
