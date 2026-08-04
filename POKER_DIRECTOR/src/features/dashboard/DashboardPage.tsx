import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { Button } from '@/components/ui/Button'
import { Card, Stat } from '@/components/ui/Card'
import { formatMoney, formatNumber, todayDateString } from '@/utils/time'
import { t } from '@/i18n'

export function DashboardPage() {
  const navigate = useNavigate()
  const tournaments = useAppStore((s) => s.tournaments)
  const selectTournament = useAppStore((s) => s.selectTournament)
  const venueId = useAppStore((s) => s.session?.currentVenueId)
  const today = todayDateString()
  const venueTournaments = tournaments.filter((x) => x.venueId === venueId)
  const running = venueTournaments.filter((x) => x.status === 'running' || x.status === 'final_table')
  const scheduled = venueTournaments.filter(
    (x) => (x.status === 'scheduled' || x.status === 'draft' || x.status === 'registration') && x.date === today,
  )
  const completed = venueTournaments.filter((x) => x.status === 'completed' && x.date === today)
  const selectedId =
    useAppStore((s) => s.selectedTournamentId) ?? running[0]?.id ?? venueTournaments[0]?.id
  const bundle = useTournamentBundle(selectedId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{t('dashboard')}</h1>
          <p className="text-sm text-mute">현장 운영 현황을 한눈에 확인하세요.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="gold" onClick={() => navigate('/tournaments/new')}>
            {t('createTournament')}
          </Button>
          <Button onClick={() => navigate('/money')}>금액 설정</Button>
          <Button onClick={() => navigate('/help')}>사용 설명서</Button>
          <Button onClick={() => navigate('/players')}>{t('quickRegister')}</Button>
          {selectedId ? (
            <>
              <Button
                onClick={() =>
                  window.open(
                    `${window.location.pathname}${window.location.search}#/display/tournament/${selectedId}`,
                    '_blank',
                  )
                }
              >
                {t('openTv')}
              </Button>
              <Button
                variant="gold"
                onClick={() =>
                  window.open(
                    `${window.location.pathname}${window.location.search}#/display/buyins/${selectedId}`,
                    '_blank',
                  )
                }
              >
                바인 체크판
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="진행 중" value={running.length} accent />
        <Stat label="오늘 예정" value={scheduled.length} />
        <Stat label="오늘 종료" value={completed.length} />
        <Stat label="현재 참가자" value={bundle.entries.length} />
        <Stat label="남은 플레이어" value={bundle.remaining} accent />
        <Stat label="사용 테이블" value={bundle.activeTables} />
        <Stat label="총 상금" value={formatMoney(bundle.pool?.netPrizePool ?? 0)} />
        <Stat label="평균 스택" value={formatNumber(bundle.avgStack)} />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">선택 토너먼트</h2>
          <select
            className="min-h-11 rounded-xl border border-line bg-felt-2 px-3 text-sm"
            value={selectedId ?? ''}
            onChange={(e) => selectTournament(e.target.value)}
          >
            {venueTournaments.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} ({x.status})
              </option>
            ))}
          </select>
        </div>
        {bundle.tournament ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="pd-title text-3xl text-gold">{bundle.tournament.name}</div>
              <p className="mt-1 text-sm text-mute">
                {bundle.tournament.date} {bundle.tournament.startTime} · {bundle.tournament.location}
              </p>
              {bundle.live ? (
                <p className="pd-num mt-3 text-lg">
                  Lv {bundle.live.levelNumber} · {bundle.live.currentLevel?.isBreak ? 'BREAK' : `${bundle.live.currentLevel?.smallBlind}/${bundle.live.currentLevel?.bigBlind}`}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 self-end">
              <Button onClick={() => navigate('/timer')}>타이머</Button>
              <Button onClick={() => navigate('/tables')}>테이블</Button>
              <Link className="min-h-12 rounded-xl bg-panel-2 px-4 py-3 text-sm" to={`/tournaments/${bundle.tournament.id}`}>
                상세
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-mute">토너먼트가 없습니다.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">최근 토너먼트 기록</h2>
        <div className="space-y-2">
          {venueTournaments.slice(0, 6).map((x) => (
            <button
              key={x.id}
              className="flex w-full items-center justify-between rounded-xl border border-line/60 bg-felt-2 px-3 py-3 text-left"
              onClick={() => {
                selectTournament(x.id)
                navigate(`/tournaments/${x.id}`)
              }}
            >
              <div>
                <div className="font-medium">{x.name}</div>
                <div className="text-xs text-mute">
                  {x.date} {x.startTime}
                </div>
              </div>
              <div className="text-sm text-gold">{x.status}</div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
