import { useMemo } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useClock } from '@/hooks/useClock'
import { buildLiveTimerView } from '@/utils/timer'
import { calculatePrizePool } from '@/utils/payouts'

export function useSelectedTournamentId() {
  return useAppStore((s) => s.selectedTournamentId)
}

export function useTournamentBundle(tournamentId?: string | null) {
  const selectedId = useAppStore((s) => s.selectedTournamentId)
  const id = tournamentId ?? selectedId
  const tournaments = useAppStore((s) => s.tournaments)
  const entries = useAppStore((s) => s.entries)
  const tables = useAppStore((s) => s.tables)
  const blindStructures = useAppStore((s) => s.blindStructures)
  const timerStates = useAppStore((s) => s.timerStates)
  const prizeStructures = useAppStore((s) => s.prizeStructures)
  const announcements = useAppStore((s) => s.announcements)
  const players = useAppStore((s) => s.players)
  const getEntryName = useAppStore((s) => s.getEntryName)
  const activeTimer = timerStates.find((t) => t.tournamentId === id) ?? null
  const now = useClock(activeTimer?.status === 'running', 250)

  return useMemo(() => {
    const tournament = tournaments.find((t) => t.id === id) ?? null
    const tEntries = entries.filter((e) => e.tournamentId === id && e.status !== 'cancelled')
    const tTables = tables.filter((t) => t.tournamentId === id)
    const structure = blindStructures.find((b) => b.id === tournament?.blindStructureId) ?? null
    const currentTimer = timerStates.find((t) => t.tournamentId === id) ?? null
    const prize = prizeStructures.find((p) => p.tournamentId === id) ?? null
    const anns = announcements.filter((a) => a.tournamentId === id && a.active)
    const seated = tEntries.filter((e) => e.status === 'seated')
    const remaining = seated.length
    const totalChips = seated.reduce((s, e) => s + e.currentChips, 0)
    const avgStack = remaining ? Math.round(totalChips / remaining) : 0
    const live =
      currentTimer && structure
        ? buildLiveTimerView(currentTimer, structure.levels, now)
        : null
    const rebuyRevenue = tEntries.reduce((s, e) => s + e.rebuyCount * (tournament?.rebuy.cost ?? 0), 0)
    const reentryRevenue = tEntries.reduce(
      (s, e) => s + e.reentryCount * (tournament?.reentry.cost ?? 0),
      0,
    )
    const addonRevenue = tEntries.reduce((s, e) => s + e.addonCount * (tournament?.addon.cost ?? 0), 0)
    const pool = tournament
      ? calculatePrizePool({
          entriesCount: tEntries.length,
          buyIn: tournament.buyIn,
          fee: tournament.fee,
          rebuyRevenue,
          reentryRevenue,
          addonRevenue,
          guaranteedPrize: tournament.guaranteedPrize,
          operatingFee: prize?.operatingFee ?? 0,
          extraPrize: prize?.extraPrize ?? 0,
        })
      : null

    const chipLeader = [...seated].sort((a, b) => b.currentChips - a.currentChips)[0]
    const lowStack = [...seated].sort((a, b) => a.currentChips - b.currentChips)[0]

    return {
      tournament,
      entries: tEntries,
      tables: tTables,
      structure,
      timer: currentTimer,
      prize,
      announcements: anns,
      players,
      remaining,
      totalChips,
      avgStack,
      live,
      pool,
      activeTables: tTables.filter((t) => t.status === 'active' || t.status === 'locked').length,
      chipLeader: chipLeader
        ? { name: getEntryName(chipLeader.id), chips: chipLeader.currentChips }
        : null,
      lowStack: lowStack ? { name: getEntryName(lowStack.id), chips: lowStack.currentChips } : null,
    }
  }, [
    id,
    now,
    tournaments,
    entries,
    tables,
    blindStructures,
    timerStates,
    prizeStructures,
    announcements,
    players,
    getEntryName,
  ])
}
