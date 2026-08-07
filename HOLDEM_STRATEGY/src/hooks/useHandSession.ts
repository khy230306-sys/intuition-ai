import { useEffect, useMemo, useState, useTransition } from 'react'
import type { Card, Street } from '@/engine/cards'
import { cardEquals, nextBoardNeed, streetFromBoard } from '@/engine/cards'
import { estimateEquity, type EquityResult } from '@/engine/equity'
import { buildAdvice, type Position, type StrategyAdvice } from '@/engine/strategy'

export function useHandSession() {
  const [hole, setHole] = useState<Card[]>([])
  const [board, setBoard] = useState<Card[]>([])
  const [opponents, setOpponents] = useState(1)
  const [position, setPosition] = useState<Position>('middle')
  const [pickerFor, setPickerFor] = useState<'hole' | 'board' | null>(null)
  const [equity, setEquity] = useState<EquityResult | null>(null)
  const [advice, setAdvice] = useState<StrategyAdvice | null>(null)
  const [pending, startTransition] = useTransition()

  const used = useMemo(() => [...hole, ...board], [hole, board])
  const street: Street = streetFromBoard(board)
  const boardNeed = nextBoardNeed(board.length)

  useEffect(() => {
    if (hole.length !== 2) {
      setEquity(null)
      setAdvice(null)
      return
    }
    startTransition(() => {
      const trials = board.length >= 5 ? 1800 : board.length >= 3 ? 2200 : 2800
      const eq = estimateEquity(hole, board, opponents, trials)
      setEquity(eq)
      setAdvice(buildAdvice(hole, board, eq, position))
    })
  }, [hole, board, opponents, position])

  const pickCard = (card: Card) => {
    if (used.some((u) => cardEquals(u, card))) return
    if (pickerFor === 'hole') {
      if (hole.length >= 2) return
      setHole((h) => [...h, card])
      if (hole.length + 1 >= 2) setPickerFor(null)
      return
    }
    if (pickerFor === 'board') {
      if (board.length >= 5) return
      // flop must be filled as 3 before turn/river singles — allow progressive 1-by-1 up to 5
      setBoard((b) => [...b, card])
      const nextLen = board.length + 1
      if (nextLen === 3 || nextLen === 4 || nextLen === 5) setPickerFor(null)
    }
  }

  const removeHole = (index: number) => {
    setHole((h) => h.filter((_, i) => i !== index))
  }

  const removeBoardFrom = (index: number) => {
    // removing a middle board card clears subsequent streets
    setBoard((b) => b.slice(0, index))
  }

  const reset = () => {
    setHole([])
    setBoard([])
    setEquity(null)
    setAdvice(null)
    setPickerFor(null)
  }

  const resetBoard = () => {
    setBoard([])
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
    pickCard,
    removeHole,
    removeBoardFrom,
    reset,
    resetBoard,
  }
}
