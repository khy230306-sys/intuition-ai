import type { StreetSnapshot } from '@/engine/session'

const STREET_KO = {
  preflop: '프리플랍',
  flop: '플랍',
  turn: '턴',
  river: '리버',
} as const

export function StreetTimeline({ snapshots }: { snapshots: StreetSnapshot[] }) {
  if (!snapshots.length) return null
  return (
    <div className="rounded-2xl border border-line bg-panel px-3 py-3">
      <div className="mb-2 text-xs text-mute">핸드 진행 분석 (스트리트별)</div>
      <div className="space-y-2">
        {snapshots.map((snap, i) => {
          const prev = snapshots[i - 1]
          const delta = prev ? snap.winPct - prev.winPct : 0
          return (
            <div
              key={`${snap.street}-${snap.at}`}
              className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-sm"
            >
              <div className="font-semibold text-accent">{STREET_KO[snap.street]}</div>
              <div className="min-w-0">
                <div className="truncate">{snap.handLabel}</div>
                <div className="text-xs text-mute">
                  {snap.actionLabel}
                  {snap.draws.length ? ` · ${snap.draws.join(', ')}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="he-num font-bold">{snap.winPct.toFixed(1)}%</div>
                {prev ? (
                  <div className={`he-num text-xs ${delta >= 0 ? 'text-accent' : 'text-danger'}`}>
                    {delta >= 0 ? '+' : ''}
                    {delta.toFixed(1)}
                  </div>
                ) : (
                  <div className="text-xs text-mute">시작</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
