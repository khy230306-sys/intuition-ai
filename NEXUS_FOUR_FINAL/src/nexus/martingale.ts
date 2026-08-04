import type { AppSettings, EntryState, Side } from './types'

export type MartingaleStrategyId = AppSettings['martingale']['activeStrategyId']

export type PendingBet = {
  startedRoundIndex: number
  lockedDirection: Side
  lockedEngineId: string
  martingaleStepIndex: number
  amount: number
}

export type MartingaleState = {
  strategyId: MartingaleStrategyId
  running: boolean
  paused: boolean
  cycleIndex: number
  betsInCycle: number
  lockedDirection: Side | null
  lockedEngineId: string | null
  martingaleStepIndex: number
  currentAmount: number

  currentCycleProfit: number
  totalProfit: number
  totalSuccess: number
  totalFail: number

  consecutiveFail: number
  maxConsecutiveFail: number

  dailyStartAt: number
  dailyProfit: number
  dailyLoss: number

  lastProcessedRoundIndex: number

  stopReason: string | null
}

function nowMs() {
  return Date.now()
}

export function initialMartingaleState(settings: AppSettings): MartingaleState {
  return {
    strategyId: settings.martingale.activeStrategyId,
    running: true,
    paused: false,
    cycleIndex: 0,
    betsInCycle: 0,
    lockedDirection: null,
    lockedEngineId: null,
    martingaleStepIndex: 0,
    currentAmount: settings.martingale.startAmount,

    currentCycleProfit: 0,
    totalProfit: 0,
    totalSuccess: 0,
    totalFail: 0,

    consecutiveFail: 0,
    maxConsecutiveFail: 0,

    dailyStartAt: nowMs(),
    dailyProfit: 0,
    dailyLoss: 0,

    lastProcessedRoundIndex: -1,
    stopReason: null,
  }
}

function stepMultiplier(settings: AppSettings, stepIndex: number) {
  const mult = settings.martingale.steps[stepIndex]
  return mult ?? settings.martingale.steps[settings.martingale.steps.length - 1] ?? 1
}

function amountForStep(settings: AppSettings, stepIndex: number) {
  return Math.max(0, settings.martingale.startAmount * stepMultiplier(settings, stepIndex))
}

function isNewDay(state: MartingaleState) {
  const dt = new Date(state.dailyStartAt)
  const now = new Date()
  return dt.getFullYear() !== now.getFullYear() || dt.getMonth() !== now.getMonth() || dt.getDate() !== now.getDate()
}

export type MultiSignal = {
  entryState: EntryState
  predictedSide: Side | null
  // 선택 엔진 정보(사이클 잠금 용)
  selectedEngineId?: string
}

