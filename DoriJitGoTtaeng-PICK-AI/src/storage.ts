import type { CardNumber, GameRecord, Position } from './types'
import { BACKUP_KEY, STORAGE_KEY } from './types'

function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function loadRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GameRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveRecords(records: GameRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  localStorage.setItem(BACKUP_KEY, JSON.stringify({
    savedAt: Date.now(),
    count: records.length,
    records,
  }))
}

export function addRecord(
  cards: [CardNumber, CardNumber, CardNumber],
  winner: Position,
  recommended: Position | null,
): GameRecord {
  const records = loadRecords()
  const hit = recommended === null ? null : recommended === winner
  const record: GameRecord = {
    id: uid(),
    cards,
    winner,
    recommended,
    hit,
    createdAt: Date.now(),
  }
  records.push(record)
  saveRecords(records)
  return record
}

export function clearRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(BACKUP_KEY)
}

export function exportBackupJson(): string {
  const records = loadRecords()
  return JSON.stringify(
    {
      app: 'DoriJitGoTtaeng PICK AI',
      version: 1,
      exportedAt: new Date().toISOString(),
      count: records.length,
      records,
    },
    null,
    2,
  )
}

export function importBackupJson(json: string): number {
  const data = JSON.parse(json) as { records?: GameRecord[] } | GameRecord[]
  const incoming = Array.isArray(data) ? data : data.records
  if (!Array.isArray(incoming)) throw new Error('유효하지 않은 백업 파일입니다.')

  const existing = loadRecords()
  const seen = new Set(existing.map((r) => r.id))
  let added = 0
  for (const r of incoming) {
    if (!r || !r.cards || !r.winner || !r.createdAt) continue
    if (seen.has(r.id)) continue
    existing.push({
      id: r.id || uid(),
      cards: r.cards as [CardNumber, CardNumber, CardNumber],
      winner: r.winner as Position,
      recommended: (r.recommended ?? null) as Position | null,
      hit: r.hit ?? null,
      createdAt: r.createdAt,
    })
    seen.add(r.id)
    added++
  }
  existing.sort((a, b) => a.createdAt - b.createdAt)
  saveRecords(existing)
  return added
}

export function restoreFromAutoBackup(): number {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    if (!raw) return 0
    const data = JSON.parse(raw) as { records?: GameRecord[] }
    if (!data.records?.length) return 0
    saveRecords(data.records)
    return data.records.length
  } catch {
    return 0
  }
}

export function recordsToCsv(records: GameRecord[]): string {
  const header = 'id,card1,card2,card3,winner,recommended,hit,createdAt,iso'
  const lines = records.map((r) =>
    [
      r.id,
      r.cards[0],
      r.cards[1],
      r.cards[2],
      r.winner,
      r.recommended ?? '',
      r.hit === null ? '' : r.hit ? '1' : '0',
      r.createdAt,
      new Date(r.createdAt).toISOString(),
    ].join(','),
  )
  return [header, ...lines].join('\n')
}

export function csvToRecords(csv: string): GameRecord[] {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const header = lines[0].toLowerCase()
  const start = header.includes('card1') ? 1 : 0
  const out: GameRecord[] = []
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 5) continue
    const cards = [
      Number(cols[1]),
      Number(cols[2]),
      Number(cols[3]),
    ] as [CardNumber, CardNumber, CardNumber]
    const winner = Number(cols[4]) as Position
    if (![1, 2, 3].includes(winner)) continue
    if (cards.some((c) => c < 1 || c > 10 || Number.isNaN(c))) continue
    const recommended = cols[5] ? (Number(cols[5]) as Position) : null
    const hitRaw = cols[6]
    const hit =
      hitRaw === '' || hitRaw === undefined
        ? recommended === null
          ? null
          : recommended === winner
        : hitRaw === '1' || hitRaw.toLowerCase() === 'true'
    out.push({
      id: cols[0] || uid(),
      cards,
      winner,
      recommended,
      hit,
      createdAt: Number(cols[7]) || Date.now(),
    })
  }
  return out
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
