import { useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { useTimerAlerts } from '@/hooks/useTimerAlerts'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Label } from '@/components/ui/Input'
import {
  durationPartsToMs,
  formatDuration,
  formatNumber,
  parseDurationInput,
  splitDuration,
} from '@/utils/time'

export function TimerPage() {
  const tournamentId = useAppStore((s) => s.selectedTournamentId)
  const bundle = useTournamentBundle(tournamentId)
  useTimerAlerts(tournamentId)
  const canManage = useAppStore((s) => s.canManageTimer())
  const timerStart = useAppStore((s) => s.timerStart)
  const timerPause = useAppStore((s) => s.timerPause)
  const timerStop = useAppStore((s) => s.timerStop)
  const timerNext = useAppStore((s) => s.timerNext)
  const timerPrev = useAppStore((s) => s.timerPrev)
  const timerExtend = useAppStore((s) => s.timerExtend)
  const timerSetRemaining = useAppStore((s) => s.timerSetRemaining)
  const timerResetLevel = useAppStore((s) => s.timerResetLevel)
  const timerGoTo = useAppStore((s) => s.timerGoTo)
  const timerToggleMute = useAppStore((s) => s.timerToggleMute)

  const remainingMs = bundle.live?.remainingMs ?? 0
  const liveParts = splitDuration(remainingMs)
  const liveMinutes = String(liveParts.minutes + liveParts.hours * 60)
  const liveSeconds = String(liveParts.seconds).padStart(2, '0')
  const liveText = formatDuration(remainingMs)

  const [draftMinutes, setDraftMinutes] = useState<string | null>(null)
  const [draftSeconds, setDraftSeconds] = useState<string | null>(null)
  const [draftText, setDraftText] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const editMinutes = draftMinutes ?? liveMinutes
  const editSeconds = draftSeconds ?? liveSeconds
  const editText = draftText ?? liveText

  if (!tournamentId || !bundle.tournament || !bundle.live || !bundle.timer) {
    return <p className="text-mute">선택된 토너먼트가 없습니다.</p>
  }

  const level = bundle.live.currentLevel
  const next = bundle.live.nextLevel

  const applyMs = (ms: number | null, label = '시간 적용') => {
    if (ms == null || Number.isNaN(ms) || ms < 0) {
      setMessage('시간 형식이 올바르지 않습니다. 예: 12:30 또는 분/초 입력')
      return
    }
    const safe = Math.min(ms, 10 * 60 * 60 * 1000)
    timerSetRemaining(tournamentId, safe)
    setDraftMinutes(null)
    setDraftSeconds(null)
    setDraftText(null)
    setMessage(`${label}: ${formatDuration(safe)}`)
  }

  const applyParts = () => {
    applyMs(durationPartsToMs(Number(editMinutes), Number(editSeconds)), '분/초 적용')
  }

  const applyText = () => {
    applyMs(parseDurationInput(editText), '시간 적용')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">블라인드 타이머</h1>
          <p className="text-sm text-mute">{bundle.tournament.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              window.open(
                `${window.location.pathname}${window.location.search}#/display/tournament/${tournamentId}`,
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
                `${window.location.pathname}${window.location.search}#/display/buyins/${tournamentId}`,
                '_blank',
              )
            }
          >
            바인 체크 (오른쪽)
          </Button>
        </div>
      </div>

      <Card className="border-gold/30 bg-gradient-to-b from-panel to-felt-2 text-center">
        <div className="text-sm text-mute">
          LEVEL {bundle.live.levelNumber}
          {level?.isBreak ? ' · BREAK' : ''}
          {bundle.live.status === 'running' ? (
            <span className="pd-live ml-2 text-ok">● LIVE</span>
          ) : null}
        </div>
        <button
          type="button"
          className="pd-num mt-2 w-full text-6xl text-gold sm:text-7xl"
          onClick={() => {
            if (!canManage) return
            setDraftText(liveText)
            setDraftMinutes(liveMinutes)
            setDraftSeconds(liveSeconds)
            setMessage('아래에서 남은 시간을 수정한 뒤 적용하세요.')
          }}
          title={canManage ? '탭하여 시간 수정' : undefined}
        >
          {formatDuration(bundle.live.remainingMs)}
        </button>
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
              onClick={() => {
                if (bundle.timer?.status === 'running') {
                  timerPause(tournamentId)
                  return
                }
                // paused / idle / stopped → start or resume
                timerStart(tournamentId)
              }}
            >
              {bundle.timer.status === 'running' ? '일시정지' : '시작'}
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
            <h2 className="font-semibold">시간 조절</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button onClick={() => timerExtend(tournamentId, 1)}>+1분</Button>
              <Button onClick={() => timerExtend(tournamentId, 5)}>+5분</Button>
              <Button onClick={() => timerExtend(tournamentId, -1)}>-1분</Button>
              <Button onClick={() => timerExtend(tournamentId, -5)}>-5분</Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="edit-min">분</Label>
                <Input
                  id="edit-min"
                  inputMode="numeric"
                  value={editMinutes}
                  onChange={(e) => setDraftMinutes(e.target.value.replace(/[^\d]/g, ''))}
                />
              </div>
              <div>
                <Label htmlFor="edit-sec">초</Label>
                <Input
                  id="edit-sec"
                  inputMode="numeric"
                  value={editSeconds}
                  onChange={(e) =>
                    setDraftSeconds(e.target.value.replace(/[^\d]/g, '').slice(0, 2))
                  }
                />
              </div>
            </div>
            <Button variant="gold" block onClick={applyParts}>
              분/초 적용
            </Button>

            <div>
              <Label htmlFor="edit-text">남은 시간 직접 입력 (예: 12:30, 8분, 90초)</Label>
              <Input
                id="edit-text"
                value={editText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyText()
                  }
                }}
                placeholder="12:30"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={applyText}>입력값 적용</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  timerResetLevel(tournamentId)
                  setDraftMinutes(null)
                  setDraftSeconds(null)
                  setDraftText(null)
                  setMessage('현재 레벨 시간으로 초기화했습니다.')
                }}
              >
                레벨 시간 초기화
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => timerToggleMute(tournamentId)}>
                {bundle.timer.muted ? '알림 켜기' : '음소거'}
              </Button>
              <Button
                onClick={() => {
                  timerResetLevel(tournamentId)
                  timerStart(tournamentId)
                  setDraftMinutes(null)
                  setDraftSeconds(null)
                  setDraftText(null)
                  setMessage('초기화 후 시작했습니다.')
                }}
              >
                초기화 후 시작
              </Button>
            </div>

            {message ? <p className="text-sm text-gold">{message}</p> : null}

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
          <p className="text-sm text-mute">
            조회 전용 계정입니다. 타이머 조작은 관리자/디렉터만 가능합니다.
          </p>
        </Card>
      )}
    </div>
  )
}
