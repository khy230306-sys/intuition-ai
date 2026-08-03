export type GameMeta = {
  id: string
  title: string
  subtitle: string
  emoji: string
  tags: Array<'car' | 'color' | 'new' | 'classic'>
  accent: string
}

export const GAMES: GameMeta[] = [
  {
    id: 'color-garage',
    title: '색깔 차고',
    subtitle: '같은 색 차고에 자동차를 넣어요',
    emoji: '🏠',
    tags: ['car', 'color', 'new'],
    accent: 'berry',
  },
  {
    id: 'vroom-race',
    title: '부릉부릉 레이스',
    subtitle: '말한 색깔 자동차를 탭해요',
    emoji: '🏁',
    tags: ['car', 'color', 'new'],
    accent: 'sunny',
  },
  {
    id: 'parking',
    title: '주차 놀이',
    subtitle: '색깔 자리에 자동차를 주차해요',
    emoji: '🅿️',
    tags: ['car', 'color', 'new'],
    accent: 'sky',
  },
  {
    id: 'car-paint',
    title: '자동차 색칠공장',
    subtitle: '원하는 색으로 자동차를 칠해요',
    emoji: '🎨',
    tags: ['car', 'color', 'new'],
    accent: 'grape',
  },
  {
    id: 'car-builder',
    title: '자동차 조립',
    subtitle: '바퀴·차체를 골라 만들어요',
    emoji: '🔧',
    tags: ['car', 'color', 'new'],
    accent: 'leaf',
  },
  {
    id: 'find-color-car',
    title: '색깔 자동차 찾기',
    subtitle: '같은 색 자동차를 모두 찾아요',
    emoji: '🔎',
    tags: ['car', 'color', 'new'],
    accent: 'berry',
  },
  {
    id: 'color-mix',
    title: '색깔 섞기',
    subtitle: '두 색을 섞어 새 색을 만들어요',
    emoji: '🧪',
    tags: ['color', 'new'],
    accent: 'grape',
  },
  {
    id: 'car-memory',
    title: '자동차 기억카드',
    subtitle: '같은 자동차 짝을 맞춰요',
    emoji: '🃏',
    tags: ['car', 'new'],
    accent: 'sky',
  },
  {
    id: 'car-sounds',
    title: '자동차 소리',
    subtitle: '소리를 듣고 탈것을 맞춰요',
    emoji: '🔊',
    tags: ['car', 'new'],
    accent: 'sunny',
  },
  {
    id: 'traffic-light',
    title: '신호등 놀이',
    subtitle: '초록불에만 부릉부릉!',
    emoji: '🚦',
    tags: ['car', 'color', 'classic'],
    accent: 'leaf',
  },
  {
    id: 'car-wash',
    title: '자동차 세차',
    subtitle: '더러운 차를 깨끗이 닦아요',
    emoji: '🚿',
    tags: ['car', 'classic'],
    accent: 'sky',
  },
  {
    id: 'balloons',
    title: '색깔 풍선 팡!',
    subtitle: '말한 색깔 풍선을 터뜨려요',
    emoji: '🎈',
    tags: ['color', 'classic'],
    accent: 'berry',
  },
  {
    id: 'bus-count',
    title: '버스 승객 세기',
    subtitle: '버스에 탄 친구를 세어 봐요',
    emoji: '🚌',
    tags: ['car', 'classic'],
    accent: 'sunny',
  },
  {
    id: 'color-quiz',
    title: '색깔 퀴즈',
    subtitle: '색깔 이름을 듣고 골라요',
    emoji: '⭐',
    tags: ['color', 'classic'],
    accent: 'grape',
  },
]

export function getGame(id: string) {
  return GAMES.find((g) => g.id === id)
}
