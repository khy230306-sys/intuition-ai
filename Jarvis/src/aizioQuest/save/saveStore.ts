import type { HeroId, QuestSave } from '../types'
import { starterWeapon } from '../content/equipment'

const KEY = 'aizio.quest.save.v1'
const IDB_NAME = 'aizio-quest'
const IDB_STORE = 'saves'

export function defaultSave(): QuestSave {
  const starter = starterWeapon()
  return {
    v: 1,
    heroId: null,
    unlockedHeroes: ['kael'],
    level: 1,
    xp: 0,
    credit: 80,
    stageCleared: 0,
    inventory: [starter],
    equipped: { WEAPON: starter.id },
    achievements: [],
    settings: { music: true, sfx: true, haptic: true },
    tutorialDone: false,
    bestCombo: 0,
    gemsCleared: 0,
    battlesWon: 0,
    battlesLost: 0,
    dailyDate: '',
    dailyBest: 0,
    updatedAt: new Date().toISOString(),
  }
}

export function loadQuestSave(): QuestSave {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSave()
    const parsed = JSON.parse(raw) as QuestSave
    if (!parsed || parsed.v !== 1) return defaultSave()
    return { ...defaultSave(), ...parsed, settings: { ...defaultSave().settings, ...parsed.settings } }
  } catch {
    return defaultSave()
  }
}

export function saveQuestSave(save: QuestSave): void {
  const next = { ...save, updatedAt: new Date().toISOString() }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  void idbPut(next)
}

function idbPut(save: QuestSave): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve()
      return
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(IDB_STORE, 'readwrite')
        tx.objectStore(IDB_STORE).put(save, 'main')
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          resolve()
        }
      }
      req.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

export function xpToNext(level: number): number {
  return 80 + (level - 1) * 35
}

export function applyXp(save: QuestSave, gained: number): QuestSave {
  let { level, xp } = save
  xp += gained
  let guard = 0
  while (xp >= xpToNext(level) && level < 40 && guard < 20) {
    xp -= xpToNext(level)
    level += 1
    guard++
  }
  return { ...save, level, xp }
}

export function unlockHeroesForStage(save: QuestSave, stageCleared: number): QuestSave {
  const unlocked = new Set(save.unlockedHeroes)
  if (stageCleared >= 3) unlocked.add('mira')
  if (stageCleared >= 7) unlocked.add('nyx')
  return { ...save, unlockedHeroes: [...unlocked] as HeroId[] }
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
