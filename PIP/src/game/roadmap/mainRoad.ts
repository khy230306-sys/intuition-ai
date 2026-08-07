import type { CardDuelResult, RoundResult } from '../types'
import { outcomeIcon, outcomeLabel } from './icons'
import {
  MAIN_ROAD_MAX_ROWS,
  type MainRoadCell,
  type MainRoadColumn,
  type MainRoadModel,
  type MainRoadOutcome,
  type SameDisplayMode,
} from './types'

type SequenceEntry = {
  outcome: MainRoadOutcome
  rounds: number[]
  sameCount: number
}

function isSameOutcome(outcome: MainRoadOutcome, kind: 'duel' | 'total'): boolean {
  return kind === 'duel' && outcome === 'SAME'
}

/**
 * Build chronological main-road entries.
 * When sameIndependent is false, SAME does not open a new column; it attaches
 * a counter to the previous non-SAME cell (or buffers until the first one).
 */
export function buildSequence(
  outcomes: Array<{ outcome: MainRoadOutcome; round: number }>,
  kind: 'duel' | 'total',
  options: SameDisplayMode,
): SequenceEntry[] {
  const entries: SequenceEntry[] = []
  let pendingSameRounds: number[] = []

  for (const item of outcomes) {
    if (!options.sameIndependent && isSameOutcome(item.outcome, kind)) {
      if (entries.length === 0) {
        pendingSameRounds.push(item.round)
      } else {
        const last = entries[entries.length - 1]
        last.sameCount += 1
        last.rounds.push(item.round)
      }
      continue
    }

    entries.push({
      outcome: item.outcome,
      rounds: [...pendingSameRounds, item.round],
      sameCount: pendingSameRounds.length,
    })
    pendingSameRounds = []
  }

  // Leading-only SAME shoe: surface as SAME cells when nothing else exists.
  if (entries.length === 0 && pendingSameRounds.length > 0) {
    for (const round of pendingSameRounds) {
      entries.push({ outcome: 'SAME', rounds: [round], sameCount: 0 })
    }
  }

  return entries
}

/**
 * Place sequence into Big-Road style columns with max 6 rows and dragon tails.
 * Pure visualization — does not alter game outcomes.
 */
export function placeMainRoad(entries: SequenceEntry[]): MainRoadModel {
  const columns: MainRoadColumn[] = []

  for (const entry of entries) {
    const last = columns[columns.length - 1]
    const continues = last != null && last.outcome === entry.outcome

    if (!continues) {
      columns.push({
        outcome: entry.outcome,
        cells: [toCell(entry, 1, false)],
      })
      continue
    }

    const streakIndex = last.cells.length + 1
    const verticalCount = last.cells.filter((cell) => !cell.isDragonTail).length
    if (verticalCount < MAIN_ROAD_MAX_ROWS) {
      last.cells.push(toCell(entry, streakIndex, false))
    } else {
      // Dragon tail: extend to the right after 6 vertical cells.
      last.cells.push(toCell(entry, streakIndex, true))
    }
  }

  // Normalize: split dragon tails into visual sibling columns for grid render.
  return {
    columns: expandDragonColumns(columns),
    sequence: entries.map((entry) => entry.outcome),
  }
}

function toCell(entry: SequenceEntry, streakIndex: number, isDragonTail: boolean): MainRoadCell {
  return {
    outcome: entry.outcome,
    icon: outcomeIcon(entry.outcome),
    label: outcomeLabel(entry.outcome),
    sameCount: entry.sameCount,
    rounds: entry.rounds,
    isDragonTail,
    streakIndex,
  }
}

/**
 * Convert packed columns (vertical + trailing dragon cells) into render columns
 * where dragon tails occupy subsequent columns at the bottom row.
 */
export function expandDragonColumns(columns: MainRoadColumn[]): MainRoadColumn[] {
  const expanded: MainRoadColumn[] = []

  for (const column of columns) {
    const vertical = column.cells.filter((cell) => !cell.isDragonTail)
    const tails = column.cells.filter((cell) => cell.isDragonTail)
    expanded.push({ outcome: column.outcome, cells: vertical })
    for (const tail of tails) {
      expanded.push({ outcome: column.outcome, cells: [tail] })
    }
  }

  return expanded
}

export function buildDuelMainRoad(
  history: RoundResult[],
  options: SameDisplayMode = { sameIndependent: false },
): MainRoadModel {
  const outcomes = history.map((round) => ({
    outcome: round.cardDuel as MainRoadOutcome,
    round: round.round,
  }))
  return placeMainRoad(buildSequence(outcomes, 'duel', options))
}

export function buildTotalMainRoad(
  history: RoundResult[],
  _options: SameDisplayMode = { sameIndependent: false },
): MainRoadModel {
  // TOTAL road treats LOW/CENTER/HIGH as full outcomes (no SAME-style attach).
  const outcomes = history.map((round) => ({
    outcome: round.totalBand as MainRoadOutcome,
    round: round.round,
  }))
  return placeMainRoad(buildSequence(outcomes, 'total', { sameIndependent: true }))
}

export function extractDuelOutcomes(history: RoundResult[]): CardDuelResult[] {
  return history.map((round) => round.cardDuel)
}
