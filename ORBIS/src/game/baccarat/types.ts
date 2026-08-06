export type Suit = 'S' | 'H' | 'D' | 'C'
export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'

export type Card = {
  suit: Suit
  rank: Rank
  id: string
}

export type Side = 'player' | 'banker' | 'tie'

export type Hand = {
  cards: Card[]
  total: number
}

export type RoundOutcome = {
  player: Hand
  banker: Hand
  winner: Side
}

export type BetSelection = {
  side: Side
  amount: number
}

export type SettledRound = RoundOutcome & {
  bet: BetSelection
  payout: number
  balanceAfter: number
}

export type RoadBead = {
  winner: Side
  id: string
}

export type TablePhase = 'betting' | 'dealing' | 'result'
