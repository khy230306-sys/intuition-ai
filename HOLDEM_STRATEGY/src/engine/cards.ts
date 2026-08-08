export type Suit = 's' | 'h' | 'd' | 'c'
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  rank: Rank
  suit: Suit
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river'

export const SUITS: Suit[] = ['s', 'h', 'd', 'c']
export const RANKS: Rank[] = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]

export const SUIT_LABEL: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
}

export const SUIT_NAME: Record<Suit, string> = {
  s: '스페이드',
  h: '하트',
  d: '다이아',
  c: '클로버',
}

export const RANK_LABEL: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

export function cardKey(card: Card): string {
  return `${RANK_LABEL[card.rank]}${card.suit}`
}

export function cardEquals(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit
}

export function formatCard(card: Card): string {
  return `${RANK_LABEL[card.rank]}${SUIT_LABEL[card.suit]}`
}

export function fullDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

export function remainingDeck(used: Card[]): Card[] {
  return fullDeck().filter((c) => !used.some((u) => cardEquals(u, c)))
}

export function streetFromBoard(board: Card[]): Street {
  if (board.length >= 5) return 'river'
  if (board.length === 4) return 'turn'
  if (board.length >= 3) return 'flop'
  return 'preflop'
}

export function nextBoardNeed(boardLen: number): number {
  if (boardLen < 3) return 3 - boardLen
  if (boardLen < 5) return 1
  return 0
}
