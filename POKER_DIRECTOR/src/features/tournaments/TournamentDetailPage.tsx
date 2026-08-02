import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatMoney, formatNumber } from '@/utils/time'

export function TournamentDetailPage() {
  const { id } = useParams()
  const bundle = useTournamentBundle(id)
  const selectTournament = useAppStore((s) => s.selectTournament)
  const startTournament = useAppStore((s) => s.startTournament)
  const endTournament = useAppStore((s) => s.endTournament)
  const finalizeWinner = useAppStore((s) => s.finalizeWinner)
  const getEntryName = useAppStore((s) => s.getEntryName)

  useEffect(() => {
    if (id) selectTournament(id)
  }, [id, selectTournament])

  if (!bundle.tournament) return <p className="text-mute">토너먼트를 찾을 수 없습니다.</p>

  const t = bundle.tournament

  const leaders = bundle.entries
    .filter((e) => e.status === 'seated')
    .sort((a, b) => b.currentChips - a.currentChips)

  return (
    <div className="space-y-4">
      <div>
        <div className="pd-title text-3xl text-gold">{t.name}</div>
        <p className="text-sm text-mute">
          {t.date} {t.startTime} · {t.location} · {t.status}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => startTournament(t.id)}>시작</Button>
        <Button variant="danger" onClick={() => endTournament(t.id)}>
          종료
        </Button>
        <Link className="min-h-12 rounded-xl bg-panel-2 px-4 py-3 text-sm" to={`/tournaments/${t.id}/blinds`}>
          블라인드 편집
        </Link>
        <Link className="min-h-12 rounded-xl bg-panel-2 px-4 py-3 text-sm" to="/money">
          금액 설정
        </Link>
        <Link className="min-h-12 rounded-xl bg-panel-2 px-4 py-3 text-sm" to="/payouts">
          상금 계산
        </Link>
        <Button
          onClick={() =>
            window.open(
              `${window.location.pathname}${window.location.search}#/display/tournament/${t.id}`,
              '_blank',
            )
          }
        >
          TV (왼쪽)
        </Button>
        <Button
          variant="gold"
          onClick={() =>
            window.open(
              `${window.location.pathname}${window.location.search}#/display/buyins/${t.id}`,
              '_blank',
            )
          }
        >
          바인 체크 (오른쪽)
        </Button>
        {leaders[0] ? (
          <Button variant="gold" onClick={() => finalizeWinner(t.id, leaders[0].id)}>
            우승자 확정 ({getEntryName(leaders[0].id)})
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <div className="text-xs text-mute">참가자</div>
          <div className="pd-num text-2xl">{bundle.entries.length}</div>
        </Card>
        <Card>
          <div className="text-xs text-mute">남음</div>
          <div className="pd-num text-2xl">{bundle.remaining}</div>
        </Card>
        <Card>
          <div className="text-xs text-mute">시작 스택</div>
          <div className="pd-num text-2xl">{formatNumber(t.startingStack)}</div>
        </Card>
        <Card>
          <div className="text-xs text-mute">총 상금</div>
          <div className="pd-num text-2xl text-gold">{formatMoney(bundle.pool?.netPrizePool ?? 0)}</div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">설정 요약</h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>포맷: {t.format}</div>
          <div>
            바이인 {formatMoney(t.buyIn)} / 참가비 {formatMoney(t.fee)}
          </div>
          <div>
            리바이 {t.rebuy.enabled ? 'ON' : 'OFF'} · 리엔트리 {t.reentry.enabled ? 'ON' : 'OFF'} · 애드온{' '}
            {t.addon.enabled ? 'ON' : 'OFF'}
          </div>
          <div>
            테이블 {t.tableCount} × {t.seatsPerTable}
          </div>
          <div className="sm:col-span-2">{t.description}</div>
        </div>
      </Card>
    </div>
  )
}
