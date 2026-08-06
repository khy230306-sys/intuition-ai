export type OrbColor = 'blue' | 'gold' | 'violet'

/** What the player can stake on */
export type BetSide = OrbColor | 'void'

export type RoundPattern = 'majority' | 'trinity' | 'void'

export type RoundOutcome = {
  draws: [OrbColor, OrbColor, OrbColor]
  pattern: RoundPattern
  /** Winning side for settlement (void or majority/trinity color) */
  winner: BetSide
  majorityColor: OrbColor | null
}

export type RoadBead = {
  id: string
  winner: BetSide
  pattern: RoundPattern
}

export type TablePhase = 'betting' | 'drawing' | 'result'
