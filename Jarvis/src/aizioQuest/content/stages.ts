import type { StageDef } from '../types'

/** Chapter 1 — 15 normal + 3 elite + 1 boss = 19 battles. */

const NORMAL_ENEMY_ROTATION = [
  'shardling',
  'echo-wisp',
  'rust-sentinel',
  'volt-mite',
  'mire-lurker',
  'glass-archer',
  'cinder-brute',
  'null-priest',
  'helix-drone',
  'shardling',
  'echo-wisp',
  'volt-mite',
  'mire-lurker',
  'cinder-brute',
  'helix-drone',
] as const

const STAGE_NAMES = [
  '잔광 들판',
  '메아리 개울',
  '녹슨 관문',
  '전하 협곡',
  '이끼 늪',
  '수정 능선',
  '잿불 언덕',
  '공허 예배당',
  '나선 교각',
  '흩어진 기억',
  '잔향 동굴',
  '스파크 폐허',
  '검은 수렁',
  '용암 틈새',
  '관측 전초',
] as const

export const CHAPTER1_STAGES: StageDef[] = [
  ...NORMAL_ENEMY_ROTATION.map((enemyId, i) => {
    const index = i + 1
    const hard = index >= 6
    return {
      id: `c1-s${index}`,
      chapter: 1,
      index,
      name: STAGE_NAMES[i]!,
      enemyId,
      difficulty: (hard ? 'HARD' : 'NORMAL') as StageDef['difficulty'],
      xp: 40 + index * 8,
      credit: 25 + index * 6,
    }
  }),
  {
    id: 'c1-e1',
    chapter: 1,
    index: 16,
    name: '엘리트 · 봉쇄 관문',
    enemyId: 'elite-warden',
    difficulty: 'ELITE',
    xp: 140,
    credit: 120,
    isElite: true,
  },
  {
    id: 'c1-e2',
    chapter: 1,
    index: 17,
    name: '엘리트 · 공명 심연',
    enemyId: 'elite-siren',
    difficulty: 'ELITE',
    xp: 150,
    credit: 130,
    isElite: true,
  },
  {
    id: 'c1-e3',
    chapter: 1,
    index: 18,
    name: '엘리트 · 용광 심장',
    enemyId: 'elite-forge',
    difficulty: 'ELITE',
    xp: 160,
    credit: 140,
    isElite: true,
  },
  {
    id: 'c1-boss',
    chapter: 1,
    index: 19,
    name: '보스 · 심핵 감시자',
    enemyId: 'boss-aetherion',
    difficulty: 'BOSS',
    xp: 280,
    credit: 260,
    isBoss: true,
  },
]

export function stageById(id: string): StageDef | undefined {
  return CHAPTER1_STAGES.find((s) => s.id === id)
}

export function stageByIndex(index: number): StageDef | undefined {
  return CHAPTER1_STAGES.find((s) => s.index === index)
}

export function nextStageAfter(cleared: number): StageDef | undefined {
  return CHAPTER1_STAGES.find((s) => s.index === cleared + 1)
}
