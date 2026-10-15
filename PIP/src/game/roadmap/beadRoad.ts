import type { RoundResult } from '../types'
import { duelIcon, totalIcon } from './icons'
import { MAIN_ROAD_MAX_ROWS, type BeadCell, type BeadRoadModel } from './types'

/** Chronological bead plate: fill top-to-bottom, then next column. Order never changes. */
export function buildBeadRoad(history: RoundResult[]): BeadRoadModel {
  const beads: BeadCell[] = history.map((round) => ({
    round: round.round,
    cardDuel: round.cardDuel,
    totalBand: round.totalBand,
    total: round.total,
    oddEven: round.oddEven,
    isPair: round.isPair,
    cardA: round.cardA,
    cardB: round.cardB,
    duelIcon: duelIcon(round.cardDuel),
    totalIcon: totalIcon(round.totalBand),
  }))

  const columns: BeadCell[][] = []
  for (let index = 0; index < beads.length; index += 1) {
    const col = Math.floor(index / MAIN_ROAD_MAX_ROWS)
    if (!columns[col]) columns[col] = []
    columns[col].push(beads[index])
  }

  return { columns, beads }
}

export function getBeadByRound(model: BeadRoadModel, round: number): BeadCell | undefined {
  return model.beads.find((bead) => bead.round === round)
}
