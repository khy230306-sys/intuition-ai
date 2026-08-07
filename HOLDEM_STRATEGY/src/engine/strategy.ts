import type { Card, Street } from '@/engine/cards'
import { streetFromBoard } from '@/engine/cards'
import { madeHandLabel, preflopLabel, evaluateBest, categoryOf, CATEGORY } from '@/engine/evaluate'
import type { EquityResult } from '@/engine/equity'
import { analyzeDraws } from '@/engine/equity'

export type Action = 'fold' | 'check_call' | 'raise' | 'all_in'

export interface StrategyAdvice {
  street: Street
  action: Action
  actionLabel: string
  confidence: 'high' | 'medium' | 'low'
  title: string
  reasons: string[]
  handLabel: string
  draws: string[]
  equity: EquityResult
}

export type Position = 'early' | 'middle' | 'late' | 'blinds'

const ACTION_KO: Record<Action, string> = {
  fold: '폴드',
  check_call: '체크 / 콜',
  raise: '레이즈',
  all_in: '올인 고려',
}

function preflopAction(hole: Card[], equity: EquityResult, position: Position): {
  action: Action
  title: string
  reasons: string[]
  confidence: StrategyAdvice['confidence']
} {
  const label = preflopLabel(hole)
  const win = equity.winPct
  const tight = position === 'early'
  const loose = position === 'late' || position === 'blinds'

  if (win >= 55 || label.startsWith('프리미엄')) {
    return {
      action: 'raise',
      title: '강한 프리플랍 — 밸류 레이즈',
      confidence: 'high',
      reasons: [
        `${label}. 승률 약 ${win.toFixed(1)}%`,
        tight ? '앞자리여도 충분히 오픈·3벳 가능' : '포지션을 활용해 사이즈를 키워보세요',
        '상대가 콜하면 셋/탑페어 이상의 보드를 노립니다',
      ],
    }
  }
  if (win >= 42 || label.includes('미드') || label.includes('브로드웨이') || label.includes('강한')) {
    return {
      action: tight ? 'check_call' : 'raise',
      title: tight ? '플레이 가능 — 신중히 참여' : '오픈·콜 가능 구간',
      confidence: 'medium',
      reasons: [
        `${label}. 승률 약 ${win.toFixed(1)}%`,
        tight ? '앞자리에서는 콜·폴드 경계 — 상대 성향 확인' : '뒷자리에서 오픈 레이즈 추천',
        '수티드/커넥터면 셋·스트레이트·플러시 가능성을 염두',
      ],
    }
  }
  if (win >= 32 && loose) {
    return {
      action: 'check_call',
      title: '스펙ulative — 싼 가격에만',
      confidence: 'low',
      reasons: [
        `${label}. 승률 약 ${win.toFixed(1)}%`,
        '뒷자리·블라인드에서 저렴할 때만 참여',
        '레이즈가 크면 폴드가 정석',
      ],
    }
  }
  return {
    action: 'fold',
    title: '약한 핸드 — 폴드 추천',
    confidence: 'high',
    reasons: [
      `${label}. 승률 약 ${win.toFixed(1)}%`,
      '멀티웨이·앞자리에서는 기대값이 낮습니다',
      '다음 핸드를 기다리는 편이 낫습니다',
    ],
  }
}

function postflopAction(
  hole: Card[],
  board: Card[],
  equity: EquityResult,
  draws: string[],
): {
  action: Action
  title: string
  reasons: string[]
  confidence: StrategyAdvice['confidence']
} {
  const score = evaluateBest([...hole, ...board])
  const cat = categoryOf(score)
  const win = equity.winPct
  const street = streetFromBoard(board)
  const hasStrongDraw = draws.some((d) => d.includes('플러시 드로우') || d.includes('오픈엔드'))

  if (cat >= CATEGORY.fullHouse || win >= 85) {
    return {
      action: street === 'river' ? 'all_in' : 'raise',
      title: '매우 강한 핸드 — 밸류 추출',
      confidence: 'high',
      reasons: [
        `현재 ${madeHandLabel(hole, board)}, 승률 약 ${win.toFixed(1)}%`,
        '얇은 벨류벳보다 확실한 사이즈로 상대 콜을 유도',
        street === 'river' ? '강하면 올인·빅벳으로 마무리' : '턴/리버까지 벨류를 이어가세요',
      ],
    }
  }
  if (cat >= CATEGORY.trips || win >= 65) {
    return {
      action: 'raise',
      title: '강한 메이드 — 레이즈/벳',
      confidence: 'high',
      reasons: [
        `현재 ${madeHandLabel(hole, board)}, 승률 약 ${win.toFixed(1)}%`,
        '프로텍션과 밸류를 위해 벳·레이즈',
        '위험한 보드(플러시·스트레이트 가능)면 사이즈를 키우세요',
      ],
    }
  }
  if (cat >= CATEGORY.pair || win >= 48 || (hasStrongDraw && win >= 35)) {
    return {
      action: 'check_call',
      title: hasStrongDraw ? '드로우/중간 강도 — 가격 보고 콜' : '중간 강도 — 팟 컨트롤',
      confidence: 'medium',
      reasons: [
        `현재 ${madeHandLabel(hole, board)}, 승률 약 ${win.toFixed(1)}%`,
        hasStrongDraw ? `드로우: ${draws.join(', ')}` : '오버벳·올인에는 신중히 폴드도 고려',
        street === 'flop' ? '턴 카드를 보고 강도를 재평가하세요' : '리버에서는 블러프 캐치 구간을 좁히세요',
      ],
    }
  }
  if (hasStrongDraw && street !== 'river') {
    return {
      action: 'check_call',
      title: '드로우 — 올바른 가격이면 진행',
      confidence: 'medium',
      reasons: [
        `승률 약 ${win.toFixed(1)}% · ${draws.join(', ')}`,
        '팟 대비 콜 비용이 작을 때 진행',
        '완성되면 밸류, 미완성이면 포기',
      ],
    }
  }
  return {
    action: 'fold',
    title: '약한 쇼다운 가치 — 폴드/포기',
    confidence: win < 20 ? 'high' : 'medium',
    reasons: [
      `현재 ${madeHandLabel(hole, board)}, 승률 약 ${win.toFixed(1)}%`,
      '상대 벳에 콜할 근거가 부족합니다',
      draws.length ? `드로우(${draws.join(', ')})가 있어도 가격이 비싸면 포기` : '다음 스트리트 개선 가능성이 낮습니다',
    ],
  }
}

export function buildAdvice(
  hole: Card[],
  board: Card[],
  equity: EquityResult,
  position: Position = 'middle',
): StrategyAdvice {
  const street = streetFromBoard(board)
  const draws = analyzeDraws(hole, board)
  const handLabel = board.length >= 3 ? madeHandLabel(hole, board) : preflopLabel(hole)
  const core =
    street === 'preflop'
      ? preflopAction(hole, equity, position)
      : postflopAction(hole, board, equity, draws)

  return {
    street,
    action: core.action,
    actionLabel: ACTION_KO[core.action],
    confidence: core.confidence,
    title: core.title,
    reasons: core.reasons,
    handLabel,
    draws,
    equity,
  }
}
