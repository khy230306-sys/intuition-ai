import type {
  CardDuelResult,
  OddEven,
  PipValue,
  RoundResult,
  TotalBand,
} from './types'

export function judgeCardDuel(cardA: PipValue, cardB: PipValue): CardDuelResult {
  if (cardB < cardA) return 'DOWN'
  if (cardB > cardA) return 'UP'
  return 'SAME'
}

export function sumPips(cardA: PipValue, cardB: PipValue): number {
  return cardA + cardB
}

export function judgeTotalBand(total: number): TotalBand {
  if (total < 2 || total > 10) {
    throw new Error(`Invalid total ${total}`)
  }
  if (total <= 5) return 'LOW'
  if (total === 6) return 'CENTER'
  return 'HIGH'
}

export function judgeOddEven(total: number): OddEven {
  return total % 2 === 0 ? 'EVEN' : 'ODD'
}

export function judgePair(cardA: PipValue, cardB: PipValue): boolean {
  return cardA === cardB
}

export function buildRoundResult(
  round: number,
  cardA: PipValue,
  cardB: PipValue,
): RoundResult {
  const total = sumPips(cardA, cardB)
  return {
    round,
    cardA,
    cardB,
    total,
    cardDuel: judgeCardDuel(cardA, cardB),
    totalBand: judgeTotalBand(total),
    oddEven: judgeOddEven(total),
    isPair: judgePair(cardA, cardB),
  }
}

export function isWinningChoice(
  result: RoundResult,
  mode: string,
  choice: string,
): boolean {
  switch (mode) {
    case 'CARD_DUEL':
      return result.cardDuel === choice
    case 'TOTAL':
      return result.totalBand === choice
    case 'ODD_EVEN':
      return result.oddEven === choice
    case 'PAIR':
      return choice === 'PAIR' ? result.isPair : choice === 'NO_PAIR' ? !result.isPair : false
    case 'EXACT_TOTAL':
      return String(result.total) === choice
    default:
      return false
  }
}
