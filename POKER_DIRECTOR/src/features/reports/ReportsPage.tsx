import { useMemo } from 'react'
import { useAppStore } from '@/stores/appStore'
import { Card, Stat } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { downloadText, toCsv } from '@/utils/csv'
import { formatMoney, formatNumber } from '@/utils/time'
import { useTournamentBundle } from '@/hooks/useTournament'

export function ReportsPage() {
  const venueId = useAppStore((s) => s.session?.currentVenueId ?? '')
  const stats = useAppStore((s) => s.statsForVenue(venueId))
  const tournaments = useAppStore((s) => s.tournaments.filter((t) => t.venueId === venueId))
  const entries = useAppStore((s) => s.entries)
  const players = useAppStore((s) => s.players)
  const eliminations = useAppStore((s) => s.eliminations)
  const getEntryName = useAppStore((s) => s.getEntryName)
  const selectedTournamentId = useAppStore((s) => s.selectedTournamentId)
  const bundle = useTournamentBundle(selectedTournamentId)

  const playerStats = useMemo(() => {
    const map = new Map<string, { name: string; plays: number; cashes: number; wins: number }>()
    for (const e of entries) {
      const p = players.find((x) => x.id === e.playerId)
      if (!p || p.venueId !== venueId) continue
      const cur = map.get(p.id) ?? { name: p.name, plays: 0, cashes: 0, wins: 0 }
      cur.plays += 1
      if (e.eliminationRank && e.eliminationRank <= 3) cur.cashes += 1
      if (e.eliminationRank === 1) cur.wins += 1
      map.set(p.id, cur)
    }
    return [...map.values()].sort((a, b) => b.plays - a.plays).slice(0, 20)
  }, [entries, players, venueId])

  const levelElims = useMemo(() => {
    const map = new Map<number, number>()
    for (const e of eliminations.filter((x) => x.tournamentId === selectedTournamentId && !x.deletedAt)) {
      map.set(e.levelNumber, (map.get(e.levelNumber) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [eliminations, selectedTournamentId])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">기록과 통계</h1>
          <p className="text-sm text-mute">토너먼트 종료 기록 및 매장 통계</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button
            onClick={() => {
              const rows = tournaments.map((t) => ({
                이름: t.name,
                날짜: t.date,
                상태: t.status,
                바이인: t.buyIn,
              }))
              downloadText('tournaments.csv', toCsv(rows))
            }}
          >
            CSV
          </Button>
          <Button onClick={() => window.print()}>결과 인쇄</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="토너먼트 수" value={stats.tournamentCount} />
        <Stat label="평균 참가자" value={stats.avgPlayers} />
        <Stat label="총 엔트리" value={stats.totalEntries} />
        <Stat label="총 바이인" value={formatMoney(stats.totalBuyIns)} />
        <Stat label="총 상금" value={formatMoney(stats.totalPrize)} accent />
        <Stat
          label="재참가율"
          value={`${playerStats.length ? Math.round((playerStats.filter((p) => p.plays > 1).length / playerStats.length) * 100) : 0}%`}
        />
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">선택 토너먼트 결과</h2>
        {bundle.tournament ? (
          <div className="space-y-2 text-sm">
            <div className="text-lg font-medium">{bundle.tournament.name}</div>
            <div>참가자 {bundle.entries.length} / 남은 {bundle.remaining}</div>
            <div>총 상금 {formatMoney(bundle.pool?.netPrizePool ?? 0)}</div>
            <div>
              리바이 {bundle.entries.reduce((s, e) => s + e.rebuyCount, 0)} / 리엔트리{' '}
              {bundle.entries.reduce((s, e) => s + e.reentryCount, 0)} / 애드온{' '}
              {bundle.entries.reduce((s, e) => s + e.addonCount, 0)}
            </div>
            <div className="mt-3">
              <div className="mb-1 font-medium">최종 순위</div>
              {bundle.entries
                .filter((e) => e.eliminationRank)
                .sort((a, b) => (a.eliminationRank ?? 99) - (b.eliminationRank ?? 99))
                .slice(0, 15)
                .map((e) => (
                  <div key={e.id} className="flex justify-between">
                    <span>
                      {e.eliminationRank}위 {getEntryName(e.id)}
                    </span>
                    <span className="text-mute">{e.status}</span>
                  </div>
                ))}
            </div>
            <div className="mt-3">
              <div className="mb-1 font-medium">레벨별 탈락</div>
              {levelElims.map(([lv, count]) => (
                <div key={lv}>
                  Lv {lv}: {count}명
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-mute">토너먼트 없음</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">참가자별 기록</h2>
        <div className="space-y-1 text-sm">
          {playerStats.map((p) => (
            <div key={p.name} className="flex justify-between rounded-lg bg-felt-2 px-3 py-2">
              <span>{p.name}</span>
              <span className="text-mute">
                참가 {p.plays} · 입상 {p.cashes} · 우승 {p.wins}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">칩 리더 / 최저 스택</h2>
        <div className="text-sm">
          <div>
            칩 리더: {bundle.chipLeader?.name ?? '-'} ({formatNumber(bundle.chipLeader?.chips ?? 0)})
          </div>
          <div>
            최저 스택: {bundle.lowStack?.name ?? '-'} ({formatNumber(bundle.lowStack?.chips ?? 0)})
          </div>
          <div>총 발행 칩(추정): {formatNumber(bundle.totalChips)}</div>
        </div>
      </Card>
    </div>
  )
}
