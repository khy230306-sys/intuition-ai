export type PipValue = 1 | 2 | 3 | 4 | 5

export type Card = {
  id: string
  value: PipValue
}

export type CardDuelResult = 'UP' | 'DOWN' | 'SAME'
export type TotalBand = 'LOW' | 'CENTER' | 'HIGH'
export type OddEven = 'ODD' | 'EVEN'

export type PrimaryMode = 'CARD_DUEL' | 'TOTAL'
export type ExtraMode = 'ODD_EVEN' | 'PAIR' | 'EXACT_TOTAL'

export type GamePhase =
  | 'SHOE_INIT'
  | 'BETTING_OPEN'
  | 'BETTING_LOCK'
  | 'CARD_A_REVEAL'
  | 'CARD_B_REVEAL'
  | 'RESULT'
  | 'SETTLEMENT'
  | 'NEXT_ROUND'
  | 'SHOE_COMPLETE'
  | 'HIDDEN_REVEAL'
  | 'NEW_SHOE'

export type RoundResult = {
  round: number
  cardA: PipValue
  cardB: PipValue
  total: number
  cardDuel: CardDuelResult
  totalBand: TotalBand
  oddEven: OddEven
  isPair: boolean
}

export type BetSelection = {
  mode: PrimaryMode | ExtraMode
  choice: string
  stake: number
}

export type Settlement = {
  selection: BetSelection
  won: boolean
  payout: number
  net: number
}

export type Shoe = {
  shoeNumber: number
  fullOrder: Card[]
  hidden: Card[]
  playing: Card[]
  cursor: number
  history: RoundResult[]
}

export const DECK_SIZE = 50
export const HIDDEN_COUNT = 6
export const PLAYING_COUNT = 44
export const ROUNDS_PER_SHOE = 22
export const BETTING_SECONDS = 10
export const INITIAL_DEMO_POINTS = 10_000
export const STAKE_PRESETS = [10, 50, 100, 500] as const