export function simulateMartingale(params: {
  settings: AppSettings
  rounds: Array<{ roundIndex: number; actual: Side | 'TIE' }>
  multiHistory: Array<{ roundIndex: number; entryState: EntryState; predictedSide: Side | null }>
  // 재시작/복원 시 저장된 상태가 있다면 그 값을 기반으로 "계속"하도록 만들 수 있지만,
  // 현재 구현은 스펙의 안전성을 위해 rounds 전체를 재생(replay)해서 상태를 재구성합니다.
}): MartingaleState {
  const { settings, rounds, multiHistory } = params
  const state = initialMartingaleState(settings)

  // multiHistory는 rounds와 동일 인덱스 길이를 가정. (분석 결과 기반)
  const multiByRound = new Map<number, (typeof multiHistory)[number]>()
  for (const m of multiHistory) multiByRound.set(m.roundIndex, m)

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i]
    state.lastProcessedRoundIndex = round.roundIndex

    if (!state.running) break
    if (isNewDay(state)) {
      state.dailyStartAt = nowMs()
      state.dailyProfit = 0
      state.dailyLoss = 0
    }

    const multi = multiByRound.get(round.roundIndex)

    // 1) 사이클이 비활성일 때: ENTRY일 때만 1단계 진입
    if (state.lockedDirection === null) {
      const shouldEnter = multi?.entryState === 'ENTRY' && multi?.predictedSide
      if (!shouldEnter) continue

      state.cycleIndex++
      state.betsInCycle = 0
      state.currentCycleProfit = 0
      state.martingaleStepIndex = 0
      state.consecutiveFail = 0

      state.lockedDirection = multi!.predictedSide as Side
      state.lockedEngineId = 'multiEnsemble'
      state.currentAmount = amountForStep(settings, state.martingaleStepIndex)
    }

    // 2) 현재 사이클이 활성일 때: 매 라운드 베팅 진행
    state.betsInCycle++

    // 사이클 제한
    if (state.cycleIndex > settings.martingale.cycleLimit) {
      state.running = false
      state.stopReason = '사이클 제한 도달'
      break
    }
    if (state.betsInCycle > settings.martingale.bettingPerCycleLimit) {
      state.running = false
      state.stopReason = '사이클 라운드 제한 도달'
      break
    }

    const locked = state.lockedDirection
    if (!locked) continue

    const amount = state.currentAmount
    let profit = 0

    if (round.actual === 'TIE') {
      // TIE는 방향 베팅 결과로 보지 않음(손익 0, 스텝 유지)
      profit = 0
    } else {
      const success = round.actual === locked
      profit = success ? amount : -amount
      if (success) {
        state.totalSuccess++
        state.consecutiveFail = 0
      } else {
        state.totalFail++
        state.consecutiveFail++
        state.maxConsecutiveFail = Math.max(state.maxConsecutiveFail, state.consecutiveFail)
      }
    }

    state.totalProfit += profit
    state.currentCycleProfit += profit
    state.dailyProfit = state.dailyProfit + Math.max(0, profit)
    state.dailyLoss = state.dailyLoss + Math.max(0, -profit)

    const dailyLossOver = state.dailyLoss >= settings.martingale.dailyMaxLoss
    const dailyTargetReached = state.dailyProfit >= settings.martingale.dailyTargetProfit
    const targetReached = state.totalProfit >= settings.martingale.targetProfit

    if (dailyLossOver) {
      state.running = false
      state.stopReason = '일일 손실 한도 도달'
      break
    }
    if (dailyTargetReached) {
      state.running = false
      state.stopReason = '일일 목표 수익 달성'
      break
    }
    if (targetReached) {
      state.running = false
      state.stopReason = '목표 수익 달성'
      break
    }

    // 3) 성공이면 즉시 1단계로 복귀(사이클 종료)
    if (round.actual !== 'TIE' && round.actual === locked) {
      if (settings.martingale.winBehavior === 'stop') {
        state.running = false
        state.stopReason = '승리 후 동작: 중지'
        break
      }
      state.lockedDirection = null
      state.lockedEngineId = null
      state.martingaleStepIndex = 0
      state.currentAmount = amountForStep(settings, 0)
      continue
    }

    // 4) 실패이면 다음 단계로 상승. 단, TIE는 실패로 치지 않음
    if (round.actual !== 'TIE' && round.actual !== locked) {
      if (state.consecutiveFail >= settings.martingale.maxConsecutiveFail) {
        state.running = false
        state.stopReason = '최대 연속 실패 제한 도달'
        break
      }
      const maxStepIndex = settings.martingale.steps.length - 1
      if (state.martingaleStepIndex >= maxStepIndex) {
        if (settings.martingale.failBehaviorAfterMaxStep === 'resetTo1') {
          state.lockedDirection = null
          state.lockedEngineId = null
          state.martingaleStepIndex = 0
          state.currentAmount = amountForStep(settings, 0)
        } else {
          state.running = false
          state.stopReason = '최종 단계 실패 후 동작: 중지'
          break
        }
      } else {
        state.martingaleStepIndex++
        state.currentAmount = amountForStep(settings, state.martingaleStepIndex)
      }
    }
  }

  return state
}

