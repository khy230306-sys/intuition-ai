import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { BLIND_TEMPLATE_LABELS, type BlindTemplateKey } from '@/utils/blinds'
import { todayDateString } from '@/utils/time'
import type { TournamentFormat } from '@/types'

export function CreateTournamentPage() {
  const createTournament = useAppStore((s) => s.createTournament)
  const startTournament = useAppStore((s) => s.startTournament)
  const navigate = useNavigate()
  const [name, setName] = useState('신규 토너먼트')
  const [date, setDate] = useState(todayDateString())
  const [startTime, setStartTime] = useState('19:00')
  const [location, setLocation] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(36)
  const [tableCount, setTableCount] = useState(4)
  const [seatsPerTable, setSeatsPerTable] = useState(9)
  const [startingStack, setStartingStack] = useState(30000)
  const [buyIn, setBuyIn] = useState(100000)
  const [fee, setFee] = useState(10000)
  const [guaranteedPrize, setGuaranteedPrize] = useState(0)
  const [lateRegLevel, setLateRegLevel] = useState(6)
  const [estimatedEndTime, setEstimatedEndTime] = useState('23:30')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<TournamentFormat>('rebuy')
  const [blindTemplate, setBlindTemplate] = useState<BlindTemplateKey>('standard')
  const [rebuyEnabled, setRebuyEnabled] = useState(true)
  const [reentryEnabled, setReentryEnabled] = useState(true)
  const [addonEnabled, setAddonEnabled] = useState(true)

  const payload = {
    name,
    date,
    startTime,
    location,
    maxPlayers,
    tableCount,
    seatsPerTable,
    startingStack,
    buyIn,
    fee,
    guaranteedPrize,
    lateRegLevel,
    estimatedEndTime,
    description,
    format,
    blindTemplate,
    rebuy: {
      enabled: rebuyEnabled,
      maxCount: 2,
      endLevel: lateRegLevel,
      cost: buyIn,
      chips: startingStack,
    },
    reentry: {
      enabled: reentryEnabled,
      maxCount: 1,
      endLevel: lateRegLevel,
      cost: buyIn,
      chips: startingStack,
      newSeat: true,
    },
    addon: {
      enabled: addonEnabled,
      availableLevel: lateRegLevel,
      cost: Math.round(buyIn / 2),
      chips: Math.round(startingStack / 2),
      maxCount: 1,
    },
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">토너먼트 생성</h1>
        <p className="text-sm text-mute">기본 정보와 진행 방식을 설정하세요.</p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">기본 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>토너먼트 이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>개최 날짜</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>시작 시간</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>장소</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>최대 참가자</Label>
            <Input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
          </div>
          <div>
            <Label>테이블 수</Label>
            <Input type="number" value={tableCount} onChange={(e) => setTableCount(Number(e.target.value))} />
          </div>
          <div>
            <Label>테이블당 좌석</Label>
            <Input
              type="number"
              value={seatsPerTable}
              onChange={(e) => setSeatsPerTable(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>시작 스택</Label>
            <Input
              type="number"
              value={startingStack}
              onChange={(e) => setStartingStack(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>바이인</Label>
            <Input type="number" value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} />
          </div>
          <div>
            <Label>참가비</Label>
            <Input type="number" value={fee} onChange={(e) => setFee(Number(e.target.value))} />
          </div>
          <div>
            <Label>보장 상금</Label>
            <Input
              type="number"
              value={guaranteedPrize}
              onChange={(e) => setGuaranteedPrize(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>등록 마감 레벨</Label>
            <Input
              type="number"
              value={lateRegLevel}
              onChange={(e) => setLateRegLevel(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>예상 종료 시간</Label>
            <Input
              type="time"
              value={estimatedEndTime}
              onChange={(e) => setEstimatedEndTime(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>설명</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">진행 방식 / 블라인드</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>포맷</Label>
            <Select value={format} onChange={(e) => setFormat(e.target.value as TournamentFormat)}>
              <option value="freezeout">프리즈아웃</option>
              <option value="rebuy">리바이</option>
              <option value="reentry">리엔트리</option>
              <option value="addon">애드온</option>
              <option value="bounty">바운티</option>
              <option value="progressive_bounty">프로그레시브 바운티</option>
              <option value="satellite">새틀라이트</option>
              <option value="standard">일반 토너먼트</option>
            </Select>
          </div>
          <div>
            <Label>블라인드 템플릿</Label>
            <Select
              value={blindTemplate}
              onChange={(e) => setBlindTemplate(e.target.value as BlindTemplateKey)}
            >
              {Object.entries(BLIND_TEMPLATE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={rebuyEnabled} onChange={(e) => setRebuyEnabled(e.target.checked)} />
            리바이 허용
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reentryEnabled}
              onChange={(e) => setReentryEnabled(e.target.checked)}
            />
            리엔트리 허용
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={addonEnabled} onChange={(e) => setAddonEnabled(e.target.checked)} />
            애드온 허용
          </label>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            const id = createTournament(payload)
            navigate(`/tournaments/${id}/blinds`)
          }}
        >
          임시 저장 후 블라인드 편집
        </Button>
        <Button
          variant="gold"
          onClick={() => {
            const id = createTournament(payload)
            startTournament(id)
            navigate('/timer')
          }}
        >
          저장 후 즉시 시작
        </Button>
      </div>
    </div>
  )
}
