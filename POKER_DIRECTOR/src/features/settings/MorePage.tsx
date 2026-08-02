import { Link } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { isCloudMode } from '@/services/supabase/client'
import { downloadText } from '@/utils/csv'

const links = [
  { to: '/help', label: '사용 설명서' },
  { to: '/tournaments/new', label: '새 토너먼트' },
  { to: '/money', label: '게임 금액 설정' },
  { to: '/payouts', label: '상금 계산' },
  { to: '/announcements', label: '공지 / 호출' },
  { to: '/reports', label: '기록 / 통계' },
  { to: '/staff', label: '스태프 화면' },
  { to: '/settings', label: '시스템 설정' },
]

export function MorePage() {
  const selectedTournamentId = useAppStore((s) => s.selectedTournamentId)
  const backupJson = useAppStore((s) => s.backupJson)
  const restoreJson = useAppStore((s) => s.restoreJson)
  const resetDemo = useAppStore((s) => s.resetDemo)
  const syncCloud = useAppStore((s) => s.syncCloud)
  const syncConflict = useAppStore((s) => s.syncConflict)
  const auditLogs = useAppStore((s) => s.auditLogs)
  const undoLast = useAppStore((s) => s.undoLast)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">더보기</h1>
        <p className="text-sm text-mute">운영 도구와 설정</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="min-h-14 rounded-2xl border border-line bg-panel px-4 py-4 font-medium"
          >
            {l.label}
          </Link>
        ))}
        {selectedTournamentId ? (
          <>
            <Link
              to={`/tournaments/${selectedTournamentId}/blinds`}
              className="min-h-14 rounded-2xl border border-line bg-panel px-4 py-4 font-medium"
            >
              블라인드 편집
            </Link>
            <a
              href={`#/display/tournament/${selectedTournamentId}`}
              target="_blank"
              rel="noreferrer"
              className="min-h-14 rounded-2xl border border-line bg-panel px-4 py-4 font-medium"
            >
              TV 화면 열기 (왼쪽)
            </a>
            <a
              href={`#/display/buyins/${selectedTournamentId}`}
              target="_blank"
              rel="noreferrer"
              className="min-h-14 rounded-2xl border border-gold/40 bg-panel px-4 py-4 font-medium text-gold-soft"
            >
              바인 체크판 열기 (오른쪽)
            </a>
          </>
        ) : null}
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">데이터 / 동기화</h2>
        <p className="text-sm text-mute">
          현재 모드: {isCloudMode() ? '클라우드' : '로컬 데모'} (IndexedDB + localStorage)
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => downloadText('poker-director-backup.json', backupJson(), 'application/json')}
          >
            백업 내보내기
          </Button>
          <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border border-line px-4">
            백업 복구
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                restoreJson(await file.text())
              }}
            />
          </label>
          <Button variant="danger" onClick={() => void resetDemo()}>
            데모 데이터 초기화
          </Button>
          <Button onClick={() => void syncCloud()}>클라우드 동기화</Button>
          <Button onClick={() => undoLast()}>Undo</Button>
        </div>
        {syncConflict ? (
          <div className="rounded-xl border border-danger/40 p-3 text-sm">
            <p>동기화 충돌이 감지되었습니다.</p>
            <p className="text-mute">로컬: {syncConflict.localSummary}</p>
            <p className="text-mute">원격: {syncConflict.remoteSummary}</p>
            <div className="mt-2 flex gap-2">
              <Button onClick={() => void syncCloud('local')}>로컬 사용</Button>
              <Button onClick={() => void syncCloud('remote')}>원격 사용</Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">최근 작업 기록</h2>
        <div className="max-h-80 space-y-2 overflow-auto">
          {auditLogs.slice(0, 30).map((log) => (
            <div key={log.id} className="rounded-xl bg-felt-2 px-3 py-2 text-sm">
              <div>{log.summary}</div>
              <div className="text-xs text-mute">
                {new Date(log.createdAt).toLocaleString('ko-KR')} · {log.action}
                {log.undone ? ' · undone' : ''}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
