import type { QuestSave } from '../types'

export type AchievementDef = {
  id: string
  title: string
  desc: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_win', title: '첫 공명', desc: '첫 전투 승리' },
  { id: 'combo_10', title: '연쇄 10', desc: '한 턴에 콤보 10 달성' },
  { id: 'match_5', title: '오중 공명', desc: '5매치 성공' },
  { id: 'perfect', title: '무상 승리', desc: '피해 없이 승리' },
  { id: 'boss_win', title: '심핵 돌파', desc: '챕터 보스 격파' },
  { id: 'no_damage', title: '완벽한 방어', desc: '무피해 승리 (별칭)' },
  { id: 'gems_1000', title: '천 개의 파편', desc: 'GEM 1000개 제거' },
  { id: 'legendary', title: '전설의 파편', desc: 'LEGENDARY 장비 획득' },
  { id: 'level_5', title: '성장의 빛', desc: '영웅 레벨 5' },
  { id: 'level_10', title: '숙련 탐험가', desc: '영웅 레벨 10' },
  { id: 'elite_clear', title: '관문 돌파', desc: '엘리트 스테이지 클리어' },
  { id: 'unlock_mira', title: '수호의 합류', desc: '미라 솔렌 해금' },
  { id: 'unlock_nyx', title: '심연의 합류', desc: '닉스 베일 해금' },
  { id: 'daily_play', title: '일일 공명', desc: '데일리 챌린지 플레이' },
  { id: 'wins_20', title: '전장 숙련', desc: '20승 달성' },
]

export function checkAchievements(
  save: QuestSave,
  ctx: {
    combo?: number
    hadFive?: boolean
    perfect?: boolean
    boss?: boolean
    elite?: boolean
    legendary?: boolean
    daily?: boolean
  },
): string[] {
  const unlocked = new Set(save.achievements)
  const neu: string[] = []
  const grant = (id: string) => {
    if (!unlocked.has(id)) {
      unlocked.add(id)
      neu.push(id)
    }
  }
  if (save.battlesWon >= 1) grant('first_win')
  if ((ctx.combo || 0) >= 10 || save.bestCombo >= 10) grant('combo_10')
  if (ctx.hadFive) grant('match_5')
  if (ctx.perfect) {
    grant('perfect')
    grant('no_damage')
  }
  if (ctx.boss) grant('boss_win')
  if (save.gemsCleared >= 1000) grant('gems_1000')
  if (ctx.legendary || save.inventory.some((i) => i.rarity === 'LEGENDARY')) grant('legendary')
  if (save.level >= 5) grant('level_5')
  if (save.level >= 10) grant('level_10')
  if (ctx.elite) grant('elite_clear')
  if (save.unlockedHeroes.includes('mira')) grant('unlock_mira')
  if (save.unlockedHeroes.includes('nyx')) grant('unlock_nyx')
  if (ctx.daily) grant('daily_play')
  if (save.battlesWon >= 20) grant('wins_20')
  return neu
}
