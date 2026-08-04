import type { ActualResult, AppSettings, BalanceSnapshot, EngineId, EntryState, RoundResult, Side } from './types'
import type { EngineScore } from './types'
import { mulberry32 } from './prng'
import { wilsonLowerBound } from './wilson'

function sideToActual(a: ActualResult): Side | null {
  if (a.type === 'TIE') return null
  return a.type === 'PLAYER' ? 'PLAYER' : 'BANKER'
}

function invertSide(s: Side): Side {
  return s === 'PLAYER' ? 'BANKER' : 'PLAYER'
}

function computeEntryState(confidence: number, allowWait: boolean): EntryState {
  if (!allowWait) return 'ENTRY'
  // WAIT 임계값: 근거가 약하면 관망
  return confidence >= 0.58 ? 'ENTRY' : 'WAIT'
}

function computeRecentSideCounts(rounds: RoundResult[], uptoExclusive: number, tieMode: AppSettings['tieMode'], window: number) {
  const recent: Side[] = []
  for (let i = Math.max(0, uptoExclusive - window); i < uptoExclusive; i++) {
    const r = rounds[i]
    const s = r.actual
    if (s === 'TIE') {
      if (tieMode === 'INCLUDE_AS_TIE') {
        // direction pattern 계산에서는 기본적으로 tie를 제외하지만, 모드에 따라 포함
        // 여기서는 제외하지 않고 특별 토큰 대신 null을 처리할 수 있어야 하지만,
        // 본 엔진은 tie 모드를 실제 확률에 반영하지 않고, "패턴 입력 데이터"에서만 제어합니다.
        continue
      }
      continue
    }
    recent.push(s as Side)
  }
  let player = 0
  let banker = 0
  for (const s of recent) {
    if (s === 'PLAYER') player++
    if (s === 'BANKER') banker++
  }
  return { recent: recent.length, player, banker }
}

function findLastNonTieSide(rounds: RoundResult[], uptoExclusive: number): Side | null {
  for (let i = uptoExclusive - 1; i >= 0; i--) {
    const a = rounds[i]?.actual
    if (a === 'PLAYER' || a === 'BANKER') return a as Side
  }
  return null
}

function conditionalNextFreq(rounds: RoundResult[], prevSide: Side, uptoExclusive: number, window: number) {
  // prevSide가 나왔던 시점들의 다음 결과를 집계
  const samples: Side[] = []
  const start = Math.max(0, uptoExclusive - window)
  for (let i = start; i < uptoExclusive - 1; i++) {
    const cur = rounds[i]?.actual
    const next = rounds[i + 1]?.actual
    if (cur === prevSide && (next === 'PLAYER' || next === 'BANKER')) {
      samples.push(next as Side)
    }
  }
  let player = 0
  let banker = 0
  for (const s of samples) {
    if (s === 'PLAYER') player++
    else banker++
  }
  return { n: samples.length, player, banker }
}

export type EngineSimPrediction = {
  engineId: EngineId
  engineName: string
  roundIndex: number
  predictedSide?: Side
  confidence?: number
  entryState: EntryState
  // engine2
  predictedOutcome?: 'SUCCESS' | 'FAIL'
  probability?: number
  predictedReason: string
}

