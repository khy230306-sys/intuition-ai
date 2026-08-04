import { useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import type { AnnouncementType, StaffRequestType } from '@/types'

export function AnnouncementsPage() {
  const tournamentId = useAppStore((s) => s.selectedTournamentId)
  const announcements = useAppStore((s) =>
    s.announcements.filter((a) => a.tournamentId === tournamentId),
  )
  const staffRequests = useAppStore((s) =>
    s.staffRequests.filter((r) => r.tournamentId === tournamentId),
  )
  const tables = useAppStore((s) => s.tables.filter((t) => t.tournamentId === tournamentId))
  const addAnnouncement = useAppStore((s) => s.addAnnouncement)
  const createStaffRequest = useAppStore((s) => s.createStaffRequest)
  const resolveStaffRequest = useAppStore((s) => s.resolveStaffRequest)
  const [type, setType] = useState<AnnouncementType>('general')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [reqType, setReqType] = useState<StaffRequestType>('director')
  const [reqMsg, setReqMsg] = useState('')
  const [reqTable, setReqTable] = useState('')

  if (!tournamentId) return <p className="text-mute">선택된 토너먼트가 없습니다.</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">공지와 호출</h1>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">전체 공지</h2>
        <Select value={type} onChange={(e) => setType(e.target.value as AnnouncementType)}>
          <option value="general">일반 공지</option>
          <option value="registration_close">등록 마감</option>
          <option value="break">브레이크</option>
          <option value="seat_move">좌석 이동</option>
          <option value="final_table">파이널 테이블</option>
          <option value="prize">상금 안내</option>
          <option value="urgent">긴급 공지</option>
        </Select>
        <div>
          <Label>제목</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>내용</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        </div>
        <Button
          variant="gold"
          onClick={() => {
            if (!title || !body) return
            addAnnouncement(tournamentId, type, title, body)
            setTitle('')
            setBody('')
          }}
        >
          공지 등록
        </Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">딜러 호출</h2>
        <Select value={reqType} onChange={(e) => setReqType(e.target.value as StaffRequestType)}>
          <option value="director">디렉터 호출</option>
          <option value="floor">플로어 호출</option>
          <option value="chips">칩 요청</option>
          <option value="cards">카드 교체 요청</option>
          <option value="seat_check">자리 확인 요청</option>
          <option value="other">기타 요청</option>
        </Select>
        <Select value={reqTable} onChange={(e) => setReqTable(e.target.value)}>
          <option value="">테이블 선택</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              테이블 {t.number}
            </option>
          ))}
        </Select>
        <Textarea
          value={reqMsg}
          onChange={(e) => setReqMsg(e.target.value)}
          placeholder="요청 내용"
          rows={2}
        />
        <Button
          onClick={() => {
            createStaffRequest(tournamentId, reqType, reqMsg || reqType, reqTable || undefined)
            setReqMsg('')
          }}
        >
          요청 보내기
        </Button>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">공지 목록</h2>
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl bg-felt-2 p-3 text-sm">
              <div className="font-medium">
                [{a.type}] {a.title}
              </div>
              <div className="text-mute">{a.body}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">호출 목록</h2>
        <div className="space-y-2">
          {staffRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-felt-2 p-3 text-sm">
              <div>
                <div className="font-medium">
                  {r.type} · {r.status}
                </div>
                <div className="text-mute">{r.message}</div>
              </div>
              {r.status === 'open' ? (
                <Button size="sm" onClick={() => resolveStaffRequest(r.id)}>
                  처리
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
