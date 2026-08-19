import type { BalanceSuggestion, Table, TableBreakPlan, TournamentEntry } from '@/types'

function activeEntries(entries: TournamentEntry[]): TournamentEntry[] {
  return entries.filter(
    (e) =>
      e.status === 'seated' &&
      !e.eliminatedAt &&
      e.currentTableId &&
      e.currentSeat != null &&
      !e.excludeFromBalance &&
      !e.isSeatLocked,
  )
}

function tableCounts(tables: Table[], entries: TournamentEntry[]) {
  return tables
    .filter((t) => t.status === 'active' || t.status === 'locked')
    .map((t) => ({
      table: t,
      count: entries.filter((e) => e.currentTableId === t.id && e.status === 'seated').length,
      occupied: new Set(
        entries
          .filter((e) => e.currentTableId === t.id && e.status === 'seated' && e.currentSeat != null)
          .map((e) => e.currentSeat as number),
      ),
    }))
}

function findOpenSeat(occupied: Set<number>, maxSeats: number, preferAwayFromButton: number): number | null {
  const seats = Array.from({ length: maxSeats }, (_, i) => i + 1).filter((s) => !occupied.has(s))
  if (seats.length === 0) return null
  // Prefer seats not immediately left of button (BB-ish)
  const bbSeat = (preferAwayFromButton % maxSeats) + 1
  const sorted = seats.sort((a, b) => {
    const da = Math.min(Math.abs(a - bbSeat), maxSeats - Math.abs(a - bbSeat))
    const db = Math.min(Math.abs(b - bbSeat), maxSeats - Math.abs(b - bbSeat))
    return db - da
  })
  return sorted[0] ?? null
}

export function suggestBalance(
  tables: Table[],
  entries: TournamentEntry[],
  nameByEntryId: Record<string, string>,
): BalanceSuggestion[] {
  const movable = activeEntries(entries)
  const counts = tableCounts(tables, entries)
  if (counts.length < 2) return []

  const suggestions: BalanceSuggestion[] = []
  const working = counts.map((c) => ({
    ...c,
    occupied: new Set(c.occupied),
    count: c.count,
  }))

  // Keep difference within 1
  for (let guard = 0; guard < 20; guard += 1) {
    working.sort((a, b) => b.count - a.count)
    const richest = working[0]
    const poorest = working[working.length - 1]
    if (!richest || !poorest) break
    if (richest.count - poorest.count <= 1) break
    if (poorest.count >= poorest.table.maxSeats) break

    const candidates = movable
      .filter((e) => e.currentTableId === richest.table.id)
      .sort((a, b) => {
        const aRecent = a.lastMovedAt ? new Date(a.lastMovedAt).getTime() : 0
        const bRecent = b.lastMovedAt ? new Date(b.lastMovedAt).getTime() : 0
        return aRecent - bRecent
      })

    const pick = candidates.find((c) => {
      // Avoid moving player about to post BB (seat right of button)
      const button = richest.table.dealerButtonSeat
      const bb = (button % richest.table.maxSeats) + 1
      return c.currentSeat !== bb
    })
    if (!pick || pick.currentSeat == null) break

    const toSeat = findOpenSeat(
      poorest.occupied,
      poorest.table.maxSeats,
      poorest.table.dealerButtonSeat,
    )
    if (toSeat == null) break

    suggestions.push({
      entryId: pick.id,
      playerName: nameByEntryId[pick.id] ?? 'Unknown',
      fromTableId: richest.table.id,
      fromTableNumber: richest.table.number,
      fromSeat: pick.currentSeat,
      toTableId: poorest.table.id,
      toTableNumber: poorest.table.number,
      toSeat,
      reason: `테이블 인원 균형 (${richest.count}→${richest.count - 1}, ${poorest.count}→${poorest.count + 1})`,
    })

    richest.count -= 1
    poorest.count += 1
    richest.occupied.delete(pick.currentSeat)
    poorest.occupied.add(toSeat)
    // prevent same entry reused
    const idx = movable.findIndex((m) => m.id === pick.id)
    if (idx >= 0) movable.splice(idx, 1)
  }

  return suggestions
}

export function suggestTableBreak(
  tables: Table[],
  entries: TournamentEntry[],
  nameByEntryId: Record<string, string>,
): TableBreakPlan | null {
  const activeTables = tables.filter((t) => t.status === 'active' || t.status === 'locked')
  if (activeTables.length < 2) return null

  const seated = entries.filter((e) => e.status === 'seated' && e.currentTableId)
  const totalPlayers = seated.length
  const targetTables = Math.max(1, Math.ceil(totalPlayers / (activeTables[0]?.maxSeats ?? 9)))
  if (targetTables >= activeTables.length) return null

  // Break the table with fewest players (prefer marked break candidates)
  const ranked = [...activeTables].sort((a, b) => {
    const ca = seated.filter((e) => e.currentTableId === a.id).length
    const cb = seated.filter((e) => e.currentTableId === b.id).length
    if (a.isBreakCandidate !== b.isBreakCandidate) return a.isBreakCandidate ? -1 : 1
    return ca - cb
  })
  const breakTable = ranked[0]
  if (!breakTable) return null

  const remainingTables = activeTables.filter((t) => t.id !== breakTable.id)
  const movers = seated.filter((e) => e.currentTableId === breakTable.id)
  const moves: BalanceSuggestion[] = []

  const occupancy = remainingTables.map((t) => ({
    table: t,
    occupied: new Set(
      seated
        .filter((e) => e.currentTableId === t.id && e.currentSeat != null)
        .map((e) => e.currentSeat as number),
    ),
    count: seated.filter((e) => e.currentTableId === t.id).length,
  }))

  for (const mover of movers) {
    occupancy.sort((a, b) => a.count - b.count)
    const dest = occupancy.find((o) => o.count < o.table.maxSeats)
    if (!dest || mover.currentSeat == null) continue
    const seat = findOpenSeat(dest.occupied, dest.table.maxSeats, dest.table.dealerButtonSeat)
    if (seat == null) continue
    moves.push({
      entryId: mover.id,
      playerName: nameByEntryId[mover.id] ?? 'Unknown',
      fromTableId: breakTable.id,
      fromTableNumber: breakTable.number,
      fromSeat: mover.currentSeat,
      toTableId: dest.table.id,
      toTableNumber: dest.table.number,
      toSeat: seat,
      reason: `${breakTable.number}번 테이블 브레이크`,
    })
    dest.occupied.add(seat)
    dest.count += 1
  }

  if (moves.length !== movers.length) return null

  const resultingCounts = occupancy.map((o) => ({
    tableNumber: o.table.number,
    count: o.count,
  }))

  return {
    breakTableId: breakTable.id,
    breakTableNumber: breakTable.number,
    moves,
    resultingCounts,
  }
}
