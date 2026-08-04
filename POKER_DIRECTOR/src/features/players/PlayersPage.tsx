import { useMemo, useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Label, Textarea, Select } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { downloadText, parseCsv, toCsv } from '@/utils/csv'
import { formatMoney, formatNumber } from '@/utils/time'
import { getBuyInMarks } from '@/utils/buyInTally'
import type { EntryStatus } from '@/types'

export function PlayersPage() {
  const tournamentId = useAppStore((s) => s.selectedTournamentId)
  const bundle = useTournamentBundle(tournamentId)
  const canSeePhone = useAppStore((s) => s.canSeePhone())
  const registerPlayer = useAppStore((s) => s.registerPlayer)
  const quickRegisterNames = useAppStore((s) => s.quickRegisterNames)
  const importPlayersCsv = useAppStore((s) => s.importPlayersCsv)
  const checkIn = useAppStore((s) => s.checkIn)
  const checkOut = useAppStore((s) => s.checkOut)
  const deleteEntry = useAppStore((s) => s.deleteEntry)
  const eliminatePlayer = useAppStore((s) => s.eliminatePlayer)
  const undoElimination = useAppStore((s) => s.undoElimination)
  const rebuy = useAppStore((s) => s.rebuy)
  const addBuyInMark = useAppStore((s) => s.addBuyInMark)
  const removeBuyInMark = useAppStore((s) => s.removeBuyInMark)
  const reentry = useAppStore((s) => s.reentry)
  const addon = useAppStore((s) => s.addon)
  const updateEntry = useAppStore((s) => s.updateEntry)
  const getEntryName = useAppStore((s) => s.getEntryName)
  const players = useAppStore((s) => s.players)
  const previewSeating = useAppStore((s) => s.previewSeating)
  const confirmSeating = useAppStore((s) => s.confirmSeating)
  const seatPreview = useAppStore((s) => s.seatPreview)

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | EntryStatus>('all')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bulk, setBulk] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmElim, setConfirmElim] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const rows = useMemo(() => {
    return bundle.entries
      .filter((e) => {
        const player = players.find((p) => p.id === e.playerId)
        const hay = `${player?.name ?? ''} ${player?.nickname ?? ''} ${e.accessCode}`.toLowerCase()
        if (q && !hay.includes(q.toLowerCase())) return false
        if (status !== 'all' && e.status !== status) return false
        return true
      })
      .sort((a, b) => a.entryNumber - b.entryNumber)
  }, [bundle.entries, players, q, status])

  const selectedEntry = bundle.entries.find((e) => e.id === selected)

  if (!tournamentId || !bundle.tournament) {
    return <p className="text-mute">선택된 토너먼트가 없습니다.</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">참가자 관리</h1>
        <p className="text-sm text-mute">{bundle.tournament.name}</p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">개별 등록</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label>이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>전화번호 (관리자만 조회)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button
            className="self-end"
            variant="gold"
            onClick={() => {
              const res = registerPlayer(tournamentId, { name, phone: phone || undefined })
              setMsg(res.ok ? '등록 완료' : res.message ?? '실패')
              if (res.ok) {
                setName('')
                setPhone('')
              }
            }}
          >
            등록
          </Button>
        </div>
        <div>
          <Label>여러 명 빠른 등록 (줄바꿈)</Label>
          <Textarea rows={3} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <Button
            className="mt-2"
            onClick={() => {
              const n = quickRegisterNames(tournamentId, bulk.split('\n'))
              setMsg(`${n}명 등록`)
              setBulk('')
            }}
          >
            일괄 등록
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border border-line px-4">
            CSV 가져오기
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const text = await file.text()
                const n = importPlayersCsv(tournamentId, parseCsv(text))
                setMsg(`CSV ${n}명 등록`)
              }}
            />
          </label>
          <Button
            onClick={() => {
              const data = rows.map((e) => {
                const p = players.find((x) => x.id === e.playerId)
                return {
                  번호: e.entryNumber,
                  이름: p?.name ?? '',
                  닉네임: p?.nickname ?? '',
                  상태: e.status,
                  결제: e.paymentStatus,
                  테이블: e.currentTableId
                    ? bundle.tables.find((t) => t.id === e.currentTableId)?.number ?? ''
                    : '',
                  좌석: e.currentSeat ?? '',
                  칩: e.currentChips,
                  코드: e.accessCode,
                  ...(canSeePhone ? { 전화번호: p?.phone ?? '' } : {}),
                }
              })
              downloadText('players.csv', toCsv(data))
            }}
          >
            CSV 내보내기
          </Button>
          <Button
            onClick={() => {
              previewSeating(tournamentId)
            }}
          >
            좌석 미리보기
          </Button>
          <Button variant="gold" onClick={() => confirmSeating(tournamentId)}>
            좌석 배정 확정
          </Button>
        </div>
        {msg ? <p className="text-sm text-gold">{msg}</p> : null}
      </Card>

      {seatPreview ? (
        <Card>
          <h2 className="mb-2 font-semibold">좌석 배정 미리보기</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {seatPreview.map((t) => (
              <div key={t.tableId} className="rounded-xl border border-line p-3">
                <div className="mb-2 font-medium">테이블 {t.tableNumber}</div>
                {t.seats.map((s) => (
                  <div key={s.seatNumber} className="flex justify-between text-sm">
                    <span>
                      #{s.seatNumber} {s.playerName}
                    </span>
                    <span className="pd-num text-mute">{formatNumber(s.chips)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input placeholder="이름/닉네임/코드 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">전체 상태</option>
          <option value="registered">등록</option>
          <option value="checked_in">체크인</option>
          <option value="seated">착석</option>
          <option value="eliminated">탈락</option>
          <option value="waiting">대기</option>
        </Select>
      </div>

      <div className="space-y-2">
        {rows.map((e) => {
          const p = players.find((x) => x.id === e.playerId)
          const tableNo = bundle.tables.find((t) => t.id === e.currentTableId)?.number
          return (
            <button
              key={e.id}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-panel px-3 py-3 text-left"
              onClick={() => setSelected(e.id)}
            >
              <div>
                <div className="font-medium">
                  #{e.entryNumber} {p?.name}
                  {p?.nickname ? ` (${p.nickname})` : ''}
                </div>
                <div className="text-xs text-mute">
                  {e.status} · {e.paymentStatus}
                  {tableNo ? ` · T${tableNo}-${e.currentSeat}` : ''}
                  {canSeePhone && p?.phone ? ` · ${p.phone}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="pd-num text-gold">{formatNumber(e.currentChips)}</div>
                <div className="text-xs text-mute">{e.accessCode}</div>
              </div>
            </button>
          )
        })}
      </div>

      <Modal open={Boolean(selectedEntry)} title="참가자 상세" onClose={() => setSelected(null)}>
        {selectedEntry ? (
          <div className="space-y-3 text-sm">
            <div className="text-lg font-semibold">{getEntryName(selectedEntry.id)}</div>
            <div>상태: {selectedEntry.status}</div>
            <div>바이인: {formatMoney(selectedEntry.buyInAmount)}</div>
            <div className="flex flex-wrap items-center gap-2">
              <span>바인 체크: {getBuyInMarks(selectedEntry)}회</span>
              <Button variant="secondary" onClick={() => removeBuyInMark(selectedEntry.id)}>
                −
              </Button>
              <Button variant="gold" onClick={() => addBuyInMark(selectedEntry.id)}>
                +
              </Button>
            </div>
            <div>
              리바이 {selectedEntry.rebuyCount} / 리엔트리 {selectedEntry.reentryCount} / 애드온{' '}
              {selectedEntry.addonCount}
            </div>
            <div>조회 코드: {selectedEntry.accessCode}</div>
            <div>
              플레이어 화면:{' '}
              <a
                className="text-gold underline"
                href={`#/player/${selectedEntry.accessCode}`}
                target="_blank"
                rel="noreferrer"
              >
                #/player/{selectedEntry.accessCode}
              </a>
            </div>
            <Select
              value={selectedEntry.paymentStatus}
              onChange={(e) =>
                updateEntry(selectedEntry.id, {
                  paymentStatus: e.target.value as typeof selectedEntry.paymentStatus,
                })
              }
            >
              <option value="unpaid">미결제</option>
              <option value="paid">결제완료</option>
              <option value="refunded">환불</option>
              <option value="comped">컴프</option>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => checkIn(selectedEntry.id)}>체크인</Button>
              <Button onClick={() => checkOut(selectedEntry.id)}>체크인 취소</Button>
              <Button onClick={() => rebuy(selectedEntry.id)}>리바이</Button>
              <Button onClick={() => reentry(selectedEntry.id)}>리엔트리</Button>
              <Button onClick={() => addon(selectedEntry.id)}>애드온</Button>
              <Button
                onClick={() =>
                  updateEntry(selectedEntry.id, { status: 'waiting' })
                }
              >
                대기자
              </Button>
              <Button variant="danger" onClick={() => setConfirmElim(selectedEntry.id)}>
                탈락 처리
              </Button>
              <Button onClick={() => undoElimination(selectedEntry.id)}>탈락 취소</Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteEntry(selectedEntry.id)
                  setSelected(null)
                }}
              >
                참가 취소
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmElim)}
        title="탈락 처리"
        message="이 플레이어를 탈락 처리할까요? 순위가 자동 계산됩니다."
        onClose={() => setConfirmElim(null)}
        onConfirm={() => {
          if (confirmElim) eliminatePlayer({ entryId: confirmElim })
        }}
      />
    </div>
  )
}
