import { useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { formatNumber } from '@/utils/time'

export function StaffPage() {
  const tournamentId = useAppStore((s) => s.selectedTournamentId)
  const bundle = useTournamentBundle(tournamentId)
  const getEntryName = useAppStore((s) => s.getEntryName)
  const eliminatePlayer = useAppStore((s) => s.eliminatePlayer)
  const updateChips = useAppStore((s) => s.updateChips)
  const createStaffRequest = useAppStore((s) => s.createStaffRequest)
  const [tableId, setTableId] = useState(bundle.tables[0]?.id ?? '')
  const myTable = bundle.tables.find((t) => t.id === tableId) ?? bundle.tables[0]
  const seated = bundle.entries.filter((e) => e.currentTableId === myTable?.id && e.status === 'seated')

  if (!tournamentId || !myTable) return <p className="text-mute">담당 테이블이 없습니다.</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">스태프 / 딜러</h1>
        <p className="text-sm text-mute">담당 테이블 조회 및 현장 보고</p>
      </div>

      <Card>
        <Label>담당 테이블</Label>
        <Select
          value={myTable.id}
          onChange={(e) => setTableId(e.target.value)}
        >
          {bundle.tables.map((t) => (
            <option key={t.id} value={t.id}>
              테이블 {t.number}
            </option>
          ))}
        </Select>
      </Card>

      <Card>
        <div className="mb-2 text-lg font-semibold">테이블 {myTable.number}</div>
        <div className="mb-3 text-sm text-mute">
          {seated.length}/{myTable.maxSeats} · 버튼 #{myTable.dealerButtonSeat}
        </div>
        <div className="space-y-2">
          {seated.map((e) => (
            <div key={e.id} className="rounded-xl bg-felt-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    #{e.currentSeat} {getEntryName(e.id)}
                  </div>
                  <div className="text-xs text-mute">{e.status}</div>
                </div>
                <Button size="sm" variant="danger" onClick={() => eliminatePlayer({ entryId: e.id })}>
                  탈락 신고
                </Button>
              </div>
              <div className="mt-2">
                <Label>칩 카운트</Label>
                <Input
                  type="number"
                  value={e.currentChips}
                  onChange={(ev) => updateChips(e.id, Number(ev.target.value) || 0)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">디렉터 호출</h2>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['director', '디렉터 호출'],
              ['chips', '칩 요청'],
              ['cards', '카드 교체'],
              ['seat_check', '자리 확인'],
            ] as const
          ).map(([type, label]) => (
            <Button
              key={type}
              onClick={() => createStaffRequest(tournamentId, type, label, myTable.id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-mute">현재 평균 스택 {formatNumber(bundle.avgStack)}</p>
      </Card>
    </div>
  )
}
