import type { StreetSnapshot } from '@/engine/session'

const STREET_KO = {
  preflop: '프리',
  flop: '플랍',
  turn: '턴',
  river: '리버',
} as const

export function StreetTimeline({ snapshots }: { snapshots: StreetSnapshot[] }) {
  if (!snapshots.length) return null
  return (
    <div className="flex gap-1 overflow-x-auto pb-0.5">
      {snapshots.map((snap, i) => {
        const prev = snapshots[i - 1]
        const delta = prev ? snap.winPct - prev.winPct : 0
        return (
          <div
            key={`${snap.street}-${snap.at}`}
            className="min-w-[4.5rem] rounded-lg border border-line bg-panel px-2 py-1.5"
          >
            <div className="text-[10px] font-semibold text-accent">{STREET_KO[snap.street]}</div>
            <div className="he-num text-sm font-bold">{snap.winPct.toFixed(0)}%</div>
            <div className={`he-num text-[10px] ${delta >= 0 ? 'text-accent' : 'text-danger'}`}>
              {prev ? `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}` : snap.actionLabel}
            </div>
          </div>
        )
      })}
    </div>
  )
}
