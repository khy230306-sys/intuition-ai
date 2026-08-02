import type {
  AnalysisResult,
  CardNumber,
  EngineResult,
  GameRecord,
  HeaderStats,
  Position,
} from './types'

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function normalize(probs: [number, number, number]): [number, number, number] {
  const sum = probs[0] + probs[1] + probs[2]
  if (sum <= 0) return [1 / 3, 1 / 3, 1 / 3]
  return [probs[0] / sum, probs[1] / sum, probs[2] / sum]
}

function argmax(probs: [number, number, number]): Position {
  let best: Position = 1
  let val = probs[0]
  for (let i = 1; i < 3; i++) {
    if (probs[i] > val) {
      val = probs[i]
      best = (i + 1) as Position
    }
  }
  return best
}

function winRate(hits: number, total: number, prior = 0.5, strength = 2): number {
  return (hits + prior * strength) / (total + strength)
}

function sliceRecent(records: GameRecord[], n: number): GameRecord[] {
  if (records.length <= n) return records
  return records.slice(records.length - n)
}

function hitRate(records: GameRecord[]): number | null {
  const scored = records.filter((r) => r.hit !== null)
  if (!scored.length) return null
  const hits = scored.filter((r) => r.hit).length
  return hits / scored.length
}

function comboKey(cards: [CardNumber, CardNumber, CardNumber]): string {
  return `${cards[0]}-${cards[1]}-${cards[2]}`
}

function sortedKey(cards: [CardNumber, CardNumber, CardNumber]): string {
  return [...cards].sort((a, b) => a - b).join('-')
}

/** Engine 1: 숫자 기반 — 각 위치의 숫자가 과거에 그 위치에서 이긴 비율 */
function engineNumber(
  records: GameRecord[],
  cards: [CardNumber, CardNumber, CardNumber],
): EngineResult {
  const scores: [number, number, number] = [0, 0, 0]
  let sample = 0
  for (let pos = 0; pos < 3; pos++) {
    const n = cards[pos]
    let wins = 0
    let total = 0
    for (const r of records) {
      if (r.cards[pos] === n) {
        total++
        if (r.winner === pos + 1) wins++
      }
    }
    sample += total
    scores[pos] = winRate(wins, total)
  }
  return {
    name: '숫자 기반',
    probs: normalize(scores),
    weight: Math.min(1, sample / 60),
    sample,
    reason: `각 위치 숫자(${cards.join(',')})의 과거 승률`,
  }
}

/** Engine 2: 위치 기반 — 단순 위치별 승률 */
function enginePosition(records: GameRecord[]): EngineResult {
  const wins = [0, 0, 0]
  for (const r of records) wins[r.winner - 1]++
  const total = records.length
  const probs: [number, number, number] = [
    winRate(wins[0], total),
    winRate(wins[1], total),
    winRate(wins[2], total),
  ]
  return {
    name: '위치 기반',
    probs: normalize(probs),
    weight: Math.min(1, total / 40) * 0.6,
    sample: total,
    reason: `전체 위치별 승률 분포`,
  }
}

/** Engine 3: 숫자+위치 조합 — 동일 조합 / 순서 무시 조합 */
function engineCombo(
  records: GameRecord[],
  cards: [CardNumber, CardNumber, CardNumber],
): EngineResult {
  const exact = comboKey(cards)
  const soft = sortedKey(cards)
  const wins = [0, 0, 0]
  let exactN = 0
  let softN = 0
  const softWins = [0, 0, 0]

  for (const r of records) {
    const ek = comboKey(r.cards)
    const sk = sortedKey(r.cards)
    if (ek === exact) {
      exactN++
      wins[r.winner - 1]++
    } else if (sk === soft) {
      softN++
      softWins[r.winner - 1]++
    }
  }

  const scores: [number, number, number] = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    const exactRate = winRate(wins[i], exactN, 1 / 3, Math.max(1, exactN ? 1 : 3))
    const softRate = winRate(softWins[i], softN, 1 / 3, 3)
    scores[i] = exactN >= 3 ? exactRate * 0.75 + softRate * 0.25 : softRate * 0.55 + exactRate * 0.45
  }

  return {
    name: '숫자+위치 조합',
    probs: normalize(scores),
    weight: Math.min(1.2, (exactN * 2 + softN) / 20),
    sample: exactN + softN,
    reason:
      exactN > 0
        ? `동일조합 ${exactN}판 · 순서무시 ${softN}판`
        : softN > 0
          ? `순서무시 조합 ${softN}판`
          : '유사 조합 표본 부족 → 약한 신호',
  }
}

