/** Local artwork gallery — separate from profile/learning storage. */

export type StudioModeSaved = 'easy' | 'free' | 'numbers'

export type ArtworkRecord = {
  artworkId: string
  templateId: string
  createdAt: number
  updatedAt: number
  thumbnail: string
  drawingData: string
  childName?: string
  mode: StudioModeSaved
  toolsUsed?: string[]
  colorsUsed?: string[]
}

const KEY = 'ssuk-vehicle-paint-artworks-v1'
const LEGACY_KEY = 'ssuk-color-studio-artworks-v1'
const MAX = 60

function loadAll(): ArtworkRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ArtworkRecord[]
      if (Array.isArray(parsed)) return parsed
    }
    // one-way migrate legacy color-studio saves without wiping profile
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as ArtworkRecord[]
      if (Array.isArray(parsed) && parsed.length) {
        saveAll(parsed)
        return parsed
      }
    }
    return []
  } catch {
    return []
  }
}

function saveAll(list: ArtworkRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
}

export function listArtworks(): ArtworkRecord[] {
  return loadAll().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getArtwork(id: string): ArtworkRecord | null {
  return loadAll().find((a) => a.artworkId === id) ?? null
}

export function saveArtwork(
  input: Omit<ArtworkRecord, 'createdAt' | 'updatedAt'> & { createdAt?: number },
): ArtworkRecord {
  const list = loadAll()
  const now = Date.now()
  const existing = list.find((a) => a.artworkId === input.artworkId)
  const record: ArtworkRecord = {
    artworkId: input.artworkId,
    templateId: input.templateId,
    thumbnail: input.thumbnail,
    drawingData: input.drawingData,
    childName: input.childName,
    mode: input.mode,
    toolsUsed: input.toolsUsed,
    colorsUsed: input.colorsUsed,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  }
  const next = [record, ...list.filter((a) => a.artworkId !== record.artworkId)].slice(0, MAX)
  saveAll(next)
  return record
}

export function deleteArtwork(id: string) {
  saveAll(loadAll().filter((a) => a.artworkId !== id))
}

export function duplicateArtwork(id: string): ArtworkRecord | null {
  const src = getArtwork(id)
  if (!src) return null
  return saveArtwork({
    ...src,
    artworkId: newArtworkId(),
    createdAt: Date.now(),
  })
}

export function newArtworkId() {
  return `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
