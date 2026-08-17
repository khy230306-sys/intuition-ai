import type { LottoDraw, UserTicket } from '../domain/types'
import { MAX_N, PICK } from '../domain/types'
import { endingDigits, oddCount, sectionCounts } from '../math/stats'

export interface BiasFinding {
  id: string
  label: string
  userRate: number
  populationRate: number
  delta: number
  detail: string
}

export interface UserBiasReport {
  sampleGames: number
  findings: BiasFinding[]
  insufficient: boolean
  message: string
}

const MIN_GAMES = 8

function flattenGames(tickets: UserTicket[]): number[][] {
  return tickets.flatMap((t) => t.games.map((g) => g.numbers))
}

function rate(count: number, total: number): number {
  return total ? count / total : 0
}

export function analyzeUserBias(
  tickets: UserTicket[],
  draws: LottoDraw[],
): UserBiasReport {
  const games = flattenGames(tickets)
  if (games.length < MIN_GAMES) {
    return {
      sampleGames: games.length,
      findings: [],
      insufficient: true,
      message: '분석하기에 구매 기록이 부족합니다.',
    }
  }

  const popGames = draws.map((d) => d.numbers)
  const findings: BiasFinding[] = []

  const userNums = games.flat()
  const popNums = popGames.flat()
  const userTotal = userNums.length
  const popTotal = popNums.length

  // Low numbers 1–22
  const userLow = userNums.filter((n) => n <= 22).length
  const popLow = popNums.filter((n) => n <= 22).length
  findings.push({
    id: 'low',
    label: '저번호(1–22) 편중',
    userRate: rate(userLow, userTotal),
    populationRate: rate(popLow, popTotal),
    delta: rate(userLow, userTotal) - rate(popLow, popTotal),
    detail: `사용자 ${(rate(userLow, userTotal) * 100).toFixed(1)}% vs 전체 ${(rate(popLow, popTotal) * 100).toFixed(1)}%`,
  })

  // Calendar bias 1–31
  const userCal = userNums.filter((n) => n <= 31).length
  const popCal = popNums.filter((n) => n <= 31).length
  findings.push({
    id: 'calendar',
    label: '1–31 편중',
    userRate: rate(userCal, userTotal),
    populationRate: rate(popCal, popTotal),
    delta: rate(userCal, userTotal) - rate(popCal, popTotal),
    detail: `사용자 ${(rate(userCal, userTotal) * 100).toFixed(1)}% vs 전체 ${(rate(popCal, popTotal) * 100).toFixed(1)}%`,
  })

  // Odd bias
  let userOdd = 0
  let popOdd = 0
  for (const g of games) userOdd += oddCount(g)
  for (const g of popGames) popOdd += oddCount(g)
  findings.push({
    id: 'odd',
    label: '홀수 편중',
    userRate: rate(userOdd, games.length * PICK),
    populationRate: rate(popOdd, popGames.length * PICK),
    delta:
      rate(userOdd, games.length * PICK) - rate(popOdd, popGames.length * PICK),
    detail: `홀수 비율 사용자 ${(rate(userOdd, games.length * PICK) * 100).toFixed(1)}%`,
  })

  // 40s avoidance
  const user40 = userNums.filter((n) => n >= 40).length
  const pop40 = popNums.filter((n) => n >= 40).length
  findings.push({
    id: 'high40',
    label: '40번대 사용',
    userRate: rate(user40, userTotal),
    populationRate: rate(pop40, popTotal),
    delta: rate(user40, userTotal) - rate(pop40, popTotal),
    detail: `사용자 ${(rate(user40, userTotal) * 100).toFixed(1)}% vs 전체 ${(rate(pop40, popTotal) * 100).toFixed(1)}%`,
  })

  // Ending digit concentration (entropy proxy: top ending share)
  const userEnd = new Array(10).fill(0) as number[]
  const popEnd = new Array(10).fill(0) as number[]
  for (const n of userNums) userEnd[n % 10]++
  for (const n of popNums) popEnd[n % 10]++
  const userTopEnd = Math.max(...userEnd) / userTotal
  const popTopEnd = Math.max(...popEnd) / popTotal
  findings.push({
    id: 'ending',
    label: '특정 끝수 편중',
    userRate: userTopEnd,
    populationRate: popTopEnd,
    delta: userTopEnd - popTopEnd,
    detail: `최다 끝수 비중 사용자 ${(userTopEnd * 100).toFixed(1)}%`,
  })

  // Repeated favorite numbers
  const freq = new Array(MAX_N + 1).fill(0) as number[]
  for (const n of userNums) freq[n]++
  const top = [...freq.entries()]
    .slice(1)
    .sort((a, b) => b[1]! - a[1]!)
    .slice(0, 3)
  findings.push({
    id: 'repeat',
    label: '특정 번호 반복',
    userRate: top[0]![1]! / games.length,
    populationRate: 6 / MAX_N,
    delta: top[0]![1]! / games.length - 6 / MAX_N,
    detail: `자주 사용: ${top.map(([n, c]) => `${n}(${c})`).join(', ')}`,
  })

  // Section skew
  const userSec = [0, 0, 0, 0, 0]
  for (const g of games) {
    const s = sectionCounts(g)
    for (let i = 0; i < 5; i++) userSec[i]! += s[i]!
  }
  const maxSec = Math.max(...userSec) / userTotal
  findings.push({
    id: 'section',
    label: '구간 편중',
    userRate: maxSec,
    populationRate: 0.22,
    delta: maxSec - 0.22,
    detail: `구간 분포 ${userSec.map((c) => ((c / userTotal) * 100).toFixed(0)).join('/')}%`,
  })

  void endingDigits

  return {
    sampleGames: games.length,
    findings: findings.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    insufficient: false,
    message: `${games.length}게임 기준 선택 습관 비교`,
  }
}
