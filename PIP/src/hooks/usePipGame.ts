import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BundleAmountMode } from '../betting/selection'
import { resolveSelections, summarizeSelection } from '../betting/selection'
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
  const [stake, setStake] = useState(100)
  const [primaryMode, setPrimaryModeState] = useState<PrimaryMode>('CARD_DUEL')
  const [primaryChoice, setPrimaryChoiceState] = useState<string | null>(null)
  const [extraMode, setExtraModeState] = useState<ExtraMode | null>(null)
  const [extraChoice, setExtraChoiceState] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [bundleIds, setBundleIds] = useState<string[]>([])
  const [bundleAmountMode, setBundleAmountMode] = useState<BundleAmountMode>('SPLIT_TOTAL')
  const [timer, setTimer] = useState(BETTING_SECONDS)
  const [revealedA, setRevealedA] = useState(false)
  const [revealedB, setRevealedB] = useState(false)
  const [pending, setPending] = useState<PendingPair | null>(null)
  const [latestResult, setLatestResult] = useState<RoundResult | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [lockedSelections, setLockedSelections] = useState<BetSelection[]>([])
  const [hiddenRevealIndex, setHiddenRevealIndex] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('선택 가능 (10초)')

  const phaseRef = useRef<GamePhase>('BETTING_OPEN')
  const shoeRef = useRef(shoe)
  const runToken = useRef(0)
  const timerId = useRef<number | null>(null)
  const lockingRef = useRef(false)
  const startedRef = useRef(false)
  const selectionRef = useRef({
    primaryMode: 'CARD_DUEL' as PrimaryMode,
    primaryChoice: null as string | null,
    extraMode: null as ExtraMode | null,
    extraChoice: null as string | null,
    bundleIds: [] as string[],
    stake: 100,
    bundleAmountMode: 'SPLIT_TOTAL' as BundleAmountMode,
  })

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    shoeRef.current = shoe
  }, [shoe])

  useEffect(() => {
    saveDemoPoints(demoPoints)
  }, [demoPoints])

  useEffect(() => {
    selectionRef.current = {
      primaryMode,
      primaryChoice,
      extraMode,
      extraChoice,
      bundleIds,
      stake,
      bundleAmountMode,
    }
  }, [
    bundleAmountMode,
    bundleIds,
    extraChoice,
    extraMode,
    primaryChoice,
    primaryMode,
    stake,
  ])

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

  const selectionInput = useMemo(() => {
    const duelPick = primaryMode === 'CARD_DUEL' ? primaryChoice : null
    const totalPick =
      primaryMode === 'TOTAL' && primaryChoice && !/^\d+$/.test(primaryChoice)
        ? primaryChoice
        : null
    const extraPick =
      extraMode && extraChoice
        ? { mode: extraMode, choice: extraChoice }
        : primaryMode === 'TOTAL' && primaryChoice && /^\d+$/.test(primaryChoice)
          ? { mode: 'EXACT_TOTAL' as const, choice: primaryChoice }
          : null

    return {
      duelPick,
      totalPick,
      extraPick,
      bundleIds,
      stake,
      amountMode: bundleAmountMode,
    }
  }, [
    bundleAmountMode,
    bundleIds,
    extraChoice,
    extraMode,
    primaryChoice,
    primaryMode,
    stake,
  ])

  const resolved = useMemo(() => resolveSelections(selectionInput), [selectionInput])
  const summary = useMemo(() => summarizeSelection(selectionInput), [selectionInput])

  const resetRoundSelection = useCallback(() => {
    setPrimaryChoiceState(null)
    setExtraModeState(null)
    setExtraChoiceState(null)
    setShowMore(false)
    setBundleIds([])
    setLockedSelections([])
  }, [])

  const openBetting = useCallback(() => {
    clearTimer()
    lockingRef.current = false
    setRevealedA(false)
    setRevealedB(false)
    setPending(null)
    setLatestResult(null)
    setSettlements([])
    setHiddenRevealIndex(-1)
    resetRoundSelection()
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
  }, [clearTimer, resetRoundSelection])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    openBetting()
    return () => clearTimer()
  }, [openBetting, clearTimer])

  const buildSelectionsFromState = useCallback((): BetSelection[] => {
    const current = selectionRef.current
    const duelPick = current.primaryMode === 'CARD_DUEL' ? current.primaryChoice : null
    const totalPick =
      current.primaryMode === 'TOTAL' &&
      current.primaryChoice &&
      !/^\d+$/.test(current.primaryChoice)
        ? current.primaryChoice
        : null
    const extraPick =
      current.extraMode && current.extraChoice
        ? { mode: current.extraMode, choice: current.extraChoice }
        : current.primaryMode === 'TOTAL' &&
            current.primaryChoice &&
            /^\d+$/.test(current.primaryChoice)
          ? { mode: 'EXACT_TOTAL' as const, choice: current.primaryChoice }
          : null

    return resolveSelections({
      duelPick,
      totalPick,
      extraPick,
      bundleIds: current.bundleIds,
      stake: current.stake,
      amountMode: current.bundleAmountMode,
    }).selections
  }, [])

  const setPrimaryMode = useCallback((mode: PrimaryMode) => {
    if (phaseRef.current !== 'BETTING_OPEN') return
    setPrimaryModeState(mode)
    setPrimaryChoiceState(null)
  }, [])

  const setPrimaryChoice = useCallback((choice: string) => {
    if (phaseRef.current !== 'BETTING_OPEN') return
    setPrimaryChoiceState((prev) => (prev === choice ? null : choice))
  }, [])

  const setExtraMode = useCallback((mode: ExtraMode | null) => {
    if (phaseRef.current !== 'BETTING_OPEN') return
    setExtraModeState(mode)
  }, [])

  const setExtraChoice = useCallback((choice: string | null) => {
    if (phaseRef.current !== 'BETTING_OPEN') return
    setExtraChoiceState((prev) => {
      if (choice == null) return null
      return prev === choice ? null : choice
    })
  }, [])

  const toggleBundle = useCallback((id: string) => {
    if (phaseRef.current !== 'BETTING_OPEN') return
    setBundleIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }, [])

  const clearSelection = useCallback(() => {
    if (phaseRef.current !== 'BETTING_OPEN') return
    resetRoundSelection()
    setMessage('선택 취소됨')
  }, [resetRoundSelection])

  const lockAndResolve = useCallback(async () => {
    if (lockingRef.current || phaseRef.current !== 'BETTING_OPEN') return
    lockingRef.current = true
    setBusy(true)
    clearTimer()
    const token = ++runToken.current
    const activeShoe = shoeRef.current

    try {
      const selections = buildSelectionsFromState()
      const totalStake = selections.reduce((sum, item) => sum + item.stake, 0)

      if (totalStake > 0 && demoPoints < totalStake) {
        setMessage('데모 포인트가 부족합니다. 포인트를 초기화하거나 금액을 낮추세요.')
        openBetting()
        return
      }

      setLockedSelections(selections)
      go('BETTING_OPEN', 'BETTING_LOCK')
      setMessage('선택 종료')
      if (totalStake > 0) {
        setDemoPoints((prev) => prev - totalStake)
      }

      const pair = peekNextPair(activeShoe)
      setPending({ cardAValue: pair.cardA.value, cardBValue: pair.cardB.value })

      await wait(350)
      if (token !== runToken.current) return

      go('BETTING_LOCK', 'CARD_A_REVEAL')
      setRevealedA(true)
      setMessage('카드 A 공개')
      await wait(1000)
      if (token !== runToken.current) return

      go('CARD_A_REVEAL', 'CARD_B_REVEAL')
      setRevealedB(true)
      setMessage('카드 B 공개')
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
      const settled = selections.map((selection) => settleBet(result, selection))
      setSettlements(settled)
      const payoutSum = settled.reduce((sum, item) => sum + item.payout, 0)
      if (payoutSum > 0) {
        setDemoPoints((prev) => prev + payoutSum)
      }

      const nextShoe = consumeRound(activeShoe, result)
      shoeRef.current = nextShoe
      setShoe(nextShoe)

      await wait(4000)
      if (token !== runToken.current) return

      if (isShoeComplete(nextShoe) || nextShoe.history.length >= ROUNDS_PER_SHOE) {
        go('SETTLEMENT', 'SHOE_COMPLETE')
        setMessage('슈 종료')
        await wait(800)
        if (token !== runToken.current) return
        go('SHOE_COMPLETE', 'HIDDEN_REVEAL')
        setMessage('비공개 카드 공개')
        for (let i = 0; i < nextShoe.hidden.length; i += 1) {
          setHiddenRevealIndex(i)
          await wait(450)
          if (token !== runToken.current) return
        }
        go('HIDDEN_REVEAL', 'NEW_SHOE')
        setMessage('새 슈')
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
  }, [buildSelectionsFromState, clearTimer, demoPoints, go, openBetting])

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
    setStake: (value: number) => {
      if (phaseRef.current !== 'BETTING_OPEN') return
      setStake(Math.max(1, Math.floor(value) || 1))
    },
    primaryMode,
    setPrimaryMode,
    primaryChoice,
    setPrimaryChoice,
    extraMode,
    setExtraMode,
    extraChoice,
    setExtraChoice,
    showMore,
    setShowMore: (value: boolean | ((prev: boolean) => boolean)) => {
      if (phaseRef.current !== 'BETTING_OPEN') return
      setShowMore(value)
    },
    bundleIds,
    toggleBundle,
    bundleAmountMode,
    setBundleAmountMode: (mode: BundleAmountMode) => {
      if (phaseRef.current !== 'BETTING_OPEN') return
      setBundleAmountMode(mode)
    },
    resolvedPicks: resolved.picks,
    estimatedStake: resolved.totalStake,
    summaryLines: summary.lines,
    lockedSelections,
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
    round: Math.min(
      ROUNDS_PER_SHOE,
      Math.max(1, shoe.history.length + (phase === 'BETTING_OPEN' || phase === 'SHOE_INIT' ? 1 : 0)),
    ),
    lockAndResolve,
    clearSelection,
    startNewShoe,
    resetPoints,
    canBet: phase === 'BETTING_OPEN' && !busy,
    canConfirm:
      phase === 'BETTING_OPEN' &&
      !busy &&
      resolved.totalStake > 0 &&
      resolved.totalStake <= demoPoints,
  }
}
