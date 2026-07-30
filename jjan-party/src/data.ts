export type Penalty = {
  text: string
  sips: number
}

export type BalanceQ = {
  a: string
  b: string
}

export type Mission = {
  title: string
  detail: string
  sips: number
}

export type TruthQ = {
  text: string
  sips: number
}

export type ChosungQ = {
  hint: string
  answer: string
  chosung: string
}

export const PENALTIES: Penalty[] = [
  { text: '원샷!', sips: 1 },
  { text: '왼쪽 사람과 건배 후 마시기', sips: 1 },
  { text: '오른쪽 사람과 건배 후 마시기', sips: 1 },
  { text: '두 모금!', sips: 2 },
  { text: '자기소개 하고 마시기', sips: 1 },
  { text: '애창곡 한 소절 부르고 마시기', sips: 1 },
  { text: '최애 음식 말하고 마시기', sips: 1 },
  { text: '옆에 사람 따라 마시기', sips: 1 },
  { text: '다 같이 짠! 하고 한 모금', sips: 1 },
  { text: '칭찬 한 마디 하고 마시기', sips: 1 },
  { text: '웃긴 표정 짓고 마시기', sips: 1 },
  { text: '핸드폰 없이 1분 버티기 실패 시 마시기', sips: 1 },
  { text: '물개박수 10번 후 마시기', sips: 1 },
  { text: '오늘 제일 취할 것 같은 사람 지목 → 그 사람 마시기', sips: 1 },
  { text: '자유 통과! (안 마셔도 됨)', sips: 0 },
  { text: '세 모금 폭탄!', sips: 3 },
]

export const BALANCE: BalanceQ[] = [
  { a: '소주', b: '맥주' },
  { a: '여름 바다', b: '겨울 스키장' },
  { a: '치킨', b: '피자' },
  { a: '아침형 인간', b: '저녁형 인간' },
  { a: '카톡', b: '전화' },
  { a: '집콕', b: '외출' },
  { a: '매운 음식', b: '단 음식' },
  { a: '넷플릭스', b: '유튜브' },
  { a: '강아지', b: '고양이' },
  { a: '산', b: '바다' },
  { a: '즉흥 여행', b: '계획 여행' },
  { a: '노래방', b: '보드게임' },
  { a: '단톡방 읽씹', b: '단톡방 과몰입' },
  { a: '야식', b: '브런치' },
  { a: '비 오는 날', b: '눈 오는 날' },
  { a: '로맨스 영화', b: '액션 영화' },
]

export const MISSIONS: Mission[] = [
  {
    title: '눈 마주치기',
    detail: '옆 사람과 5초간 눈 마주치기. 먼저 웃으면 마시기!',
    sips: 1,
  },
  {
    title: '빠른 건배',
    detail: '3초 안에 전원이 잔을 들어 짠! 못하면 제일 느린 사람 마시기',
    sips: 1,
  },
  {
    title: '연기왕',
    detail: '슬픈 연기를 해라. 제일 못한다는 투표 받은 사람 마시기',
    sips: 1,
  },
  {
    title: '비밀 고백',
    detail: '오늘 자리에 대한 솔직한 한 마디. 못하면 두 모금',
    sips: 2,
  },
  {
    title: '거울 모드',
    detail: '오른쪽 사람의 동작을 10초간 따라하기. 실패하면 마시기',
    sips: 1,
  },
  {
    title: '속도전',
    detail: '자기 이름 거꾸로 말하기. 틀리면 마시기',
    sips: 1,
  },
  {
    title: '최애 자랑',
    detail: '최근 빠진 것 자랑하기. 시시하면 다수결로 마시기',
    sips: 1,
  },
  {
    title: '박수 폭탄',
    detail: '박수 치고 멈추기. 마지막에 친 사람 마시기',
    sips: 1,
  },
  {
    title: '칭찬 릴레이',
    detail: '왼쪽에 칭찬 한 마디. 막히면 마시기',
    sips: 1,
  },
  {
    title: '무표정 챌린지',
    detail: '15초간 무표정. 웃으면 마시기',
    sips: 1,
  },
]

export const TRUTHS: TruthQ[] = [
  { text: '이 자리에 처음 본 사람이 있다면 누구?', sips: 1 },
  { text: '최근 가장 부끄러웠던 순간은?', sips: 1 },
  { text: '지금 제일 먹고 싶은 안주는?', sips: 1 },
  { text: '친구들 몰래 좋아했던 사람 있었던 적?', sips: 2 },
  { text: '술에 취해서 했던 일 중 가장 기억나는 건?', sips: 1 },
  { text: '이 중 제일 먼저 집에 갈 것 같은 사람은?', sips: 1 },
  { text: '요즘 가장 스트레스 받는 일은?', sips: 1 },
  { text: '이상형 한 줄로 말해봐', sips: 1 },
  { text: '카톡 읽씹 자주 하는 편이야?', sips: 1 },
  { text: '지금 가장 보고 싶은 사람은?', sips: 2 },
  { text: '최근 한 거짓말 있으면 말해봐', sips: 2 },
  { text: '이 자리에서 제일 웃긴 사람은?', sips: 1 },
]

export const CHOSUNG: ChosungQ[] = [
  { hint: '한국인이 사랑하는 대표 안주', answer: '치킨', chosung: 'ㅊㅋ' },
  { hint: '투명하고 독한 그 술', answer: '소주', chosung: 'ㅅㅈ' },
  { hint: '노래 부르며 노는 방', answer: '노래방', chosung: 'ㄴㄹㅂ' },
  { hint: '여름철 시원한 대표 음식', answer: '냉면', chosung: 'ㄴㅁ' },
  { hint: '회사에서 제일 싫은 요일', answer: '월요일', chosung: 'ㅇㄹㅇ' },
  { hint: '연말에 주고받는 그것', answer: '선물', chosung: 'ㅅㅁ' },
  { hint: '비 올 때 쓰는 물건', answer: '우산', chosung: 'ㅇㅅ' },
  { hint: '아침에 마시는 쓴 음료', answer: '커피', chosung: 'ㅋㅍ' },
  { hint: '생일마다 부는 것', answer: '촛불', chosung: 'ㅊㅂ' },
  { hint: '친구들과 가는 여행', answer: '여행', chosung: 'ㅇㅎ' },
  { hint: '휴대폰으로 찍는 것', answer: '사진', chosung: 'ㅅㅈ' },
  { hint: '겨울에 내리는 하얀 것', answer: '눈', chosung: 'ㄴ' },
  { hint: '매운 찌개 요리', answer: '김치찌개', chosung: 'ㄱㅊㅉㄱ' },
  { hint: '술을 따르며 하는 인사', answer: '건배', chosung: 'ㄱㅂ' },
]

export const FORBIDDEN_WORDS = [
  '진짜',
  '대박',
  '아니',
  '그냥',
  '근데',
  '약간',
  '솔직히',
  '존맛',
  'ㅋㅋ',
  '헐',
  '완전',
  '레알',
]

export const RPS = ['가위', '바위', '보'] as const
export type RpsChoice = (typeof RPS)[number]

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

export function rpsWinner(a: RpsChoice, b: RpsChoice): 'a' | 'b' | 'draw' {
  if (a === b) return 'draw'
  if (
    (a === '가위' && b === '보') ||
    (a === '바위' && b === '가위') ||
    (a === '보' && b === '바위')
  ) {
    return 'a'
  }
  return 'b'
}
