import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Label, Select } from '@/components/ui/Input'
import {
  PRIZE_TEMPLATE_LABELS,
  type PrizeTemplateKey,
  validatePayouts,
} from '@/utils/payouts'
import { formatMoney } from '@/utils/time'
import type { PrizePayout } from '@/types'

export function PayoutsPage() {
  const tournamentId = useAppStore((s) => s.selectedTournamentId)
  const bundle = useTournamentBundle(tournamentId)
  const applyPrizeTemplate = useAppStore((s) => s.applyPrizeTemplate)
  const setPrizeStructure = useAppStore((s) => s.setPrizeStructure)
  const [template, setTemplate] = useState<PrizeTemplateKey>('top3')
  const [message, setMessage] = useState<string | null>(null)
  const [payouts, setPayouts] = useState<PrizePayout[] | null>(null)

  const current = useMemo(
    () => payouts ?? bundle.prize?.payouts ?? [],
    [payouts, bundle.prize?.payouts],
  )
  const pool = bundle.pool?.netPrizePool ?? 0
  const validation = useMemo(() => validatePayouts(pool, current), [pool, current])

  if (!tournamentId || !bundle.tournament) {
    return <p className="text-mute">선택된 토너먼트가 없습니다.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">상금 계산</h1>
          <p className="text-sm text-mute">{bundle.tournament.name}</p>
        </div>
        <Link className="min-h-11 rounded-xl bg-panel-2 px-4 py-3 text-sm" to="/money">
          게임 금액 수정
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <div className="text-xs text-mute">엔트리</div>
          <div className="pd-num text-xl">{bundle.entries.length}</div>
        </Card>
        <Card>
          <div className="text-xs text-mute">바이인</div>
          <div className="pd-num text-xl">{formatMoney(bundle.tournament.buyIn)}</div>
        </Card>
        <Card>
          <div className="text-xs text-mute">보장 상금</div>
          <div className="pd-num text-xl">{formatMoney(bundle.tournament.guaranteedPrize)}</div>
        </Card>
        <Card className="border-gold/40">
          <div className="text-xs text-mute">총 상금</div>
          <div className="pd-num text-xl text-gold">{formatMoney(pool)}</div>
        </Card>
      </div>

      <Card className="flex flex-wrap gap-2">
        <Select value={template} onChange={(e) => setTemplate(e.target.value as PrizeTemplateKey)}>
          {Object.entries(PRIZE_TEMPLATE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Button
          onClick={() => {
            const res = applyPrizeTemplate(tournamentId, template)
            setPayouts(null)
            setMessage(res.ok ? '템플릿 적용 완료' : res.message ?? '실패')
          }}
        >
          템플릿 적용
        </Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">배분</h2>
        {current.map((p, idx) => (
          <div key={p.place} className="grid grid-cols-3 gap-2">
            <div className="self-center">{p.place}위</div>
            <Input
              type="number"
              value={p.percent ?? 0}
              onChange={(e) => {
                const next = current.map((x, i) =>
                  i === idx ? { ...x, percent: Number(e.target.value) } : x,
                )
                setPayouts(next)
              }}
            />
            <Input
              type="number"
              value={p.amount}
              onChange={(e) => {
                const next = current.map((x, i) =>
                  i === idx ? { ...x, amount: Number(e.target.value) } : x,
                )
                setPayouts(next)
              }}
            />
          </div>
        ))}
        <div className="text-sm">
          합계 검증:{' '}
          <span className={validation.ok ? 'text-ok' : 'text-danger'}>
            {validation.ok ? '일치' : validation.message}
          </span>
        </div>
        <Button
          variant="gold"
          disabled={!validation.ok}
          onClick={() => {
            const res = setPrizeStructure(tournamentId, 'percent', current)
            setMessage(res.ok ? '저장 완료' : res.message ?? '실패')
            if (res.ok) setPayouts(null)
          }}
        >
          상금 저장
        </Button>
        {message ? <p className="text-sm text-gold">{message}</p> : null}
        <p className="text-xs text-mute">
          퍼센트/금액 합계가 총 상금과 정확히 일치해야 저장됩니다.
        </p>
        <div>
          <Label>운영비 / 추가 상금은 템플릿 재계산 시 반영됩니다.</Label>
        </div>
      </Card>
    </div>
  )
}