export function simulateNextPredictionsForRound(params: {
  engine1HistorySuccess: boolean[] // engine1의 과거 예측 성공 여부(라운드 인덱스 기준: i는 target round i에 대한 engine1 예측)
  engine1ConfidenceAtTarget: number[]
  rounds: RoundResult[] // all gameResults sorted for current shoe
  balanceSnapshots: BalanceSnapshot[]
  settings: AppSettings
  shoeId: number
  tableId: string
  targetRoundIndex: number
  // seeded randomness
  randomSeed: number
}) {
  const { rounds, balanceSnapshots, settings, tableId, targetRoundIndex, randomSeed } = params
  const uptoExclusive = targetRoundIndex // 예측 대상 라운드는 rounds[targetRoundIndex]가 실제가 되며, 예측은 그 이전 데이터로 생성
  const history = rounds.slice(0, uptoExclusive)

  const tieMode = settings.tieMode
  const allowWait = settings.allowWait

  const lastSide = findLastNonTieSide(history, history.length)
  const recentCounts = computeRecentSideCounts(history, history.length, tieMode, 30)

  // ---------------------------
  // Engine1: 다음 방향(PLAYER/BANKER) 예측
  // ---------------------------
  let e1Pred: Side = recentCounts.player >= recentCounts.banker ? 'PLAYER' : 'BANKER'
  let e1Confidence = 0.5
  let e1Reason = '최근 방향 빈도 기반'

  if (lastSide) {
    const cond = conditionalNextFreq(history, lastSide, history.length, 60)
    const { n, player, banker } = cond
    if (n >= 8) {
      const pPlayer = player / n
      const pBanker = banker / n
      e1Pred = pPlayer >= pBanker ? 'PLAYER' : 'BANKER'
      const dominance = Math.abs(pPlayer - 0.5) * 2 // 0..1-ish
      e1Confidence = 0.5 + 0.45 * dominance * Math.min(1, n / 25)
      e1Reason = `직전 ${lastSide} 이후 다음 결과 빈도(표본 ${n})`
    } else {
      e1Pred = recentCounts.player >= recentCounts.banker ? 'PLAYER' : 'BANKER'
      const dominance = Math.abs(recentCounts.player / Math.max(1, recentCounts.recent) - 0.5) * 2
      e1Confidence = 0.5 + 0.25 * dominance
      e1Reason = `직전 상태 표본 부족 → 최근 빈도(최근 ${recentCounts.recent})`
    }
  }

  const e1EntryState = computeEntryState(e1Confidence, allowWait)

  // ---------------------------
  // Engine2: Engine1의 "성공/실패" 확률 예측
  // ---------------------------
  const targetEngine1Confidence = e1Confidence
  const confidenceBand = 0.12
  let matchN = 0
  let matchSuccess = 0
  const start = Math.max(0, params.engine1ConfidenceAtTarget.length - 300)
  for (let i = start; i < params.engine1ConfidenceAtTarget.length; i++) {
    const c = params.engine1ConfidenceAtTarget[i]
    if (Math.abs(c - targetEngine1Confidence) <= confidenceBand) {
      matchN++
      if (params.engine1HistorySuccess[i]) matchSuccess++
    }
  }

  let e2Probability = matchN > 0 ? matchSuccess / matchN : 0.5
  // 샘플이 매우 적으면 극단값 방지
  if (matchN < 10) e2Probability = 0.5 + (e2Probability - 0.5) * 0.5

  const e2PredOutcome: 'SUCCESS' | 'FAIL' = e2Probability >= 0.5 ? 'SUCCESS' : 'FAIL'
  const e2EntryState: EntryState = allowWait ? 'ENTRY' : 'ENTRY'
  const e2Reason =
    matchN > 0
      ? `Engine1 confidence 유사 구간(표본 ${matchN})의 성공률 기반`
      : '유사 구간 표본 부족 → 중립(0.5)'

  // ---------------------------
  // Engine3: Engine1 방향 유지/반전(Engine2 기반)
  // ---------------------------
  const recent = history.filter((r) => r.actual === 'PLAYER' || r.actual === 'BANKER')
  const playerCount = recent.filter((r) => r.actual === 'PLAYER').length
  const ratioPlayer = playerCount / Math.max(1, recent.length)
  const bias = Math.abs(ratioPlayer - 0.5) * 2 // 0..1

  let e3Pred: Side = e1Pred
  let e3Confidence = e1Confidence
  let e3EntryState: EntryState = e1EntryState
  let e3Reason = 'Engine1 + Engine2 결합'

  if (e2PredOutcome === 'FAIL') {
    // 쏠림 방지: bias가 큰 구간에서 무작정 반전 금지 (확률이 충분히 높을 때만 반전)
    if (e2Probability >= 0.62 || bias <= 0.35) {
      e3Pred = invertSide(e1Pred)
      // 반전일 때 신뢰도를 약간 낮춰서 과도한 전환을 완화
      e3Confidence = Math.max(0.45, Math.min(0.8, e1Confidence * 0.9 + (e2Probability - 0.5) * 0.6))
      e3Reason = 'Engine2가 FAIL 예상 → 조건부 반전(쏠림 방지 적용)'
      e3EntryState = computeEntryState(e3Confidence, allowWait)
    } else {
      e3Pred = e1Pred
      e3Confidence = Math.max(0.45, e1Confidence * 0.95)
      e3EntryState = computeEntryState(0.52 + (e2Probability - 0.5) * 0.4, allowWait)
      e3Reason = 'Engine2 FAIL이지만 반전 확률/쏠림 조건 미충족 → 관망/유지'
    }
  } else {
    e3Reason = 'Engine2가 SUCCESS 예상 → Engine1 유지'
    e3Confidence = Math.min(0.95, e1Confidence * (0.98 + (e2Probability - 0.5) * 0.4))
    e3EntryState = computeEntryState(e3Confidence, allowWait)
  }

  // ---------------------------
  // existing final pick (보존 대상이 없으므로 "기존 최종픽"으로 별도 룰을 제공)
  // ---------------------------
  // - Engine3 예측을 1차로 사용
  // - Engine3 confidence가 낮으면 WAIT 허용
  const finalExistingPred: Side = e3Pred
  const finalExistingConfidence = e3Confidence * 0.98
  const finalExistingEntryState = computeEntryState(finalExistingConfidence, allowWait)

  // ---------------------------
  // AI 자동픽 엔진 (간단한 특징 기반 확률)
  // ---------------------------
  // - 최근 20의 비율과 직전 전환 빈도를 특징으로 사용
  const last20 = history.slice(Math.max(0, history.length - 20)).filter((r) => r.actual === 'PLAYER' || r.actual === 'BANKER')
  const player20 = last20.filter((r) => r.actual === 'PLAYER').length
  const ratio20 = player20 / Math.max(1, last20.length)
  const transitions = (() => {
    let t = 0
    for (let i = 1; i < last20.length; i++) {
      if (last20[i].actual !== last20[i - 1].actual) t++
    }
    return t
  })()
  const transitionRate = transitions / Math.max(1, last20.length - 1)

  // transition이 높으면 반대쪽으로 약간 이동 (과적중 방지 위해 낮은 가중치)
  let aiAutoPred: Side = ratio20 >= 0.5 ? 'PLAYER' : 'BANKER'
  if (transitionRate >= 0.35) aiAutoPred = invertSide(aiAutoPred)
  const aiAutoConfidence = 0.5 + 0.25 * Math.abs(ratio20 - 0.5) * 2 + 0.15 * transitionRate
  const aiAutoEntryState = computeEntryState(aiAutoConfidence, allowWait)
  const aiAutoReason = '최근 비율 + 전환율 특징 기반'

  // ---------------------------
  // Random 기준 엔진 (재현 가능한 seed)
  // ---------------------------
  const rng = mulberry32((randomSeed + targetRoundIndex) >>> 0)
  const randomPred: Side = rng() < 0.5 ? 'PLAYER' : 'BANKER'
  const randomConfidence = 0.5
  const randomEntryState: EntryState = 'ENTRY' // random baseline은 항상 비교 가능하게 ENTRY
  const randomReason = 'seed 기반 난수(재현성 유지)'

  // ---------------------------
  // AI 밸런스 엔진
  // ---------------------------
  const aiBalance = (() => {
    const snapshotsUpTo = balanceSnapshots
      .filter((s) => s.tableId === tableId && s.roundIndex <= uptoExclusive)
      .sort((a, b) => a.roundIndex - b.roundIndex || a.timestamp - b.timestamp)
    const latest = snapshotsUpTo.length ? snapshotsUpTo[snapshotsUpTo.length - 1] : null
    if (!latest) {
      return {
        pred: 'PLAYER' as Side,
        confidence: 0.0,
        entryState: 'WAIT' as EntryState,
        reason: '밸런스 스냅샷 데이터가 없습니다.',
      }
    }

    const player = latest.playerTotal
    const banker = latest.bankerTotal
    const total = player + banker
    if (total <= 0) {
      return { pred: 'PLAYER' as Side, confidence: 0.0, entryState: 'WAIT' as EntryState, reason: '금액 스냅샷이 비어있습니다.' }
    }
    const ratioDiff = Math.abs(player - banker) / total // 0..1
    const lowerSide: Side = player <= banker ? 'PLAYER' : 'BANKER'

    // 과거 유사 구간(비슷한 ratioDiff)에서 lowerSide가 이겼는지 학습
    const similar = snapshotsUpTo
      .filter((s) => {
        const t = s.playerTotal + s.bankerTotal
        if (t <= 0) return false
        const diff = Math.abs(s.playerTotal - s.bankerTotal) / t
        return Math.abs(diff - ratioDiff) <= 0.05
      })
      .slice(-150)

    // 유사 구간에서 실제 결과 매칭
    let n = 0
    let wins = 0
    for (const s of similar) {
      const idx = s.roundIndex
      const actual = rounds[idx]?.actual
      if (actual === 'TIE' || actual === undefined) continue
      if (actual !== 'PLAYER' && actual !== 'BANKER') continue
      n++
      if (actual === lowerSide) wins++
    }

    if (n < 15) {
      return {
        pred: lowerSide,
        confidence: 0.0,
        entryState: 'WAIT' as EntryState,
        reason: `유사 밸런스 표본 부족(표본 ${n})`,
      }
    }

    const successRate = wins / n
    const wLB = wilsonLowerBound(wins, n)
    const randomTarget = 0.5 + ratioDiff * 0.02 // 랜덤 기준과의 구분을 약하게 잡음
    const shouldEnter = wLB >= randomTarget && ratioDiff >= 0.06

    const conf = Math.max(0, Math.min(0.95, wLB * 1.05 + (successRate - 0.5) * 0.2))
    const aiBalanceEntryState: EntryState = shouldEnter && allowWait ? 'ENTRY' : allowWait ? 'WAIT' : 'ENTRY'
    return {
      pred: lowerSide,
      confidence: conf,
      entryState: aiBalanceEntryState,
      reason: `유사 구간 lowerSide 성공률(Wilson 하한 ${wLB.toFixed(3)}), 격차 ${ratioDiff.toFixed(3)}`,
    }
  })()

  // ---------------------------
  // 엔진별 엔트리 상태 및 예측 구조화
  // ---------------------------
  const predictions: Record<EngineId, EngineSimPrediction> = {
    engine1: {
      engineId: 'engine1',
      engineName: '1번 엔진',
      roundIndex: targetRoundIndex,
      predictedSide: e1Pred,
      confidence: e1Confidence,
      entryState: e1EntryState,
      predictedReason: e1Reason,
    },
    engine2: {
      engineId: 'engine2',
      engineName: '2번 엔진',
      roundIndex: targetRoundIndex,
      entryState: e2EntryState,
      predictedOutcome: e2PredOutcome,
      probability: e2Probability,
      predictedReason: e2Reason,
    },
    engine3: {
      engineId: 'engine3',
      engineName: '3번 엔진',
      roundIndex: targetRoundIndex,
      predictedSide: e3Pred,
      confidence: e3Confidence,
      entryState: e3EntryState,
      predictedReason: e3Reason,
    },
    finalExisting: {
      engineId: 'finalExisting',
      engineName: '기존 최종픽',
      roundIndex: targetRoundIndex,
      predictedSide: finalExistingPred,
      confidence: finalExistingConfidence,
      entryState: finalExistingEntryState,
      predictedReason: 'Engine3 기반(보수적)',
    },
    aiAutoPick: {
      engineId: 'aiAutoPick',
      engineName: 'AI 자동픽',
      roundIndex: targetRoundIndex,
      predictedSide: aiAutoPred,
      confidence: aiAutoConfidence,
      entryState: aiAutoEntryState,
      predictedReason: aiAutoReason,
    },
    randomBaseline: {
      engineId: 'randomBaseline',
      engineName: '랜덤 기준',
      roundIndex: targetRoundIndex,
      predictedSide: randomPred,
      confidence: randomConfidence,
      entryState: randomEntryState,
      predictedReason: randomReason,
    },
    aiBalance: {
      engineId: 'aiBalance',
      engineName: 'AI 밸런스 엔진',
      roundIndex: targetRoundIndex,
      predictedSide: aiBalance.pred,
      confidence: aiBalance.confidence,
      entryState: aiBalance.entryState,
      predictedReason: aiBalance.reason,
    },
    multiEnsemble: {
      engineId: 'multiEnsemble',
      engineName: '종합 멀티 엔진',
      roundIndex: targetRoundIndex,
      entryState: 'WAIT',
      predictedReason: '선택 알고리즘에서 결정됨',
    },
  }

  return { predictions, engine1EntryState: e1EntryState, engine1Pred: e1Pred, engine1Confidence: e1Confidence }
}

