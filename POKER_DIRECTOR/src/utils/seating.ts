import type { SeatAssignmentPreview, Table, TournamentEntry } from '@/types'

export interface SeatingOptions {
  avoidPairs: Array<[string, string]>
  lockedSeats: Array<{ entryId: string; tableId: string; seatNumber: number }>
  excludeEntryIds: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function previewSeatAssignment(
  entries: TournamentEntry[],
  tables: Table[],
  nameByEntryId: Record<string, string>,
  options: Partial<SeatingOptions> = {},
): SeatAssignmentPreview[] {
  const activeTables = tables
    .filter((t) => t.status !== 'inactive' && t.status !== 'broken')
    .sort((a, b) => a.number - b.number)

  const locked = options.lockedSeats ?? []
  const exclude = new Set(options.excludeEntryIds ?? [])
  const assignable = shuffle(
    entries.filter(
      (e) =>
        (e.status === 'checked_in' || e.status === 'seated' || e.status === 'registered') &&
        !exclude.has(e.id),
    ),
  )

  const lockedEntryIds = new Set(locked.map((l) => l.entryId))
  const freePlayers = assignable.filter((e) => !lockedEntryIds.has(e.id))

  const capacity = activeTables.reduce((s, t) => s + t.maxSeats, 0)
  if (assignable.length > capacity) {
    throw new Error('사용 가능한 좌석보다 참가자가 많습니다.')
  }

  const tableBuckets = activeTables.map((t) => ({
    table: t,
    seats: new Map<number, TournamentEntry>(),
  }))

  for (const lock of locked) {
    const bucket = tableBuckets.find((b) => b.table.id === lock.tableId)
    const entry = assignable.find((e) => e.id === lock.entryId)
    if (bucket && entry) bucket.seats.set(lock.seatNumber, entry)
  }

  // Even distribution target
  const nTables = activeTables.length || 1
  const base = Math.floor(freePlayers.length / nTables)
  const remainder = freePlayers.length % nTables
  const targets = activeTables.map((_, i) => base + (i < remainder ? 1 : 0))

  let playerIdx = 0
  tableBuckets.forEach((bucket, i) => {
    const need = Math.max(0, targets[i] - bucket.seats.size)
    const availableSeats = Array.from({ length: bucket.table.maxSeats }, (_, s) => s + 1).filter(
      (s) => !bucket.seats.has(s),
    )
    const shuffledSeats = shuffle(availableSeats)
    for (let k = 0; k < need && playerIdx < freePlayers.length; k += 1) {
      const seatNum = shuffledSeats[k]
      if (!seatNum) break
      // avoid pairs
      const candidate = freePlayers[playerIdx]
      const avoid = options.avoidPairs ?? []
      const conflict = [...bucket.seats.values()].some((seated) =>
        avoid.some(
          ([a, b]) =>
            (a === candidate.id && b === seated.id) || (b === candidate.id && a === seated.id),
        ),
      )
      if (conflict && playerIdx + 1 < freePlayers.length) {
        const swap = freePlayers[playerIdx + 1]
        freePlayers[playerIdx + 1] = candidate
        freePlayers[playerIdx] = swap
      }
      bucket.seats.set(seatNum, freePlayers[playerIdx])
      playerIdx += 1
    }
  })

  // leftover fill
  while (playerIdx < freePlayers.length) {
    const bucket = tableBuckets
      .filter((b) => b.seats.size < b.table.maxSeats)
      .sort((a, b) => a.seats.size - b.seats.size)[0]
    if (!bucket) break
    const seatNum = Array.from({ length: bucket.table.maxSeats }, (_, s) => s + 1).find(
      (s) => !bucket.seats.has(s),
    )
    if (!seatNum) break
    bucket.seats.set(seatNum, freePlayers[playerIdx])
    playerIdx += 1
  }

  return tableBuckets.map((b) => ({
    tableId: b.table.id,
    tableNumber: b.table.number,
    seats: [...b.seats.entries()]
      .sort((a, c) => a[0] - c[0])
      .map(([seatNumber, entry]) => ({
        seatNumber,
        entryId: entry.id,
        playerName: nameByEntryId[entry.id] ?? 'Unknown',
        chips: entry.currentChips,
      })),
  }))
}
