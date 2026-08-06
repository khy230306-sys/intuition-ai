import type { Card, Hand, Rank, RoundOutcome, Side, Suit } from './types'

const SUITS: Suit[] = ['S', 'H', 'D', 'C']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function rankValue(rank: Rank): number {
  if (rank === 'A') return 1
  if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return 0
  return Number(rank)
}

export function handTotal(cards: Card[]): number {
  const sum = cards.reduce((acc, card) => acc + rankValue(card.rank), 0)
  return sum % 10
}

export function createShoe(deckCount = 6): Card[] {
  const shoe: Card[] = []
  let serial = 0
  for (let d = 0; d < deckCount; d += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ suit, rank, id: `${d}-${suit}-${rank}-${serial}` })
        serial += 1
      }
    }
  }
  return shuffle(shoe)
}

export function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const rand = cryptoRandomInt(i + 1)
    const tmp = next[i]!
    next[i] = next[rand]!
    next[rand] = tmp
  }
  return next
}

function cryptoRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0]! % maxExclusive
  }
  return Math.floor(Math.random() * maxExclusive)
}

function draw(shoe: Card[]): Card {
  const card = shoe.pop()
  if (!card) {
    throw new Error('ORBIS shoe exhausted')
  }
  return card
}

function makeHand(cards: Card[]): Hand {
  return { cards, total: handTotal(cards) }
}

/**
 * Standard baccarat drawing rules (simplified presentation, full third-card logic).
 */
export function dealBaccaratRound(shoe: Card[]): RoundOutcome {
  if (shoe.length < 6) {
    shoe.push(...createShoe(6))
    const reshuffled = shuffle(shoe)
    shoe.length = 0
    shoe.push(...reshuffled)
  }

  const playerCards: Card[] = [draw(shoe), draw(shoe)]
  const bankerCards: Card[] = [draw(shoe), draw(shoe)]

  let playerTotal = handTotal(playerCards)
  let bankerTotal = handTotal(bankerCards)

  const natural = playerTotal >= 8 || bankerTotal >= 8

  if (!natural) {
    let playerThird: Card | null = null

    if (playerTotal <= 5) {
      playerThird = draw(shoe)
      playerCards.push(playerThird)
      playerTotal = handTotal(playerCards)
    }

    const bankerDrawsThird = shouldBankerDraw(bankerTotal, playerThird)
    if (bankerDrawsThird) {
      bankerCards.push(draw(shoe))
      bankerTotal = handTotal(bankerCards)
    }
  }

  const player = makeHand(playerCards)
  const banker = makeHand(bankerCards)
  const winner = resolveWinner(player.total, banker.total)

  return { player, banker, winner }
}

export function shouldBankerDraw(bankerTotal: number, playerThird: Card | null): boolean {
  if (playerThird === null) {
    return bankerTotal <= 5
  }

  const third = rankValue(playerThird.rank)

  if (bankerTotal <= 2) return true
  if (bankerTotal === 3) return third !== 8
  if (bankerTotal === 4) return third >= 2 && third <= 7
  if (bankerTotal === 5) return third >= 4 && third <= 7
  if (bankerTotal === 6) return third === 6 || third === 7
  return false
}

export function resolveWinner(playerTotal: number, bankerTotal: number): Side {
  if (playerTotal > bankerTotal) return 'player'
  if (bankerTotal > playerTotal) return 'banker'
  return 'tie'
}

export function settlePayout(side: Side, amount: number, winner: Side): number {
  if (amount <= 0) return 0
  if (winner === 'tie') {
    if (side === 'tie') return amount * 8
    return amount // stake returned on non-tie bets when result is tie
  }
  if (side !== winner) return 0
  if (side === 'player') return amount * 2
  if (side === 'banker') return Math.floor(amount * 1.95) // 5% commission demo
  return 0
}