function computeEngineEvaluationForRound(params: {
  engine: EngineSimPrediction
  actual: ActualResult
  tieMode: AppSettings['tieMode']
}) {
  const { engine, actual } = params
  if (actual.type === 'TIE') {
    return { skipped: true, success: false, entryState: engine.entryState }
  }
  if (engine.entryState === 'WAIT') {
    // 관망이면 엔진 성과 샘플에서 제외
    return { skipped: true, success: false, entryState: engine.entryState }
  }
  const predicted = engine.predictedSide
  if (!predicted) return { skipped: true, success: false, entryState: engine.entryState }
  const actualSide = sideToActual(actual)
  if (!actualSide) return { skipped: true, success: false, entryState: engine.entryState }
  const success = predicted === actualSide
  return { skipped: false, success, entryState: engine.entryState }
}

export type SessionAnalysis = {
  shoeId: number
  tableId: string
  // 다음 라운드 예측
  nextRoundIndex: number
  engineNextPredictions: Record<Exclude<EngineId, 'multiEnsemble'>, EngineSimPrediction>
  multiPick: {
    selectedEngineId: EngineId
    entryState: EntryState
    predictedSide: Side | null
    confidence: number
    reason: string
    minSampleReached: boolean
    reevaluateIn: number
    engineScores: EngineScore[]
    switchHappened: boolean
  }
  // 최근 결과/블록
  lastRounds: RoundResult[]
  last20Results: ActualResult[]
  multiHistory: Array<{ roundIndex: number; success: boolean; skipped: boolean; predictedSide: Side | null; entryState: EntryState }>
  last20Multi: Array<{ roundIndex: number; success: boolean; skipped: boolean; predictedSide: Side | null }>
  // 선택 엔진과 마틴 진입/신호
  martingaleSignalForNextRound: { entryState: EntryState; predictedSide: Side | null }
  // 엔진별 최근 성과
  engineStatsForCards: EngineScore[]
}

