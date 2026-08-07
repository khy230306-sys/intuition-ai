import type { Card, Rank } from '@/engine/cards'

/** Higher score = stronger hand. Category in high bits, kickers packed below. */
export type HandScore = number

export const CATEGORY = {
  highCard: 1,
  pair: 2,
  twoPair: 3,
  trips: 4,
  straight: 5,
  flush: 6,
  fullHouse: 7,
  quads: 8,
  straightFlush: 9,
} as const

export const CATEGORY_KO: Record<number, string> = {
  1: '하이카드',
  2: '원페어',
  3: '투페어',
  4: '트리플',
  5: '스트레이트',
  6: '플러시',
  7: '풀하우스',
  8: '포카드',
  9: '스트레이트 플러시',
}

function pack(category: number, a = 0, b = 0, c = 0, d = 0, e = 0): HandScore {
  return (
    (category << 20) |
    (a << 16) |
    (b << 12) |
    (c << 8) |
    (d << 4) |
    e
  )
}

function uniqueRanksDesc(cards: Card[]): Rank[] {
  const seen = new Set<number>()
  const out: Rank[] = []
  for (const c of [...cards].sort((x, y) => y.rank - x.rank)) {
    if (!seen.has(c.rank)) {
      seen.add(c.rank)
      out.push(c.rank)
    }
  }
  return out
}

function straightHigh(ranks: Rank[]): Rank | 0 {
  const set = new Set<number>(ranks)
  if (set.has(14)) set.add(1) // wheel A-5
  for (let hi = 14; hi >= 5; hi -= 1) {
    if ([hi, hi - 1, hi - 2, hi - 3, hi - 4].every((r) => set.has(r))) {
      return hi as Rank
    }
  }
  return 0
}

/** Evaluate exactly 5 cards. */
export function evaluate5(cards: Card[]): HandScore {
  if (cards.length !== 5) throw new Error('evaluate5 needs 5 cards')
  const ranks = [...cards].map((c) => c.rank).sort((a, b) => b - a)
  const flush = cards.every((c) => c.suit === cards[0].suit)
  const counts = new Map<Rank, number>()
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1)
  const byCount = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return b[0] - a[0]
  })
  const sHigh = straightHigh(ranks as Rank[])

  if (flush && sHigh) return pack(CATEGORY.straightFlush, sHigh)
  if (byCount[0][1] === 4) {
    return pack(CATEGORY.quads, byCount[0][0], byCount[1][0])
  }
  if (byCount[0][1] === 3 && byCount[1][1] === 2) {
    return pack(CATEGORY.fullHouse, byCount[0][0], byCount[1][0])
  }
  if (flush) {
    return pack(CATEGORY.flush, ranks[0], ranks[1], ranks[2], ranks[3], ranks[4])
  }
  if (sHigh) return pack(CATEGORY.straight, sHigh)
  if (byCount[0][1] === 3) {
    const kickers = byCount.slice(1).map((x) => x[0])
    return pack(CATEGORY.trips, byCount[0][0], kickers[0], kickers[1])
  }
  if (byCount[0][1] === 2 && byCount[1][1] === 2) {
    const highPair = Math.max(byCount[0][0], byCount[1][0])
    const lowPair = Math.min(byCount[0][0], byCount[1][0])
    return pack(CATEGORY.twoPair, highPair, lowPair, byCount[2][0])
  }
  if (byCount[0][1] === 2) {
    const kickers = byCount.slice(1).map((x) => x[0])
    return pack(CATEGORY.pair, byCount[0][0], kickers[0], kickers[1], kickers[2])
  }
  return pack(CATEGORY.highCard, ranks[0], ranks[1], ranks[2], ranks[3], ranks[4])
}

/** Best 5-card hand from 5–7 cards. */
export function evaluateBest(cards: Card[]): HandScore {
  if (cards.length < 5) throw new Error('need at least 5 cards')
  if (cards.length === 5) return evaluate5(cards)
  let best = 0
  const n = cards.length
  const idx = Array.from({ length: n }, (_, i) => i)
  // choose 5
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const hand = [cards[idx[a]], cards[idx[b]], cards[idx[c]], cards[idx[d]], cards[idx[e]]]
            const score = evaluate5(hand)
            if (score > best) best = score
          }
        }
      }
    }
  }
  return best
}

export function categoryOf(score: HandScore): number {
  return score >> 20
}

export function describeScore(score: HandScore): string {
  return CATEGORY_KO[categoryOf(score)] ?? '알 수 없음'
}

/** Rough made-hand strength label using hole+board when board >= 3. */
export function madeHandLabel(hole: Card[], board: Card[]): string {
  if (board.length < 3) {
    return preflopLabel(hole)
  }
  const score = evaluateBest([...hole, ...board])
  return describeScore(score)
}

export function preflopLabel(hole: Card[]): string {
  if (hole.length !== 2) return '미완성'
  const [a, b] = [...hole].sort((x, y) => y.rank - x.rank)
  const suited = a.suit === b.suit
  if (a.rank === b.rank) {
    if (a.rank >= 12) return '프리미엄 페어'
    if (a.rank >= 9) return '미드 페어'
    return '로우 페어'
  }
  if (a.rank === 14 && b.rank >= 12) return suited ? '프리미엄 수티드' : '프리미엄 오프'
  if (a.rank === 14 && b.rank >= 10) return suited ? '강한 에이스' : '에이스 오프'
  if (a.rank >= 12 && b.rank >= 10) return suited ? '브로드웨이 수티드' : '브로드웨이'
  if (suited && a.rank - b.rank <= 2) return '수티드 커넥터'
  if (suited) return '수티드'
  return '약한 핸드'
}

export function uniqueRanks(cards: Card[]): Rank[] {
  return uniqueRanksDesc(cards)
}
