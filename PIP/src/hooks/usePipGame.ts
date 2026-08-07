import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadDemoPoints, saveDemoPoints } from '../game/demoStorage'
import { computeStats } from '../game/history'
import { settleBet } from '../game/payout'
import { buildRoundResult } from '../game/rules'
import {
  consumeRound,
  createShoe,
  currentRound,
  isShoeComplete,
  peekNextPair,
  remainingCards,
  validateShoeIntegrity,
} from '../game/shoe'
import { transition } from '../game/stateMachine'
import type {
  BetSelection,
  ExtraMode,
  GamePhase,
  PrimaryMode,
  RoundResult,
  Settlement,
  Shoe,
} from '../game/types'
import {
  BETTING_SECONDS,
  INITIAL_DEMO_POINTS,
  ROUNDS_PER_SHOE,
} from '../game/types'

type PendingPair = {
  cardAValue: number
  cardBValue: number
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function usePipGame() {
  const [phase, setPhase] = useState<GamePhase>('BETTING_OPEN')
  const [shoe, setShoe] = useState<Shoe>(() => createShoe(1))
  const [demoPoints, setDemoPoints] = useState(() => loadDemoPoints())
  const [stake, setStake] = useState(50)
  const [primaryMode, setPrimaryMode] = useState<PrimaryMode>('CARD_DUEL')
  const [primaryChoice, setPrimaryChoice] = useState('UP')
  const [extraMode, setExtraMode] = useState<ExtraMode | null>(null)
  const [extraChoice, setExtraChoice] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [timer, setTimer] = useState(BETTING_SECONDS)
  const [revealedA, setRevealedA] = useState(false)
  const [revealedB, setRevealedB] = useState(false)
  const [pending, setPending] = useState<PendingPair | null>(null)
  const [latestResult, setLatestResult] = useState<RoundResult | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [hiddenRevealIndex, setHiddenRevealIndex] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('선택 가능 (10초)')

  const phaseRef = useRef<GamePhase>('BETTING_OPEN')
  const shoeRef = useRef(shoe)
  const runToken = useRef(0)
  const timerId = useRef<number | null>(null)
  const lockingRef = useRef(false)
  const startedRef = useRef(false)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    shoeRef.current = shoe
  }, [shoe])

  useEffect(() => {
    saveDemoPoints(demoPoints)
  }, [demoPoints])

  const clearTimer = useCallback(() => {
    if (timerId.current != null) {
      window.clearInterval(timerId.current)
      timerId.current = null
    }
  }, [])

  const go = useCallback((from: GamePhase, to: GamePhase) => {
    const next = transition(from, to)
    phaseRef.current = next
    setPhase(next)
    return next
  }, [])

  const integrity = useMemo(() => validateShoeIntegrity(shoe), [shoe])
  const stats = useMemo(() => computeStats(shoe.history), [shoe.history])

  const openBetting = useCallback(() => {
    clearTimer()
    lockingRef.current = false
    setRevealedA(false)
    setRevealedB(false)
    setPending(null)
    setLatestResult(null)
    setSettlements([])
    setHiddenRevealIndex(-1)
    setTimer(BETTING_SECONDS)
    setMessage('선택 가능 (10초)')
    phaseRef.current = 'BETTING_OPEN'
    setPhase('BETTING_OPEN')

    const token = ++runToken.current
    let left = BETTING_SECONDS
    timerId.current = window.setInterval(() => {
      if (token !== runToken.current) return
      left -= 1
      setTimer(left)
      if (left <= 0) clearTimer()
    }, 1000)
  }, [clearTimer])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    openBetting()
    return () => clearTimer()
  }, [openBetting, clearTimer])

  const buildSelections = useCallback((): BetSelection[] => {
    const selections: BetSelection[] = [
      { mode: primaryMode, choice: primaryChoice, stake },
    ]
    if (extraMode && extraChoice) {
      selections.push({ mode: extraMode, choice: extraChoice, stake })
    }
    return selections
  }, [extraChoice, extraMode, primaryChoice, primaryMode, stake])

  const lockAndResolve = useCallback(async () => {
    if (lockingRef.current || phaseRef.current !== 'BETTING_OPEN') return
    lockingRef.current = true
    setBusy(true)
    clearTimer()
    const token = ++runToken.current
    const activeShoe = shoeRef.current

    try {
      const totalStake = stake + (extraMode && extraChoice ? stake : 0)
      if (demoPoints < totalStake) {
        setMessage('DEMO POINT가 부족합니다. 포인트를 리셋하거나 스테이크를 낮추세요.')
        openBetting()
        return
      }

      go('BETTING_OPEN', 'BETTING_LOCK')
      setMessage('선택 종료')
      setDemoPoints((prev) => prev - totalStake)

      const pair = peekNextPair(activeShoe)
      setPending({ cardAValue: pair.cardA.value, cardBValue: pair.cardB.value })

      await wait(350)
      if (token !== runToken.current) return

      go('BETTING_LOCK', 'CARD_A_REVEAL')
      setRevealedA(true)
      setMessage('CARD A 공개')
      await wait(1000)
      if (token !== runToken.current) return

      go('CARD_A_REVEAL', 'CARD_B_REVEAL')
      setRevealedB(true)
      setMessage('CARD B 공개')
      await wait(700)
      if (token !== runToken.current) return

      const roundNo = currentRound(activeShoe)
      const result = buildRoundResult(roundNo, pair.cardA.value, pair.cardB.value)
      setLatestResult(result)
      go('CARD_B_REVEAL', 'RESULT')
      setMessage(
        `${result.cardA} + ${result.cardB} = ${result.total} · ${result.cardDuel} / ${result.totalBand}`,
      )
      await wait(500)
      if (token !== runToken.current) return

      go('RESULT', 'SETTLEMENT')
      const settled = buildSelections().map((selection) => settleBet(result, selection))
      setSettlements(settled)
      const payoutSum = settled.reduce((sum, item) => sum + item.payout, 0)
      setDemoPoints((prev) => prev + payoutSum)

      const nextShoe = consumeRound(activeShoe, result)
      shoeRef.current = nextShoe
      setShoe(nextShoe)

      await wait(4000)
      if (token !== runToken.current) return

      if (isShoeComplete(nextShoe) || nextShoe.history.length >= ROUNDS_PER_SHOE) {
        go('SETTLEMENT', 'SHOE_COMPLETE')
        setMessage('SHOE COMPLETE')
        await wait(800)
        if (token !== runToken.current) return
        go('SHOE_COMPLETE', 'HIDDEN_REVEAL')
        setMessage('REVEAL HIDDEN CARDS')
        for (let i = 0; i < nextShoe.hidden.length; i += 1) {
          setHiddenRevealIndex(i)
          await wait(450)
          if (token !== runToken.current) return
        }
        go('HIDDEN_REVEAL', 'NEW_SHOE')
        setMessage('NEW SHOE')
      } else {
        go('SETTLEMENT', 'NEXT_ROUND')
        setMessage('다음 라운드 준비')
        await wait(200)
        if (token !== runToken.current) return
        openBetting()
      }
    } finally {
      if (token === runToken.current) {
        setBusy(false)
        lockingRef.current = false
      }
    }
  }, [
    buildSelections,
    clearTimer,
    demoPoints,
    extraChoice,
    extraMode,
    go,
    openBetting,
    stake,
  ])

  useEffect(() => {
    if (phase === 'BETTING_OPEN' && timer <= 0) {
      void lockAndResolve()
    }
  }, [timer, phase, lockAndResolve])

  const startNewShoe = useCallback(() => {
    if (phaseRef.current !== 'NEW_SHOE') return
    clearTimer()
    runToken.current += 1
    lockingRef.current = false
    setBusy(false)
    const next = createShoe(shoeRef.current.shoeNumber + 1)
    shoeRef.current = next
    setShoe(next)
    go('NEW_SHOE', 'SHOE_INIT')
    openBetting()
  }, [clearTimer, go, openBetting])

  const resetPoints = useCallback(() => {
    setDemoPoints(INITIAL_DEMO_POINTS)
  }, [])

  return {
    phase,
    shoe,
    demoPoints,
    stake,
    setStake,
    primaryMode,
    setPrimaryMode,
    primaryChoice,
    setPrimaryChoice,
    extraMode,
    setExtraMode,
    extraChoice,
    setExtraChoice,
    showMore,
    setShowMore,
    timer,
    revealedA,
    revealedB,
    pending,
    latestResult,
    settlements,
    hiddenRevealIndex,
    busy,
    message,
    integrity,
    stats,
    remaining: remainingCards(shoe),
    round: Math.min(ROUNDS_PER_SHOE, Math.max(1, shoe.history.length + (phase === 'BETTING_OPEN' || phase === 'SHOE_INIT' ? 1 : 0))),
    lockAndResolve,
    startNewShoe,
    resetPoints,
    canBet: phase === 'BETTING_OPEN' && !busy,
  }
}
