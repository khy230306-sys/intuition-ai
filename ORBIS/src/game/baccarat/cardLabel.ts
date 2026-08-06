import type { Card, Suit } from './types'

const suitSymbol: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
}

export function formatCard(card: Card): { rank: string; suit: string; red: boolean } {
  return {
    rank: card.rank,
    suit: suitSymbol[card.suit],
    red: card.suit === 'H' || card.suit === 'D',
  }
}
