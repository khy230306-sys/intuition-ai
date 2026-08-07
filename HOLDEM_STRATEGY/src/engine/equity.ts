import { type Card, remainingDeck } from '@/engine/cards'
import { evaluateBest } from '@/engine/evaluate'

export interface EquityResult {
  winPct: number
  tiePct: number
  losePct: number
  trials: number
  opponents: number
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/** Mulberry32 PRNG for reproducible tests. */
export function createRng(seed = Date.now()): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Monte Carlo equity vs N random opponents.
 * Deals missing board cards + opponent hole cards from remaining deck.
 */
export function estimateEquity(
  hole: Card[],
  board: Card[],
  opponents = 1,
  trials = 2500,
  rng: () => number = Math.random,
): EquityResult {
  if (hole.length !== 2) {
    return { winPct: 0, tiePct: 0, losePct: 0, trials: 0, opponents }
  }
  const needBoard = Math.max(0, 5 - board.length)
  const needOpp = opponents * 2
  let wins = 0
  let ties = 0
  let losses = 0
  let done = 0

  for (let t = 0; t < trials; t += 1) {
    const pool = remainingDeck([...hole, ...board])
    if (pool.length < needBoard + needOpp) break
    shuffleInPlace(pool, rng)

    let cursor = 0
    const fullBoard = board.concat(pool.slice(cursor, cursor + needBoard))
    cursor += needBoard

    const hero = evaluateBest([...hole, ...fullBoard])
    let heroWins = true
    let heroTies = false

    for (let o = 0; o < opponents; o += 1) {
      const oppHole = pool.slice(cursor, cursor + 2)
      cursor += 2
      const vill = evaluateBest([...oppHole, ...fullBoard])
      if (vill > hero) {
        heroWins = false
        heroTies = false
        break
      }
      if (vill === hero) {
        heroWins = false
        heroTies = true
      }
    }

    if (heroWins) wins += 1
    else if (heroTies) ties += 1
    else losses += 1
    done += 1
  }

  if (done === 0) return { winPct: 0, tiePct: 0, losePct: 0, trials: 0, opponents }
  return {
    winPct: (wins / done) * 100,
    tiePct: (ties / done) * 100,
    losePct: (losses / done) * 100,
    trials: done,
    opponents,
  }
}

/** Quick draw / nut potential hints from hole+board. */
export function analyzeDraws(hole: Card[], board: Card[]): string[] {
  if (board.length < 3) return []
  const hints: string[] = []
  const all = [...hole, ...board]
  const bySuit = new Map<string, number>()
  for (const c of all) bySuit.set(c.suit, (bySuit.get(c.suit) ?? 0) + 1)
  for (const [suit, n] of bySuit) {
    if (n === 4) hints.push(`플러시 드로우(${suit})`)
    if (n >= 5) hints.push('플러시 완성')
  }

  const ranks = [...new Set(all.map((c) => c.rank))].sort((a, b) => a - b)
  // open-ended / gutshot rough check on unique ranks
  const set = new Set<number>(ranks)
  if (set.has(14)) set.add(1)
  let oe = false
  let gut = false
  for (let hi = 14; hi >= 5; hi -= 1) {
    const seq = [hi, hi - 1, hi - 2, hi - 3, hi - 4]
    const hit = seq.filter((r) => set.has(r)).length
    if (hit === 4) {
      // if missing end card -> OE-ish; missing middle -> gutshot
      const missingIdx = seq.findIndex((r) => !set.has(r))
      if (missingIdx === 0 || missingIdx === 4) oe = true
      else gut = true
    }
  }
  if (oe) hints.push('오픈엔드 스트레이트 드로우')
  else if (gut) hints.push('거트샷 스트레이트 드로우')

  return hints
}
