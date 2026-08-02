import { useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { useTimerAlerts } from '@/hooks/useTimerAlerts'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Label } from '@/components/ui/Input'
import { formatDuration, formatNumber } from '@/utils/time'

export function TimerPage() {
  const tournamentId = useAppStore((s) => s.selectedTournamentId)
  const bundle = useTournamentBundle(tournamentId)
  useTimerAlerts(tournamentId)
  const canManage = useAppStore((s) => s.canManageTimer())
  const timerStart = useAppStore((s) => s.timerStart)
  const timerPause = useAppStore((s) => s.timerPause)
  const timerResume = useAppStore((s) => s.timerResume)
  const timerStop = useAppStore((s) => s.timerStop)
  const timerNext = useAppStore((s) => s.timerNext)
  const timerPrev = useAppStore((s) => s.timerPrev)
  const timerExtend = useAppStore((s) => s.timerExtend)
  const timerSetRemaining = useAppStore((s) => s.timerSetRemaining)
  const timerGoTo = useAppStore((s) => s.timerGoTo)
  const timerToggleMute = useAppStore((s) => s.timerToggleMute)
  const [minutes, setMinutes] = useState('12')

  if (!tournamentId || !bundle.tournament || !bundle.live || !bundle.timer) {
    return <p className="text-mute">선택된 토너먼트가 없습니다.</p>
  }

  const level = bundle.live.currentLevel
  const next = bundle.live.nextLevel

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">블라인드 타이머</h1>
          <p className="text-sm text-mute">{bundle.tournament.name}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => window.open(`/display/tournament/${tournamentId}`, '_blank')}
        >
          전체 화면 TV
        </Button>
      </div>

      <Card className="border-gold/30 bg-gradient-to-b from-panel to-felt-2 text-center">
        <div className="text-sm text-mute">
          LEVEL {bundle.live.levelNumber}
          {level?.isBreak ? ' · BREAK' : ''}
          {bundle.live.status === 'running' ? <span className="pd-live ml-2 text-ok">● LIVE</span> : null}
        </div>
        <div className="pd-num mt-2 text-6xl text-gold sm:text-7xl">
          {formatDuration(bundle.live.remainingMs)}
        </div>
        <div className="pd-num mt-4 text-3xl sm:text-4xl">
          {level?.isBreak
            ? 'BREAK'
            : `${formatNumber(level?.smallBlind ?? 0)} / ${formatNumber(level?.bigBlind ?? 0)}`}
        </div>
        {!level?.isBreak ? (
          <div className="mt-2 text-sm text-mute">
            Ante {formatNumber(level?.ante ?? 0)} · BB Ante {formatNumber(level?.bigBlindAnte ?? 0)}
          </div>
        ) : null}
        <div className="mt-3 text-sm text-mute">
          NEXT:{' '}
          {next
            ? next.isBreak
              ? `BREAK ${next.breakMinutes ?? next.durationMinutes}m`
              : `${formatNumber(next.smallBlind)} / ${formatNumber(next.bigBlind)}`
            : '-'}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-mute">남음</div>
            <div className="pd-num text-lg">{bundle.remaining}</div>
          </div>
          <div>
            <div className="text-mute">엔트리</div>
            <div className="pd-num text-lg">{bundle.entries.length}</div>
          </div>
          <div>
            <div className="text-mute">평균</div>
            <div className="pd-num text-lg">{formatNumber(bundle.avgStack)}</div>
          </div>
        </div>
      </Card>

      {canManage ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              variant="gold"
              size="lg"
              onClick={() =>
                bundle.timer?.status === 'running'
                  ? timerPause(tournamentId)
                  : bundle.timer?.status === 'paused'
                    ? timerResume(tournamentId)
                    : timerStart(tournamentId)
              }
            >
              {bundle.timer.status === 'running'
                ? '일시정지'
                : bundle.timer.status === 'paused'
                  ? '재개'
                  : '시작'}
            </Button>
            <Button size="lg" onClick={() => timerNext(tournamentId)}>
              다음 레벨
            </Button>
            <Button size="lg" onClick={() => timerPrev(tournamentId)}>
              이전 레벨
            </Button>
            <Button size="lg" variant="danger" onClick={() => timerStop(tournamentId)}>
              정지
            </Button>
          </div>

          <Card className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button onClick={() => timerExtend(tournamentId, 1)}>+1분</Button>
              <Button onClick={() => timerExtend(tournamentId, 5)}>+5분</Button>
              <Button onClick={() => timerToggleMute(tournamentId)}>
                {bundle.timer.muted ? '알림 켜기' : '음소거'}
              </Button>
              <Button onClick={() => timerStart(tournamentId)}>초기화 후 시작</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div>
                <Label>남은 시간(분) 직접 수정</Label>
                <Input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" />
              </div>
              <Button
                className="self-end"
                onClick={() => timerSetRemaining(tournamentId, Number(minutes) * 60 * 1000)}
              >
                적용
              </Button>
            </div>
            <div>
              <Label>특정 레벨로 이동</Label>
              <select
                className="min-h-12 w-full rounded-xl border border-line bg-felt-2 px-3"
                value={bundle.timer.currentLevelIndex}
                onChange={(e) => timerGoTo(tournamentId, Number(e.target.value))}
              >
                {bundle.structure?.levels.map((l, idx) => (
                  <option key={l.id} value={idx}>
                    Lv {l.levelNumber}{' '}
                    {l.isBreak ? 'BREAK' : `${l.smallBlind}/${l.bigBlind}`} ({l.durationMinutes}m)
                  </option>
                ))}
              </select>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <p className="text-sm text-mute">조회 전용 계정입니다. 타이머 조작은 관리자/디렉터만 가능합니다.</p>
        </Card>
      )}
    </div>
  )
}
