import clsx from 'clsx'
import type { DaySession, FlowReport, HandRecord } from '@/engine/session'
import { formatBoard, formatHole } from '@/engine/session'

const LEVEL_STYLE = {
  hot: 'border-accent/50 bg-accent/10 text-accent',
  warm: 'border-accent-2/40 bg-accent-2/10 text-accent-2',
  neutral: 'border-line bg-panel text-ink',
  cold: 'border-[#6b8cff]/40 bg-[#6b8cff]/10 text-[#a8c0ff]',
  ice: 'border-danger/40 bg-danger/10 text-danger',
} as const

const OUTCOME_KO = {
  won: '승',
  lost: '패',
  folded: '폴드',
  chop: '타이',
  unknown: '미기록',
} as const

export function FlowDashboard({
  session,
  flow,
  onClear,
}: {
  session: DaySession
  flow: FlowReport
  onClear: () => void
}) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">오늘 흐름</div>
          <div className="text-xs text-mute">
            {session.dateKey} · {flow.handCount}핸드
          </div>
        </div>
        <button type="button" className="text-xs text-mute underline" onClick={onClear}>
          기록 비우기
        </button>
      </div>

      <div className={clsx('rounded-xl border px-3 py-2.5', LEVEL_STYLE[flow.insight.level])}>
        <div className="he-title text-lg leading-tight sm:text-xl">{flow.insight.title}</div>
        <div className="mt-0.5 text-xs opacity-90">{flow.insight.summary}</div>
        <ul className="mt-2 max-h-24 space-y-1 overflow-auto text-xs">
          {flow.insight.bullets.slice(0, 4).map((b) => (
            <li key={b} className="flex gap-1.5">
              <span>▸</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <MiniStat label="평균" value={`${flow.avgFinalEquity.toFixed(0)}%`} />
        <MiniStat
          label="실전"
          value={flow.winRateKnown == null ? '-' : `${flow.winRateKnown.toFixed(0)}%`}
        />
        <MiniStat
          label="변화"
          value={`${flow.equityDeltaAvg >= 0 ? '+' : ''}${flow.equityDeltaAvg.toFixed(0)}`}
        />
        <MiniStat
          label="모멘텀"
          value={`${flow.momentum >= 0 ? '+' : ''}${flow.momentum.toFixed(0)}`}
        />
      </div>

      {flow.sparkEquity.length > 1 ? (
        <div className="rounded-xl border border-line bg-panel-2/60 px-2 py-2">
          <EquitySpark values={flow.sparkEquity} />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto">
        {session.hands.length === 0 ? (
          <p className="text-xs text-mute">저장된 핸드가 없습니다.</p>
        ) : (
          session.hands.map((h, i) => (
            <HandRow key={h.id} hand={h} index={session.hands.length - i} />
          ))
        )}
      </div>
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel px-1.5 py-1.5 text-center">
      <div className="text-[10px] text-mute">{label}</div>
      <div className="he-num text-sm font-bold">{value}</div>
    </div>
  )
}

function EquitySpark({ values }: { values: number[] }) {
  const w = 280
  const h = 40
  const min = Math.min(...values, 20)
  const max = Math.max(...values, 80)
  const span = Math.max(1, max - min)
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 6) - 3
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full overflow-visible">
      <polyline fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent" points={pts} />
    </svg>
  )
}

function HandRow({ hand, index }: { hand: HandRecord; index: number }) {
  const pre = hand.snapshots.find((s) => s.street === 'preflop')
  const last = hand.snapshots[hand.snapshots.length - 1]
  const delta = pre && last ? last.winPct - pre.winPct : 0
  return (
    <div className="rounded-lg border border-line bg-panel px-2 py-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 truncate font-semibold">
          #{index} {formatHole(hand.hole)}{' '}
          <span className="font-normal text-mute">{formatBoard(hand.board)}</span>
        </div>
        <div className="he-num shrink-0 text-accent">{hand.finalWinPct.toFixed(0)}%</div>
      </div>
      <div className="mt-0.5 flex gap-2 text-[10px] text-mute">
        <span>{OUTCOME_KO[hand.outcome]}</span>
        <span>{last?.actionLabel ?? '-'}</span>
        <span>
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(0)}%p
        </span>
      </div>
    </div>
  )
}
