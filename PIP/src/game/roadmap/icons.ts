import type { CardDuelResult, TotalBand } from '../types'
import type { MainRoadOutcome } from './types'

export function duelIcon(outcome: CardDuelResult): string {
  if (outcome === 'UP') return '↑'
  if (outcome === 'DOWN') return '↓'
  return '●'
}

export function totalIcon(outcome: TotalBand): string {
  if (outcome === 'HIGH') return '↑'
  if (outcome === 'LOW') return '↓'
  return '●'
}

export function duelLabel(outcome: CardDuelResult): string {
  if (outcome === 'UP') return '상'
  if (outcome === 'DOWN') return '하'
  return '무'
}

export function totalLabel(outcome: TotalBand): string {
  if (outcome === 'HIGH') return '높음'
  if (outcome === 'LOW') return '낮음'
  return '중앙'
}

export function outcomeIcon(outcome: MainRoadOutcome): string {
  if (outcome === 'UP' || outcome === 'DOWN' || outcome === 'SAME') return duelIcon(outcome)
  return totalIcon(outcome)
}

export function outcomeLabel(outcome: MainRoadOutcome): string {
  if (outcome === 'UP' || outcome === 'DOWN' || outcome === 'SAME') return duelLabel(outcome)
  return totalLabel(outcome)
}
