export type GameMeta = {
  id: string
  title: string
  subtitle: string
  tags: Array<'car' | 'color' | 'touch' | 'focus' | 'core' | 'more'>
  accent: string
}

/** Core shelf first — short toddler copy */
export const GAMES: GameMeta[] = [
  { id: 'sound-board', title: '사운드보드', subtitle: '빵빵 삐뽀!', tags: ['car', 'touch', 'core'], accent: 'sunny' },
  { id: 'car-puzzle', title: '자동차 퍼즐', subtitle: '조각을 맞춰요', tags: ['car', 'focus', 'touch', 'core'], accent: 'grape' },
  { id: 'color-follow', title: '부릉 따라하기', subtitle: '색깔 순서 기억', tags: ['color', 'car', 'focus', 'touch', 'core'], accent: 'grape' },
  { id: 'car-paint', title: '쑥쑥 색칠놀이', subtitle: '자동차·중장비를 부분별로 색칠해요', tags: ['car', 'color', 'touch', 'core'], accent: 'grape' },
  { id: 'story-tap', title: '자동차 동화', subtitle: '이야기를 골라요', tags: ['car', 'touch', 'core'], accent: 'berry' },
  { id: 'maze-drive', title: '미로 운전', subtitle: '길을 따라가요', tags: ['car', 'focus', 'touch', 'core'], accent: 'sky' },
  { id: 'wait-go', title: '참았다가 출발', subtitle: '초록불에 출발!', tags: ['car', 'color', 'focus', 'touch', 'core'], accent: 'leaf' },
  { id: 'car-parade', title: '색깔 줄세우기', subtitle: '같은 색 자리에', tags: ['car', 'color', 'focus', 'touch', 'core'], accent: 'sky' },
  { id: 'car-builder', title: '자동차 만들기', subtitle: '차랑 색을 골라요', tags: ['car', 'color', 'core'], accent: 'leaf' },
  { id: 'sand-play', title: '모래놀이', subtitle: '보물을 찾아요', tags: ['touch', 'core'], accent: 'sunny' },
  { id: 'balloons', title: '색깔 풍선', subtitle: '같은 색 팡!', tags: ['color', 'touch', 'core'], accent: 'berry' },
  { id: 'color-mix', title: '색깔 섞기', subtitle: '두 색을 섞어요', tags: ['color', 'core'], accent: 'grape' },
  { id: 'sticker-book', title: '스티커 차고', subtitle: '모은 스티커', tags: ['car', 'touch', 'core'], accent: 'leaf' },

  { id: 'hidden-cars', title: '숨은 자동차', subtitle: '자동차만 찾아요', tags: ['car', 'focus', 'touch', 'more'], accent: 'sunny' },
  { id: 'rhythm-tap', title: '톡톡 리듬', subtitle: '박자를 따라요', tags: ['focus', 'touch', 'more'], accent: 'berry' },
  { id: 'vroom-race', title: '부릉 레이스', subtitle: '색깔 차를 탭!', tags: ['car', 'color', 'touch', 'more'], accent: 'sunny' },
  { id: 'color-garage', title: '색깔 차고', subtitle: '같은 색 차고에', tags: ['car', 'color', 'more'], accent: 'berry' },
  { id: 'parking', title: '주차 놀이', subtitle: '색깔 주차!', tags: ['car', 'color', 'more'], accent: 'sky' },
  { id: 'find-color-car', title: '색깔 찾기', subtitle: '같은 색 찾기', tags: ['car', 'color', 'touch', 'more'], accent: 'berry' },
  { id: 'car-memory', title: '짝 맞추기', subtitle: '같은 차 찾기', tags: ['car', 'touch', 'more'], accent: 'sky' },
  { id: 'car-sounds', title: '소리 맞추기', subtitle: '무슨 소리일까?', tags: ['car', 'more'], accent: 'sunny' },
  { id: 'shape-touch', title: '모양 찾기', subtitle: '모양을 찾아요', tags: ['touch', 'more'], accent: 'sky' },
  { id: 'bubble-pop', title: '방울 팡팡', subtitle: '방울을 터치!', tags: ['color', 'touch', 'more'], accent: 'sky' },
  { id: 'stamp-pad', title: '스탬프', subtitle: '콕콕 찍어요', tags: ['car', 'color', 'touch', 'more'], accent: 'berry' },
  { id: 'finger-paint', title: '손가락 그림', subtitle: '마음껏 그려요', tags: ['color', 'touch', 'more'], accent: 'grape' },
  { id: 'pop-it', title: '톡톡 팝잇', subtitle: '동그라미 누르기', tags: ['color', 'touch', 'more'], accent: 'leaf' },
  { id: 'traffic-light', title: '신호등', subtitle: '초록불에만!', tags: ['car', 'color', 'touch', 'more'], accent: 'leaf' },
  { id: 'car-wash', title: '세차 놀이', subtitle: '깨끗이 닦아요', tags: ['car', 'touch', 'more'], accent: 'sky' },
  { id: 'bus-count', title: '버스 세기', subtitle: '친구를 세요', tags: ['car', 'more'], accent: 'sunny' },
  { id: 'color-quiz', title: '색깔 퀴즈', subtitle: '색깔을 골라요', tags: ['color', 'touch', 'more'], accent: 'grape' },
]

export const CORE_GAMES = GAMES.filter((g) => g.tags.includes('core'))
export const MORE_GAMES = GAMES.filter((g) => g.tags.includes('more'))

export function getGame(id: string) {
  return GAMES.find((g) => g.id === id)
}