export function analyzeSession(params: {
  rounds: RoundResult[]
  balanceSnapshots: BalanceSnapshot[]
  settings: AppSettings
  shoeId: number
  tableId: string
  randomSeed: number
}) {
  const { rounds, settings, balanceSnapshots, shoeId, tableId, randomSeed } = params
  const tieMode = settings.tieMode

  const n = rounds.length

  // engine1 과거 성공/성공 confidence 기록(라운드 인덱스 기준)
  const engine1SuccessByRoundIndex: boolean[] = []
  const engine1ConfidenceByRoundIndex: number[] = []

  // multi 선택 상태
  let selectedEngineId: EngineId = 'engine1'
  let keepRemaining = 0
  let switchHappened = false

  const engineEvalHistory: Record<string, Array<{ roundIndex: number; success: boolean; skipped: boolean; entryState: EntryState }>> =
    {}
  const engineSimulatedProfitHistory: Record<string, number[]> = {}

  const engineIdsToCompare: EngineId[] = [
    'engine1',
    'engine2',
    'engine3',
    'finalExisting',
    'aiAutoPick',
    'randomBaseline',
    'aiBalance',
  ]

  for (const id of engineIdsToCompare) {
    engineEvalHistory[id] = []
    engineSimulatedProfitHistory[id] = []
  }

  const multiHistory: Array<{ roundIndex: number; success: boolean; skipped: boolean; predictedSide: Side | null; entryState: EntryState }> = []

  // Helper: 최근/장기 성공률 계산용
  function computeSuccessRates(engineId: EngineId, uptoExclusive: number) {
    const history = engineEvalHistory[engineId]
    const considered = history.filter((e) => e.roundIndex < uptoExclusive && !e.skipped)
    const recent = (len: number) => considered.slice(Math.max(0, considered.length - len))
    const successes = considered.filter((e) => e.success).length
    const total = considered.length
    const rate = total > 0 ? successes / total : 0
    const r20 = recent(20)
    const r50 = recent(50)
    const r100 = recent(100)
    const rate20 = r20.length ? r20.filter((e) => e.success).length / r20.length : 0
    const rate50 = r50.length ? r50.filter((e) => e.success).length / r50.length : 0
    const rate100 = r100.length ? r100.filter((e) => e.success).length / r100.length : 0

    // consecutive miss
    let consecutiveMiss = 0
    let maxConsecutiveMiss = 0
    for (let i = considered.length - 1; i >= 0; i--) {
      const e = considered[i]
      if (!e.success) {
        consecutiveMiss++
        maxConsecutiveMiss = Math.max(maxConsecutiveMiss, consecutiveMiss)
      } else {
        break
      }
    }

    const profits = engineSimulatedProfitHistory[engineId]
      .filter((_, idx) => idx < uptoExclusive)
      .slice(-500)
    let maxDrawdown = 0
    let cum = 0
    let maxCum = -Infinity
    // profitsHistory in this implementation stores per-entry incremental result (+1/-1), so compute cum
    for (const p of profits) {
      cum += p
      maxCum = Math.max(maxCum, cum)
      maxDrawdown = Math.max(maxDrawdown, maxCum - cum)
    }
    return {
      total,
      rate,
      rate20,
      rate50,
      rate100,
      consecutiveMiss,
      maxConsecutiveMiss,
      maxDrawdown,
      successes,
    }
  }

  function computeEngineScore(engineId: EngineId, uptoExclusive: number): EngineScore {
    const { successes, total, rate, rate20, rate50, rate100, consecutiveMiss, maxConsecutiveMiss, maxDrawdown } =
      computeSuccessRates(engineId, uptoExclusive)
    const wilsonLower = wilsonLowerBound(successes, total)

    const longRate = rate
    const recentConsecutive = consecutiveMiss
    const randomExtra = (() => {
      if (engineId === 'randomBaseline') return 0
      const random = computeSuccessRates('randomBaseline', uptoExclusive)
      return rate - random.rate
    })()

    const scoreConfig = settings.multiEnsemble
    const minSampleDefault = scoreConfig.minSampleDefault

    const minSampleReached = total >= minSampleDefault || total >= 50

    // bias penalization: too many consecutive misses or high drawdown
    const biasPenalty = Math.min(30, (recentConsecutive * 0.8 + maxDrawdown * 0.15))
    const sampleBonus = Math.min(10, total / 10)

    const recentMomentum = (() => {
      // 최근 성과 변화(단순 대체): rate20 vs rate100 차이
      return (rate20 - rate100) * 100
    })()

    const score =
      wilsonLower * 45 +
      rate50 * 20 +
      rate20 * 10 +
      longRate * 10 +
      randomExtra * 5 +
      (maxConsecutiveMiss <= 0 ? 0 : 1 / (1 + maxConsecutiveMiss)) * 5 +
      sampleBonus +
      Math.max(-10, Math.min(10, recentMomentum * 0.02)) -
      biasPenalty

    const reason = `Wilson(${wilsonLower.toFixed(3)}) + 표본 ${total} + 최근20(${rate20.toFixed(2)})`
    return {
      engineId,
      totalN: total,
      successRate: rate,
      wilsonLower,
      recent20SuccessRate: rate20,
      recent50SuccessRate: rate50,
      recent100SuccessRate: rate100,
      consecutiveMiss: recentConsecutive,
      maxConsecutiveMiss,
      maxDrawdown,
      simulatedProfit: total ? successes - (total - successes) : 0,
      score,
      minSampleReached,
      reason,
    }
  }

  // ------------------------------
  // Main simulation across known rounds
  // ------------------------------
  // For each round i, generate predictions for i using history < i, evaluate against actual at i, update multi selection for next round output at i+1.
  for (let i = 0; i < n; i++) {
    const { predictions, engine1Confidence } = simulateNextPredictionsForRound({
      rounds,
      balanceSnapshots,
      settings,
      shoeId,
      tableId,
      targetRoundIndex: i,
      engine1HistorySuccess: engine1SuccessByRoundIndex,
      engine1ConfidenceAtTarget: engine1ConfidenceByRoundIndex,
      randomSeed,
    })

    // evaluate engine1 for learning sequences (SUCCESS/FAIL)
    const actualR = rounds[i]
    const actual: ActualResult =
      actualR.actual === 'TIE'
        ? { type: 'TIE', side: 'TIE' }
        : actualR.actual === 'PLAYER'
          ? { type: 'PLAYER', side: 'PLAYER' }
          : { type: 'BANKER', side: 'BANKER' }

    const e1Eval = computeEngineEvaluationForRound({ engine: predictions.engine1, actual, tieMode })
    engine1SuccessByRoundIndex[i] = e1Eval.skipped ? false : e1Eval.success
    engine1ConfidenceByRoundIndex[i] = engine1Confidence

    for (const id of engineIdsToCompare) {
      if (id === 'engine2') {
        // engine2의 평가는 "성공/실패 예측"으로 다르게 저장하지만,
        // multiEnsemble 점수 비교에서는 방향 성과 대신 동일 샘플로 근사합니다.
        // 실제 엔진 성과 비교 정책은 UI에서 별도 표기 가능.
        engineEvalHistory[id].push({
          roundIndex: i,
          success: false,
          skipped: true,
          entryState: 'WAIT',
        })
        engineSimulatedProfitHistory[id].push(0)
        continue
      }

      const evalInfo = computeEngineEvaluationForRound({ engine: predictions[id] as any, actual, tieMode })
      engineEvalHistory[id].push({
        roundIndex: i,
        success: evalInfo.success,
        skipped: evalInfo.skipped,
        entryState: evalInfo.entryState,
      })
      engineSimulatedProfitHistory[id].push(evalInfo.skipped ? 0 : evalInfo.success ? 1 : -1)
    }

    // multi pick for this round (based on stats upto i)
    const candidateScores = engineIdsToCompare
      .filter((eid) => eid !== 'engine2') // engine2는 방향 엔진으로 평가 제외(근사)
      .map((eid) => computeEngineScore(eid, i))
      .filter((s) => s.minSampleReached)

    // 기본값: 점수가 없으면 engine1
    const currentScore = computeEngineScore(selectedEngineId === 'engine2' ? 'engine1' : (selectedEngineId as any), i)

    let best = candidateScores.sort((a, b) => b.score - a.score)[0]
    if (!best) best = computeEngineScore('engine1', i)

    const reevaluateEvery = settings.multiEnsemble.reevaluateEveryRounds
    if (keepRemaining > 0) {
      keepRemaining--
      switchHappened = false
    } else {
      if (i > 0 && i % reevaluateEvery === 0) {
        if (best.engineId !== selectedEngineId) {
          const delta = best.score - currentScore.score
          if (delta >= settings.multiEnsemble.replacementMinDelta) {
            selectedEngineId = best.engineId
            keepRemaining = settings.multiEnsemble.minKeepRounds - 1
            switchHappened = true
          } else {
            switchHappened = false
          }
        }
      }
    }

    // multi pick prediction for round i: use prediction from selected engine
    const selectedPrediction = predictions[selectedEngineId as Exclude<EngineId, 'multiEnsemble'>]
    const multiEntryState = selectedPrediction.entryState
    const predictedSide = multiEntryState === 'ENTRY' ? selectedPrediction.predictedSide ?? null : null

    let multiSuccess = false
    let multiSkipped = multiEntryState !== 'ENTRY' || actual.type === 'TIE'
    if (!multiSkipped && predictedSide) {
      multiSuccess = actual.type !== 'TIE' && actual.type === predictedSide
    }
    multiHistory.push({ roundIndex: i, success: multiSuccess, skipped: multiSkipped, predictedSide, entryState: multiEntryState })
  }

  // ------------------------------
  // Next round predictions (index n)
  // ------------------------------
  const { predictions } = simulateNextPredictionsForRound({
    rounds,
    balanceSnapshots,
    settings,
    shoeId,
    tableId,
    targetRoundIndex: n,
    engine1HistorySuccess: engine1SuccessByRoundIndex,
    engine1ConfidenceAtTarget: engine1ConfidenceByRoundIndex,
    randomSeed,
  })

  // score candidates for next round selection
  const engineScores = engineIdsToCompare
    .filter((eid) => eid !== 'engine2')
    .map((eid) => computeEngineScore(eid, n))

  const eligible = engineScores.filter((s) => s.minSampleReached)
  const best = eligible.sort((a, b) => b.score - a.score)[0] ?? engineScores.sort((a, b) => b.score - a.score)[0]

  // respect hysteresis for next pick: keepRemaining not fully simulated beyond n, so decide to switch only if eligible best differs and delta>=threshold
  let finalSelectedEngineId = selectedEngineId
  let delta = best.score - computeEngineScore(selectedEngineId === 'engine2' ? 'engine1' : (selectedEngineId as any), n).score
  let finalSwitch = false
  if (best.engineId !== finalSelectedEngineId && delta >= settings.multiEnsemble.replacementMinDelta) {
    finalSelectedEngineId = best.engineId
    finalSwitch = true
  }

  const chosen = predictions[finalSelectedEngineId as Exclude<EngineId, 'multiEnsemble'>]
  let entryState = chosen.entryState
  let predictedSide = entryState === 'ENTRY' ? (chosen.predictedSide ?? null) : null
  let confidence = chosen.confidence ?? 0.5
  if (!best.minSampleReached) {
    // 최소 표본이 충족되지 않으면 실제 배팅 입력을 금지(관망)
    entryState = 'WAIT'
    predictedSide = null
    confidence = 0.0
  }

  const multiReason = `${chosen.engineName} 선택: ${best.reason}`

  // last blocks for UI
  const lastRounds = rounds.slice(Math.max(0, n - 60))
  const last20Results = rounds
    .slice(Math.max(0, n - 20))
    .map((r) => (r.actual === 'TIE' ? ({ type: 'TIE', side: 'TIE' } as ActualResult) : ({ type: r.actual, side: r.actual } as ActualResult)))

  const last20Multi = multiHistory.slice(Math.max(0, multiHistory.length - 20)).map((m) => ({
    roundIndex: m.roundIndex,
    success: m.success,
    skipped: m.skipped,
    predictedSide: m.predictedSide,
  }))

  return {
    shoeId,
    tableId,
    nextRoundIndex: n,
    engineNextPredictions: predictions as any,
    multiPick: {
      selectedEngineId: finalSelectedEngineId,
      entryState,
      predictedSide,
      confidence,
      reason: multiReason,
      minSampleReached: best.minSampleReached,
      reevaluateIn: Math.max(0, settings.multiEnsemble.reevaluateEveryRounds - 1),
      engineScores: engineScores.sort((a, b) => b.score - a.score),
      switchHappened: finalSwitch || switchHappened,
    },
    lastRounds,
    last20Results,
    multiHistory,
    last20Multi,
    martingaleSignalForNextRound: { entryState, predictedSide },
    engineStatsForCards: engineScores.sort((a, b) => b.score - a.score),
  } satisfies SessionAnalysis
}