/** Engine 4: 최근 흐름 — 최근 30/50/100 + 연승/연패 */
function engineRecent(
  records: GameRecord[],
  cards: [CardNumber, CardNumber, CardNumber],
): EngineResult {
  const windows = [30, 50, 100] as const
  const scores: [number, number, number] = [0, 0, 0]
  let sample = 0

  for (const w of windows) {
    const slice = sliceRecent(records, w)
    const wWeight = w === 30 ? 1.4 : w === 50 ? 1.0 : 0.7
    for (let pos = 0; pos < 3; pos++) {
      const n = cards[pos]
      let wins = 0
      let total = 0
      for (const r of slice) {
        if (r.cards[pos] === n) {
          total++
          if (r.winner === pos + 1) wins++
        }
      }
      // 최근 위치 승률도 가산
      let posWins = 0
      for (const r of slice) if (r.winner === pos + 1) posWins++
      const posRate = winRate(posWins, slice.length)
      const numRate = winRate(wins, total)
      scores[pos] += (numRate * 0.65 + posRate * 0.35) * wWeight
      sample += total
    }
  }

  // 연승/연패 모멘텀
  let streak = 0
  let streakPos: Position | null = null
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i]
    if (streakPos === null) {
      streakPos = r.winner
      streak = 1
    } else if (r.winner === streakPos) {
      streak++
    } else break
  }
  if (streakPos && streak >= 2) {
    const boost = Math.min(0.15, streak * 0.03)
    scores[streakPos - 1] += boost
  }

  return {
    name: '최근 흐름',
    probs: normalize(scores),
    weight: Math.min(1.1, records.length / 50),
    sample,
    reason:
      streak >= 2 && streakPos
        ? `최근 ${streakPos}번 ${streak}연승 · 단기 모멘텀 반영`
        : '최근 30/50/100판 숫자·위치 흐름',
  }
}

/** Engine 5: 전체 누적 — 숫자별 전역 승률 + 최근300 */
function engineOverall(
  records: GameRecord[],
  cards: [CardNumber, CardNumber, CardNumber],
): EngineResult {
  const all = records
  const recent300 = sliceRecent(records, 300)
  const scores: [number, number, number] = [0, 0, 0]
  let sample = 0

  for (let pos = 0; pos < 3; pos++) {
    const n = cards[pos]
    // 전역: 해당 숫자가 어느 위치든 나왔을 때 그 위치가 이긴 비율
    let gWins = 0
    let gTotal = 0
    for (const r of all) {
      for (let p = 0; p < 3; p++) {
        if (r.cards[p] === n) {
          gTotal++
          if (r.winner === p + 1) gWins++
        }
      }
    }
    let rWins = 0
    let rTotal = 0
    for (const r of recent300) {
      if (r.cards[pos] === n) {
        rTotal++
        if (r.winner === pos + 1) rWins++
      }
    }
    scores[pos] = winRate(gWins, gTotal) * 0.45 + winRate(rWins, rTotal) * 0.55
    sample += gTotal + rTotal
  }

  return {
    name: '전체 누적',
    probs: normalize(scores),
    weight: Math.min(1, all.length / 80),
    sample,
    reason: `전체 ${all.length}판 · 최근300 누적 승률`,
  }
}

function confidenceFrom(records: GameRecord[], engines: EngineResult[], probs: [number, number, number]): number {
  const total = records.length
  const sampleFactor = clamp01(total / 200)
  const agreement = (() => {
    const picks = engines.map((e) => argmax(e.probs))
    const rec = argmax(probs)
    const agree = picks.filter((p) => p === rec).length
    return agree / Math.max(1, picks.length)
  })()
  const spread = Math.max(...probs) - Math.min(...probs)
  const hit = hitRate(records)
  const calib = hit === null ? 0.5 : 0.35 + hit * 0.65
  const raw = sampleFactor * 0.35 + agreement * 0.3 + spread * 0.2 + calib * 0.15
  return Math.round(clamp01(raw) * 1000) / 10
}

