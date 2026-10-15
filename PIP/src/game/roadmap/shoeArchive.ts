import type { Shoe } from '../types'
import { MAX_ARCHIVED_SHOES, type ArchivedShoe } from './types'

const ARCHIVE_KEY = 'pip.shoeArchive.v1'
const SAME_MODE_KEY = 'pip.roadmap.sameIndependent.v1'

export function createArchivedShoe(
  shoe: Shoe,
  startedAt: string,
  endedAt: string,
  includeHidden: boolean,
): ArchivedShoe {
  return {
    id: `shoe-${shoe.shoeNumber}-${endedAt}`,
    shoeNumber: shoe.shoeNumber,
    startedAt,
    endedAt,
    rounds: [...shoe.history],
    hidden: includeHidden ? shoe.hidden.map((card) => ({ ...card })) : null,
    cardDuelResults: shoe.history.map((round) => round.cardDuel),
    totalBandResults: shoe.history.map((round) => round.totalBand),
  }
}

export function loadArchivedShoes(): ArchivedShoe[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ARCHIVE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ArchivedShoe[]
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, MAX_ARCHIVED_SHOES)
  } catch {
    return []
  }
}

export function saveArchivedShoes(shoes: ArchivedShoe[]): void {
  if (typeof window === 'undefined') return
  const trimmed = shoes.slice(0, MAX_ARCHIVED_SHOES)
  window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(trimmed))
}

export function pushArchivedShoe(archive: ArchivedShoe, existing = loadArchivedShoes()): ArchivedShoe[] {
  const withoutDup = existing.filter(
    (item) => item.shoeNumber !== archive.shoeNumber || item.endedAt !== archive.endedAt,
  )
  const next = [archive, ...withoutDup].slice(0, MAX_ARCHIVED_SHOES)
  saveArchivedShoes(next)
  return next
}

export function loadSameIndependent(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SAME_MODE_KEY) === '1'
}

export function saveSameIndependent(value: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SAME_MODE_KEY, value ? '1' : '0')
}

/** Hidden values must stay concealed until shoe completion. */
export function canRevealArchivedHidden(archive: ArchivedShoe): boolean {
  return Array.isArray(archive.hidden) && archive.hidden.length > 0
}
