import type { EquipItem, Rarity } from '../types'
import { mulberry32, pick } from '../match3/rng'

const NAMES: Record<string, string[]> = {
  WEAPON: ['잔광검', '공명창', '심연단검', '코어해머', '위상활'],
  ARMOR: ['이끼외피', '수정갑주', '재의 망토', '관측 코트', '헬릭스 가드'],
  CORE: ['불꽃 코어', '수맥 코어', '수호 코어', '암영 코어', '섬광 코어'],
  ACCESSORY: ['메아리 반지', '전하 팔찌', '기억 펜던트', '관문 인장', '심핵 브로치'],
}

function rarityStats(r: Rarity): { atk: number; def: number; hp: number; energyBonus: number } {
  switch (r) {
    case 'COMMON':
      return { atk: 6, def: 4, hp: 40, energyBonus: 0 }
    case 'RARE':
      return { atk: 12, def: 8, hp: 80, energyBonus: 0 }
    case 'EPIC':
      return { atk: 20, def: 14, hp: 140, energyBonus: 1 }
    case 'LEGENDARY':
      return { atk: 32, def: 22, hp: 220, energyBonus: 2 }
  }
}

function rollRarity(rng: () => number): Rarity {
  const x = rng()
  if (x < 0.55) return 'COMMON'
  if (x < 0.82) return 'RARE'
  if (x < 0.96) return 'EPIC'
  return 'LEGENDARY'
}

export function rollLoot(seed: number, elite = false): EquipItem {
  const rng = mulberry32(seed)
  let rarity = rollRarity(rng)
  if (elite && rng() < 0.35) rarity = rarity === 'COMMON' ? 'RARE' : rarity
  if (elite && rng() < 0.12) rarity = 'EPIC'
  const slot = pick(rng, ['WEAPON', 'ARMOR', 'CORE', 'ACCESSORY'] as const)
  const name = pick(rng, NAMES[slot]!)
  const st = rarityStats(rarity)
  const id = `eq-${seed.toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`
  return {
    id,
    name: `${rarity === 'LEGENDARY' ? '★ ' : ''}${name}`,
    slot,
    rarity,
    atk: slot === 'WEAPON' || slot === 'CORE' ? st.atk : Math.floor(st.atk * 0.4),
    def: slot === 'ARMOR' ? st.def : Math.floor(st.def * 0.5),
    hp: st.hp,
    energyBonus: slot === 'ACCESSORY' || slot === 'CORE' ? st.energyBonus : 0,
  }
}

export function starterWeapon(): EquipItem {
  return {
    id: 'eq-starter-blade',
    name: '견습 공명검',
    slot: 'WEAPON',
    rarity: 'COMMON',
    atk: 8,
    def: 0,
    hp: 20,
  }
}
