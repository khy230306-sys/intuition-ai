import { useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Label } from '@/components/ui/Input'
import { formatMoney } from '@/utils/time'
import type { Tournament } from '@/types'

function num(v: string, fallback = 0) {
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function MoneyForm({
  tournament,
  operatingFeeInit,
  extraPrizeInit,
  onSaved,
}: {
  tournament: Tournament
  operatingFeeInit: number
  extraPrizeInit: number
  onSaved: (msg: string) => void
}) {
  const updateTournament = useAppStore((s) => s.updateTournament)
  const setPrizeStructure = useAppStore((s) => s.setPrizeStructure)
  const applyPrizeTemplate = useAppStore((s) => s.applyPrizeTemplate)
  const prize = useAppStore((s) => s.prizeStructures.find((p) => p.tournamentId === tournament.id))

  const [buyIn, setBuyIn] = useState(String(tournament.buyIn))
  const [fee, setFee] = useState(String(tournament.fee))
  const [guaranteedPrize, setGuaranteedPrize] = useState(String(tournament.guaranteedPrize))
  const [startingStack, setStartingStack] = useState(String(tournament.startingStack))
  const [rebuyCost, setRebuyCost] = useState(String(tournament.rebuy.cost))
  const [rebuyChips, setRebuyChips] = useState(String(tournament.rebuy.chips))
  const [rebuyMax, setRebuyMax] = useState(String(tournament.rebuy.maxCount))
  const [rebuyEnd, setRebuyEnd] = useState(String(tournament.rebuy.endLevel))
  const [reentryCost, setReentryCost] = useState(String(tournament.reentry.cost))
  const [reentryChips, setReentryChips] = useState(String(tournament.reentry.chips))
  const [reentryMax, setReentryMax] = useState(String(tournament.reentry.maxCount))
  const [reentryEnd, setReentryEnd] = useState(String(tournament.reentry.endLevel))
  const [addonCost, setAddonCost] = useState(String(tournament.addon.cost))
  const [addonChips, setAddonChips] = useState(String(tournament.addon.chips))
  const [addonMax, setAddonMax] = useState(String(tournament.addon.maxCount))
  const [addonLevel, setAddonLevel] = useState(String(tournament.addon.availableLevel))
  const [bountyAmount, setBountyAmount] = useState(String(tournament.bounty.defaultAmount))
  const [operatingFee, setOperatingFee] = useState(String(operatingFeeInit))
  const [extraPrize, setExtraPrize] = useState(String(extraPrizeInit))
  const [rebuyEnabled, setRebuyEnabled] = useState(tournament.rebuy.enabled)
  const [reentryEnabled, setReentryEnabled] = useState(tournament.reentry.enabled)
  const [addonEnabled, setAddonEnabled] = useState(tournament.addon.enabled)
  const [bountyEnabled, setBountyEnabled] = useState(tournament.bounty.enabled)

  const save = () => {
    updateTournament(tournament.id, {
      buyIn: num(buyIn),
      fee: num(fee),
      guaranteedPrize: num(guaranteedPrize),
      startingStack: num(startingStack),
      rebuy: {
        enabled: rebuyEnabled,
        cost: num(rebuyCost),
        chips: num(rebuyChips),
        maxCount: Math.floor(num(rebuyMax)),
        endLevel: Math.floor(num(rebuyEnd)),
      },
      reentry: {
        enabled: reentryEnabled,
        cost: num(reentryCost),
        chips: num(reentryChips),
        maxCount: Math.floor(num(reentryMax)),
        endLevel: Math.floor(num(reentryEnd)),
        newSeat: tournament.reentry.newSeat,
      },
      addon: {
        enabled: addonEnabled,
        cost: num(addonCost),
        chips: num(addonChips),
        maxCount: Math.floor(num(addonMax)),
        availableLevel: Math.floor(num(addonLevel)),
      },
      bounty: {
        enabled: bountyEnabled,
        progressive: tournament.bounty.progressive,
        defaultAmount: num(bountyAmount),
        increaseRule: tournament.bounty.increaseRule,
      },
    })

    // Recalculate payouts against the new prize pool
    const template =
      prize?.templateName === 'top1' ||
      prize?.templateName === 'top2' ||
      prize?.templateName === 'top3' ||
      prize?.templateName === 'top10pct' ||
      prize?.templateName === 'top15pct' ||
      prize?.templateName === 'top20pct'
        ? prize.templateName
        : 'top3'
    applyPrizeTemplate(tournament.id, template)
    const updated = useAppStore.getState().prizeStructures.find((p) => p.tournamentId === tournament.id)
    if (updated) {
      const res = setPrizeStructure(
        tournament.id,
        updated.mode,
        updated.payouts,
        num(operatingFee),
        num(extraPrize),
        template,
      )
      if (!res.ok) {
        onSaved(`금액은 저장됨. 상금 배분 확인 필요: ${res.message}`)
        return
      }
    }
    onSaved('게임 금액 설정을 저장했습니다.')
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-semibold">기본 금액</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>바이인 (원)</Label>
            <Input inputMode="numeric" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} />
          </div>
          <div>
            <Label>참가비/수수료 (원)</Label>
            <Input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div>
            <Label>보장 상금 (원)</Label>
            <Input
              inputMode="numeric"
              value={guaranteedPrize}
              onChange={(e) => setGuaranteedPrize(e.target.value)}
            />
          </div>
          <div>
            <Label>시작 스택 (칩)</Label>
            <Input
              inputMode="numeric"
              value={startingStack}
              onChange={(e) => setStartingStack(e.target.value)}
            />
          </div>
          <div>
            <Label>운영비 (원)</Label>
            <Input
              inputMode="numeric"
              value={operatingFee}
              onChange={(e) => setOperatingFee(e.target.value)}
            />
          </div>
          <div>
            <Label>추가 상금 (원)</Label>
            <Input
              inputMode="numeric"
              value={extraPrize}
              onChange={(e) => setExtraPrize(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">리바이</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rebuyEnabled}
              onChange={(e) => setRebuyEnabled(e.target.checked)}
            />
            허용
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>비용 (원)</Label>
            <Input value={rebuyCost} onChange={(e) => setRebuyCost(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label>지급 칩</Label>
            <Input value={rebuyChips} onChange={(e) => setRebuyChips(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label>가능 횟수</Label>
            <Input value={rebuyMax} onChange={(e) => setRebuyMax(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label>종료 레벨</Label>
            <Input value={rebuyEnd} onChange={(e) => setRebuyEnd(e.target.value)} inputMode="numeric" />
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">리엔트리</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reentryEnabled}
              onChange={(e) => setReentryEnabled(e.target.checked)}
            />
            허용
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>비용 (원)</Label>
            <Input
              value={reentryCost}
              onChange={(e) => setReentryCost(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div>
            <Label>지급 칩</Label>
            <Input
              value={reentryChips}
              onChange={(e) => setReentryChips(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div>
            <Label>가능 횟수</Label>
            <Input value={reentryMax} onChange={(e) => setReentryMax(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label>종료 레벨</Label>
            <Input value={reentryEnd} onChange={(e) => setReentryEnd(e.target.value)} inputMode="numeric" />
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">애드온</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={addonEnabled}
              onChange={(e) => setAddonEnabled(e.target.checked)}
            />
            허용
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>비용 (원)</Label>
            <Input value={addonCost} onChange={(e) => setAddonCost(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label>지급 칩</Label>
            <Input value={addonChips} onChange={(e) => setAddonChips(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label>최대 횟수</Label>
            <Input value={addonMax} onChange={(e) => setAddonMax(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label>가능 레벨</Label>
            <Input value={addonLevel} onChange={(e) => setAddonLevel(e.target.value)} inputMode="numeric" />
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">바운티</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bountyEnabled}
              onChange={(e) => setBountyEnabled(e.target.checked)}
            />
            사용
          </label>
        </div>
        <div>
          <Label>기본 바운티 금액 (원)</Label>
          <Input
            value={bountyAmount}
            onChange={(e) => setBountyAmount(e.target.value)}
            inputMode="numeric"
          />
        </div>
      </Card>

      <Button variant="gold" block size="lg" onClick={save}>
        금액 설정 저장
      </Button>
    </div>
  )
}

export function MoneySettingsPage() {
  const tournamentId = useAppStore((s) => s.selectedTournamentId)
  const selectTournament = useAppStore((s) => s.selectTournament)
  const tournaments = useAppStore((s) => s.tournaments)
  const bundle = useTournamentBundle(tournamentId)
  const [message, setMessage] = useState<string | null>(null)

  if (!tournamentId || !bundle.tournament) {
    return <p className="text-mute">선택된 토너먼트가 없습니다.</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">게임 금액 설정</h1>
        <p className="text-sm text-mute">바이인·리바이·애드온·보장상금을 자유롭게 수정하세요.</p>
      </div>

      <Card>
        <Label>대상 토너먼트</Label>
        <select
          className="min-h-12 w-full rounded-xl border border-line bg-felt-2 px-3"
          value={tournamentId}
          onChange={(e) => {
            selectTournament(e.target.value)
            setMessage(null)
          }}
        >
          {tournaments.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} ({x.status})
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-mute">
          현재 추정 총 상금: {formatMoney(bundle.pool?.netPrizePool ?? 0)}
        </p>
      </Card>

      <MoneyForm
        key={`${bundle.tournament.id}-${bundle.tournament.updatedAt}`}
        tournament={bundle.tournament}
        operatingFeeInit={bundle.prize?.operatingFee ?? 0}
        extraPrizeInit={bundle.prize?.extraPrize ?? 0}
        onSaved={setMessage}
      />

      {message ? <p className="text-sm text-gold">{message}</p> : null}
    </div>
  )
}