export function analyze(
  records: GameRecord[],
  cards: [CardNumber, CardNumber, CardNumber],
): AnalysisResult {
  if (records.length === 0) {
    const flat: [number, number, number] = [1 / 3, 1 / 3, 1 / 3]
    return {
      probs: flat,
      recommended: 2,
      confidence: 5,
      sample: 0,
      recent50Rate: null,
      overallRate: null,
      reason: '저장된 데이터가 없습니다. 결과 입력으로 학습을 시작하세요.',
      engines: [],
    }
  }

  const engines = [
    engineNumber(records, cards),
    enginePosition(records),
    engineCombo(records, cards),
    engineRecent(records, cards),
    engineOverall(records, cards),
  ]

  const acc: [number, number, number] = [0, 0, 0]
  let wSum = 0
  for (const e of engines) {
    const w = Math.max(0.05, e.weight)
    acc[0] += e.probs[0] * w
    acc[1] += e.probs[1] * w
    acc[2] += e.probs[2] * w
    wSum += w
  }
  const probs = normalize([acc[0] / wSum, acc[1] / wSum, acc[2] / wSum])
  const recommended = argmax(probs)
  const confidence = confidenceFrom(records, engines, probs)
  const recent50 = sliceRecent(records, 50)
  const recent50Rate = hitRate(recent50)
  const overallRate = hitRate(records)

  const topEngine = [...engines].sort((a, b) => b.weight - a.weight)[0]
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  const reason = [
    `${recommended}번 ${(probs[recommended - 1] * 100).toFixed(1)}%로 최고`,
    topEngine ? `주요신호: ${topEngine.name}` : '',
    topEngine?.reason || '',
    overallRate !== null ? `AI 적중 ${pct(overallRate)}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    probs,
    recommended,
    confidence,
    sample: records.length,
    recent50Rate,
    overallRate,
    reason,
    engines,
  }
}

export function getHeaderStats(records: GameRecord[]): HeaderStats {
  const overallHitRate = hitRate(records)
  const recentHitRate = hitRate(sliceRecent(records, 50))
  // 신뢰도: 표본 + 최근 적중 기반 요약
  const sampleFactor = clamp01(records.length / 200)
  const calib = overallHitRate === null ? 0.4 : overallHitRate
  const confidence = Math.round((sampleFactor * 0.55 + calib * 0.45) * 1000) / 10
  return {
    total: records.length,
    recentHitRate,
    overallHitRate,
    confidence,
  }
}

export function numberWinRates(records: GameRecord[]): { n: number; rate: number; total: number }[] {
  const out: { n: number; rate: number; total: number }[] = []
  for (let n = 1; n <= 10; n++) {
    let wins = 0
    let total = 0
    for (const r of records) {
      for (let p = 0; p < 3; p++) {
        if (r.cards[p] === n) {
          total++
          if (r.winner === p + 1) wins++
        }
      }
    }
    out.push({ n, rate: total ? wins / total : 0, total })
  }
  return out
}

export function positionWinRates(records: GameRecord[]): { pos: Position; rate: number; total: number }[] {
  const totals = [0, 0, 0]
  for (const r of records) totals[r.winner - 1]++
  const n = records.length || 1
  return ([1, 2, 3] as Position[]).map((pos) => ({
    pos,
    rate: totals[pos - 1] / n,
    total: totals[pos - 1],
  }))
}

export function topCombos(
  records: GameRecord[],
  limit = 20,
): { key: string; wins: [number, number, number]; total: number; best: Position }[] {
  const map = new Map<string, [number, number, number]>()
  for (const r of records) {
    const k = comboKey(r.cards)
    const arr = map.get(k) || [0, 0, 0]
    arr[r.winner - 1]++
    map.set(k, arr)
  }
  return [...map.entries()]
    .map(([key, wins]) => {
      const total = wins[0] + wins[1] + wins[2]
      const best = argmax([wins[0] / total, wins[1] / total, wins[2] / total])
      return { key, wins, total, best }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export function recentRates(records: GameRecord[]): { label: string; rate: number | null; n: number }[] {
  return [30, 50, 100, 300].map((n) => {
    const slice = sliceRecent(records, n)
    return { label: `최근${n}판`, rate: hitRate(slice), n: slice.length }
  })
}

export { hitRate, sliceRecent, argmax }
