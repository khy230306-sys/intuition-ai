/** Local artwork gallery — separate from profile/learning storage. */

export type ArtworkRecord = {
  artworkId: string
  templateId: string
  createdAt: number
  updatedAt: number
  thumbnail: string
  drawingData: string
  childName?: string
  mode: 'easy' | 'free'
}

const KEY = 'ssuk-color-studio-artworks-v1'
const MAX = 40

function loadAll(): ArtworkRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ArtworkRecord[]
    return Array.isArray(parsed) ? parsed : []
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

export function saveArtwork(input: Omit<ArtworkRecord, 'createdAt' | 'updatedAt'> & { createdAt?: number }): ArtworkRecord {
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

export function newArtworkId() {
  return `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
