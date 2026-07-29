export type Side = 'PLAYER' | 'BANKER'
export type TieMode = 'EXCLUDE_FOR_DIRECTION' | 'INCLUDE_AS_TIE'

export type EntryState = 'ENTRY' | 'WAIT'

export type ActualResult =
  | { type: 'PLAYER'; side: 'PLAYER' }
  | { type: 'BANKER'; side: 'BANKER' }
  | { type: 'TIE'; side: 'TIE' }

export type Prediction =
  | {
      predictionId: string
      engineId: string
      engineName: string
      shoeId: number
      tableId: string
      roundId: number
      roundIndex: number
      predictedAt: number
      targetRoundIndex: number
      predictionType: 'DIRECTION'
      predictedSide: Side
      confidence: number // 0..1
      entryState: EntryState
      reason: string
      modelVersion: string
    }
  | {
      predictionId: string
      engineId: string
      engineName: string
      shoeId: number
      tableId: string
      roundId: number
      roundIndex: number
      predictedAt: number
      targetRoundIndex: number
      predictionType: 'SUCCESS_FAIL'
      predictedOutcome: 'SUCCESS' | 'FAIL' // for engine1-follow logic
      probability: number // 0..1
      entryState: EntryState
      reason: string
      modelVersion: string
    }

export type EngineRoundEvaluation =
  | {
      predictionId: string
      engineId: string
      evaluatedAt: number
      actual: ActualResult
      success: boolean
      skipped: boolean
      entryState: EntryState
      martingaleStep?: number
      simulatedBet?: number
      simulatedProfit?: number
      dataSource: 'local' | 'scanner'
      reasonSnapshot: string
      modelVersion: string
    }

export type RoundResult = {
  id: string // unique for dedupe
  shoeId: number
  tableId: string
  roundId: number
  roundIndex: number // order within shoe (monotonic)
  tableChangedAt: number
  timestamp: number
  actual: Side | 'TIE'
  dataSource: 'local' | 'scanner'
}

export type BalanceSnapshot = {
  id: string
  shoeId: number
  tableId: string
  roundIndex: number
  timestamp: number
  playerTotal: number
  bankerTotal: number
  tieTotal: number
  meta?: {
    receivedAt?: number
    bettingOpenAt?: number
    bettingCloseAt?: number
    trustScore?: number
    source?: string
  }
}

export type EngineId =
  | 'engine1'
  | 'engine2'
  | 'engine3'
  | 'finalExisting'
  | 'aiAutoPick'
  | 'randomBaseline'
  | 'aiBalance'
  | 'multiEnsemble'

export type EngineScore = {
  engineId: EngineId
  totalN: number
  successRate: number
  wilsonLower: number
  recent20SuccessRate: number
  recent50SuccessRate: number
  recent100SuccessRate: number
  consecutiveMiss: number
  maxConsecutiveMiss: number
  maxDrawdown: number
  simulatedProfit: number
  score: number
  minSampleReached: boolean
  reason: string
}

export type EngineSelection = {
  id: string
  shoeId: number
  tableId: string
  selectedEngineId: EngineId | string
  previousEngineId: EngineId | string | null
  selectedAt: number
  selectionRoundIndex: number
  selectedAfterPlays: number
  reevaluateIn: number
  reason: string
  engineScores: EngineScore[]
  switchDecision: {
    switched: boolean
    delta: number
    hysteresisMinKeep: number
    hysteresisThreshold: number
  }
}

export type AppSettings = {
  schemaVersion: number
  tableId: string
  tieMode: TieMode
  allowWait: boolean
  enableScanner: boolean
  websocketUrl: string
  scannerHeartbeatMs: number
  autoBetMasterSwitch: boolean
  autoBetTestingMode: boolean
  autoBetHysteresisMs: number
  multiEnsemble: {
    minSampleDefault: number
    reevaluateEveryRounds: number
    replacementMinDelta: number // 3점 기본
    minKeepRounds: number // 10판 기본
    maxEnginesToCompare: number
  }
  martingale: {
    activeStrategyId: 'classic' | 'aiShortRecovery' | 'aiIntervalRecovery' | 'aiProbabilityOptimize' | 'aiIncomeAccelerate' | 'multiEnsembleBet'
    steps: number[] // 1..12
    startAmount: number
    targetProfit: number
    dailyMaxLoss: number
    dailyTargetProfit: number
    maxConsecutiveFail: number
    bettingPerCycleLimit: number
    cycleLimit: number
    winBehavior: 'resetTo1' | 'stop'
    failBehaviorAfterMaxStep: 'stop' | 'resetTo1'
    engineSwitchBehavior: 'lockUntilCycleEnd' | 'immediate'
  }
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: 1,
  tableId: 'LOCAL',
  tieMode: 'EXCLUDE_FOR_DIRECTION',
  allowWait: true,
  enableScanner: false,
  // 개발 서버 프록시(/scanner-ws) 사용. 앱이 열린 호스트와 동일하게 연결됨.
  websocketUrl: 'auto',
  scannerHeartbeatMs: 5000,
  autoBetMasterSwitch: false,
  autoBetTestingMode: true,
  autoBetHysteresisMs: 5000,
  multiEnsemble: {
    minSampleDefault: 50,
    reevaluateEveryRounds: 5,
    replacementMinDelta: 3,
    minKeepRounds: 10,
    maxEnginesToCompare: 8,
  },
  martingale: {
    activeStrategyId: 'multiEnsembleBet',
    steps: Array.from({ length: 12 }, (_, i) => (i === 0 ? 1 : 2 ** i)),
    startAmount: 1,
    targetProfit: 10,
    dailyMaxLoss: 10,
    dailyTargetProfit: 10,
    maxConsecutiveFail: 20,
    bettingPerCycleLimit: 12,
    cycleLimit: 999,
    winBehavior: 'resetTo1',
    failBehaviorAfterMaxStep: 'stop',
    engineSwitchBehavior: 'lockUntilCycleEnd',
  },
}

