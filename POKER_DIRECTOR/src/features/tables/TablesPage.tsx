import { useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Label, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatNumber } from '@/utils/time'

export function TablesPage() {
  const tournamentId = useAppStore((s) => s.selectedTournamentId)
  const bundle = useTournamentBundle(tournamentId)
  const addTable = useAppStore((s) => s.addTable)
  const setTableStatus = useAppStore((s) => s.setTableStatus)
  const rotateDealer = useAppStore((s) => s.rotateDealer)
  const movePlayer = useAppStore((s) => s.movePlayer)
  const swapSeats = useAppStore((s) => s.swapSeats)
  const suggestBalancing = useAppStore((s) => s.suggestBalancing)
  const applyBalancing = useAppStore((s) => s.applyBalancing)
  const suggestBreak = useAppStore((s) => s.suggestBreak)
  const applyBreak = useAppStore((s) => s.applyBreak)
  const balanceSuggestions = useAppStore((s) => s.balanceSuggestions)
  const breakPlan = useAppStore((s) => s.breakPlan)
  const getEntryName = useAppStore((s) => s.getEntryName)
  const drawFinalTable = useAppStore((s) => s.drawFinalTable)
  const confirmSeating = useAppStore((s) => s.confirmSeating)
  const updateChips = useAppStore((s) => s.updateChips)

  const [moveEntry, setMoveEntry] = useState<string | null>(null)
  const [toTable, setToTable] = useState('')
  const [toSeat, setToSeat] = useState('1')
  const [swapA, setSwapA] = useState('')
  const [swapB, setSwapB] = useState('')

  if (!tournamentId || !bundle.tournament) {
    return <p className="text-mute">선택된 토너먼트가 없습니다.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">테이블 관리</h1>
          <p className="text-sm text-mute">{bundle.tournament.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => addTable(tournamentId)}>테이블 추가</Button>
          <Button onClick={() => suggestBalancing(tournamentId)}>밸런싱 추천</Button>
          <Button onClick={() => suggestBreak(tournamentId)}>브레이크 추천</Button>
          <Button
            variant="gold"
            onClick={() => {
              drawFinalTable(tournamentId)
            }}
          >
            파이널 테이블
          </Button>
        </div>
      </div>

      {balanceSuggestions.length > 0 ? (
        <Card>
          <h2 className="mb-2 font-semibold">밸런싱 추천</h2>
          <div className="space-y-2 text-sm">
            {balanceSuggestions.map((s) => (
              <div key={`${s.entryId}-${s.toSeat}`} className="rounded-xl border border-line p-3">
                <div className="font-medium">{s.playerName}</div>
                <div className="text-mute">
                  T{s.fromTableNumber}-{s.fromSeat} → T{s.toTableNumber}-{s.toSeat}
                </div>
                <div className="text-xs text-gold">{s.reason}</div>
              </div>
            ))}
          </div>
          <Button className="mt-3" variant="gold" onClick={() => applyBalancing(balanceSuggestions)}>
            추천 적용
          </Button>
        </Card>
      ) : null}

      {breakPlan ? (
        <Card>
          <h2 className="mb-2 font-semibold">테이블 브레이크 추천</h2>
          <p className="mb-2 text-sm">
            {breakPlan.breakTableNumber}번 테이블을 브레이크하고 {breakPlan.moves.length}명을 이동합니다.
          </p>
          <div className="space-y-1 text-sm">
            {breakPlan.moves.map((m) => (
              <div key={m.entryId}>
                {m.playerName}님은 {m.toTableNumber}번 테이블 {m.toSeat}번 좌석으로 이동하십시오.
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-mute">
            이동 후:{' '}
            {breakPlan.resultingCounts.map((c) => `T${c.tableNumber}:${c.count}`).join(' / ')}
          </div>
          <Button className="mt-3" variant="danger" onClick={() => applyBreak(breakPlan)}>
            브레이크 확정
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {bundle.tables
          .slice()
          .sort((a, b) => a.number - b.number)
          .map((table) => {
            const seated = bundle.entries.filter(
              (e) => e.currentTableId === table.id && e.status === 'seated',
            )
            const total = seated.reduce((s, e) => s + e.currentChips, 0)
            const avg = seated.length ? Math.round(total / seated.length) : 0
            const occupied = new Set(seated.map((e) => e.currentSeat))
            return (
              <Card key={table.id}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold">테이블 {table.number}</div>
                    <div className="text-xs text-mute">
                      {seated.length}/{table.maxSeats} · {table.status} · 딜러버튼 #{table.dealerButtonSeat}
                      {table.dealerName ? ` · ${table.dealerName}` : ''}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="pd-num text-gold">{formatNumber(total)}</div>
                    <div className="text-mute">평균 {formatNumber(avg)}</div>
                  </div>
                </div>
                <div className="mb-3 space-y-1">
                  {Array.from({ length: table.maxSeats }, (_, i) => i + 1).map((seat) => {
                    const entry = seated.find((e) => e.currentSeat === seat)
                    return (
                      <div
                        key={seat}
                        className="flex items-center justify-between rounded-lg bg-felt-2 px-2 py-2 text-sm"
                      >
                        <button
                          className="text-left"
                          onClick={() => entry && setMoveEntry(entry.id)}
                        >
                          #{seat}{' '}
                          {entry ? getEntryName(entry.id) : <span className="text-mute">빈 좌석</span>}
                          {table.dealerButtonSeat === seat ? ' Ⓓ' : ''}
                        </button>
                        {entry ? (
                          <input
                            className="pd-num w-24 rounded-lg border border-line bg-panel px-2 py-1 text-right text-xs"
                            value={entry.currentChips}
                            onChange={(e) => updateChips(entry.id, Number(e.target.value) || 0)}
                          />
                        ) : (
                          <span className="text-xs text-mute">-</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => rotateDealer(table.id)}>
                    딜러 이동
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      setTableStatus(table.id, table.status === 'locked' ? 'active' : 'locked')
                    }
                  >
                    {table.status === 'locked' ? '잠금 해제' : '테이블 잠금'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      setTableStatus(table.id, table.status === 'inactive' ? 'active' : 'inactive')
                    }
                  >
                    {table.status === 'inactive' ? '활성화' : '비활성화'}
                  </Button>
                  <Button size="sm" onClick={() => setTableStatus(table.id, 'breaking')}>
                    브레이크 지정
                  </Button>
                </div>
                <div className="mt-2 text-xs text-mute">빈 좌석: {table.maxSeats - occupied.size}</div>
              </Card>
            )
          })}
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">좌석 교환</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={swapA} onChange={(e) => setSwapA(e.target.value)}>
            <option value="">플레이어 A</option>
            {bundle.entries
              .filter((e) => e.status === 'seated')
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {getEntryName(e.id)}
                </option>
              ))}
          </Select>
          <Select value={swapB} onChange={(e) => setSwapB(e.target.value)}>
            <option value="">플레이어 B</option>
            {bundle.entries
              .filter((e) => e.status === 'seated')
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {getEntryName(e.id)}
                </option>
              ))}
          </Select>
          <Button
            onClick={() => {
              if (swapA && swapB) swapSeats(swapA, swapB)
            }}
          >
            교환
          </Button>
        </div>
        <Button onClick={() => confirmSeating(tournamentId)}>파이널/배정 미리보기 확정</Button>
      </Card>

      <Modal open={Boolean(moveEntry)} title="플레이어 이동" onClose={() => setMoveEntry(null)}>
        <div className="space-y-3">
          <div>{moveEntry ? getEntryName(moveEntry) : ''}</div>
          <div>
            <Label>도착 테이블</Label>
            <Select value={toTable} onChange={(e) => setToTable(e.target.value)}>
              <option value="">선택</option>
              {bundle.tables.map((t) => (
                <option key={t.id} value={t.id}>
                  테이블 {t.number}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>좌석</Label>
            <Input value={toSeat} onChange={(e) => setToSeat(e.target.value)} inputMode="numeric" />
          </div>
          <Button
            variant="gold"
            block
            onClick={() => {
              if (moveEntry && toTable) {
                movePlayer(moveEntry, toTable, Number(toSeat))
                setMoveEntry(null)
              }
            }}
          >
            이동 확정
          </Button>
        </div>
      </Modal>
    </div>
  )
}
