import { useParams } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { useTimerAlerts } from '@/hooks/useTimerAlerts'
import { Card } from '@/components/ui/Card'
import { formatDuration, formatMoney, formatNumber } from '@/utils/time'

export function PlayerViewPage() {
  const { accessCode } = useParams()
  const entry = useAppStore((s) => s.entries.find((e) => e.accessCode === accessCode && !e.deletedAt))
  const player = useAppStore((s) => s.players.find((p) => p.id === entry?.playerId))
  const table = useAppStore((s) => s.tables.find((t) => t.id === entry?.currentTableId))
  const bundle = useTournamentBundle(entry?.tournamentId)
  useTimerAlerts(entry?.tournamentId)
  const movements = useAppStore((s) =>
    s.movements.filter((m) => m.entryId === entry?.id).slice(0, 3),
  )

  if (!entry || !player || !bundle.tournament) {
    return (
      <div className="pd-safe grid min-h-dvh place-items-center">
        <p className="text-mute">유효하지 않은 참가 코드입니다.</p>
      </div>
    )
  }

  const level = bundle.live?.currentLevel
  const next = bundle.live?.nextLevel
  const inMoney = (bundle.prize?.payouts.length ?? 0) > 0 && (entry.eliminationRank ?? 999) <= (bundle.prize?.payouts.length ?? 0)

  return (
    <div className="pd-safe mx-auto min-h-dvh max-w-lg space-y-4 px-3 py-4">
      <div>
        <div className="pd-title text-3xl text-gold">POKER DIRECTOR</div>
        <p className="text-sm text-mute">플레이어 조회</p>
      </div>

      <Card>
        <div className="text-2xl font-semibold">{player.nickname || player.name}</div>
        <div className="mt-1 text-sm text-mute">{bundle.tournament.name}</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-mute">테이블</div>
            <div className="text-xl">{table?.number ?? '-'}</div>
          </div>
          <div>
            <div className="text-xs text-mute">좌석</div>
            <div className="text-xl">{entry.currentSeat ?? '-'}</div>
          </div>
          <div>
            <div className="text-xs text-mute">현재 블라인드</div>
            <div className="pd-num">
              {level?.isBreak ? 'BREAK' : `${level?.smallBlind}/${level?.bigBlind}`}
            </div>
          </div>
          <div>
            <div className="text-xs text-mute">남은 시간</div>
            <div className="pd-num text-gold">
              {formatDuration(bundle.live?.remainingMs ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-mute">다음 블라인드</div>
            <div className="pd-num">
              {next?.isBreak ? 'BREAK' : next ? `${next.smallBlind}/${next.bigBlind}` : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-mute">평균 스택</div>
            <div className="pd-num">{formatNumber(bundle.avgStack)}</div>
          </div>
          <div>
            <div className="text-xs text-mute">남은 플레이어</div>
            <div className="pd-num">{bundle.remaining}</div>
          </div>
          <div>
            <div className="text-xs text-mute">내 순위/상태</div>
            <div>
              {entry.status === 'eliminated'
                ? `${entry.eliminationRank}위`
                : entry.status}
            </div>
          </div>
        </div>
        <div className="mt-3 text-sm">
          상금권: {inMoney || (entry.status !== 'eliminated' && bundle.remaining <= (bundle.prize?.payouts.length ?? 3))
            ? '상금권 인근/진입'
            : '미진입'}
        </div>
        <div className="mt-1 text-sm text-mute">
          총 상금 {formatMoney(bundle.pool?.netPrizePool ?? 0)}
        </div>
      </Card>

      {movements[0] ? (
        <Card className="border-gold/40">
          <div className="font-semibold">이동 안내</div>
          <p className="mt-2">
            {player.name}님은{' '}
            {bundle.tables.find((t) => t.id === movements[0]?.toTableId)?.number}번 테이블{' '}
            {movements[0]?.toSeat}번 좌석으로 이동하십시오.
          </p>
        </Card>
      ) : null}

      {bundle.announcements[0] ? (
        <Card>
          <div className="font-semibold">공지사항</div>
          <p className="mt-2 text-sm">{bundle.announcements[0].body}</p>
        </Card>
      ) : null}

      <p className="text-center text-xs text-mute">다른 참가자의 개인정보는 표시되지 않습니다.</p>
    </div>
  )
}
