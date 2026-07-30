export type Screen =
  | 'landing'
  | 'setup'
  | 'hub'
  | 'chaos'
  | 'roulette'
  | 'balance'
  | 'bomb'
  | 'mission'
  | 'chosung'
  | 'nunchi'
  | 'truth'
  | 'rps'
  | 'forbidden'
  | 'result'

export type Player = {
  id: string
  name: string
  drinks: number
  forbidden?: string
}

export type GameId =
  | 'roulette'
  | 'balance'
  | 'bomb'
  | 'mission'
  | 'chosung'
  | 'nunchi'
  | 'truth'
  | 'rps'
  | 'forbidden'

export const GAME_META: Record<
  GameId,
  { title: string; blurb: string; tag: string }
> = {
  roulette: {
    title: '벌칙 룰렛',
    blurb: '행운의 바퀴가 돌면 벌칙이 정해진다',
    tag: '클래식',
  },
  balance: {
    title: '밸런스 전쟁',
    blurb: '소수파가 마신다. 선택은 신중하게',
    tag: '투표',
  },
  bomb: {
    title: '폭탄 돌리기',
    blurb: '타이머가 울릴 때 들고 있는 사람이 마신다',
    tag: '긴장',
  },
  mission: {
    title: '미션 카드',
    blurb: '랜덤 미션 수행. 실패하면 벌칙',
    tag: '챌린지',
  },
  chosung: {
    title: '초성 퀴즈',
    blurb: '초성을 보고 맞혀라. 틀리면 원샷 코스',
    tag: '두뇌',
  },
  nunchi: {
    title: '눈치 게임',
    blurb: '숫자를 외쳐라. 겹치면 둘 다 마신다',
    tag: '순발력',
  },
  truth: {
    title: '취중진담',
    blurb: '솔직하게 답하거나, 대신 마신다',
    tag: '토크',
  },
  rps: {
    title: '가위바위보',
    blurb: '두 명의 운명. 패자가 마신다',
    tag: '대결',
  },
  forbidden: {
    title: '금지어',
    blurb: '배정된 단어를 말하면 즉시 마신다',
    tag: '함정',
  },
}

export type AppState = {
  screen: Screen
  players: Player[]
  lastResult: string | null
  chaosQueue: GameId[]
  round: number
}

const KEY = 'jjan-party-v1'

export function createInitialState(): AppState {
  const saved = loadPlayers()
  return {
    screen: 'landing',
    players: saved,
    lastResult: null,
    chaosQueue: [],
    round: 0,
  }
}

export function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Player[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePlayers(players: Player[]) {
  localStorage.setItem(KEY, JSON.stringify(players))
}

export function uid() {
  return Math.random().toString(36).slice(2, 9)
}
