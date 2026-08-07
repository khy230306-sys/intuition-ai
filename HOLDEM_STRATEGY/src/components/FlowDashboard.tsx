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
    <section className="mb-4 rounded-3xl border border-line bg-panel/80 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">4. 오늘 흐름 분석</h2>
          <p className="text-sm text-mute">{session.dateKey} · {flow.handCount}핸드 기록</p>
        </div>
        <button type="button" className="text-sm text-mute underline" onClick={onClear}>
          오늘 기록 비우기
        </button>
      </div>

      <div className={clsx('mb-4 rounded-2xl border px-4 py-4', LEVEL_STYLE[flow.insight.level])}>
        <div className="text-xs tracking-widest uppercase opacity-80">DAY FLOW</div>
        <div className="he-title mt-1 text-2xl sm:text-3xl">{flow.insight.title}</div>
        <div className="mt-1 text-sm opacity-90">{flow.insight.summary}</div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {flow.insight.bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span>▸</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="평균 승률" value={`${flow.avgFinalEquity.toFixed(1)}%`} />
        <MiniStat
          label="실전 승률"
          value={flow.winRateKnown == null ? '-' : `${flow.winRateKnown.toFixed(0)}%`}
        />
        <MiniStat
          label="흐름 변화"
          value={`${flow.equityDeltaAvg >= 0 ? '+' : ''}${flow.equityDeltaAvg.toFixed(1)}%p`}
        />
        <MiniStat
          label="모멘텀"
          value={`${flow.momentum >= 0 ? '+' : ''}${flow.momentum.toFixed(0)}`}
        />
      </div>

      {flow.sparkEquity.length > 1 ? (
        <div className="mb-4 rounded-2xl border border-line bg-panel-2/60 px-3 py-3">
          <div className="mb-2 text-xs text-mute">핸드별 최종 승률 추이</div>
          <EquitySpark values={flow.sparkEquity} />
        </div>
      ) : null}

      <div className="max-h-64 space-y-2 overflow-auto">
        {session.hands.length === 0 ? (
          <p className="text-sm text-mute">아직 저장된 핸드가 없습니다. 아래에서 결과를 기록하세요.</p>
        ) : (
          session.hands.map((h, i) => <HandRow key={h.id} hand={h} index={session.hands.length - i} />)
        )}
      </div>
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-3 py-3">
      <div className="text-xs text-mute">{label}</div>
      <div className="he-num mt-1 text-lg font-bold sm:text-xl">{value}</div>
    </div>
  )
}

function EquitySpark({ values }: { values: number[] }) {
  const w = 280
  const h = 56
  const min = Math.min(...values, 20)
  const max = Math.max(...values, 80)
  const span = Math.max(1, max - min)
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 8) - 4
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full overflow-visible">
      <polyline fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent" points={pts} />
      {values.map((v, i) => {
        const x = (i / Math.max(1, values.length - 1)) * w
        const y = h - ((v - min) / span) * (h - 8) - 4
        return <circle key={i} cx={x} cy={y} r="3" className="fill-accent-2" />
      })}
    </svg>
  )
}

function HandRow({ hand, index }: { hand: HandRecord; index: number }) {
  const pre = hand.snapshots.find((s) => s.street === 'preflop')
  const last = hand.snapshots[hand.snapshots.length - 1]
  const delta =
    pre && last ? last.winPct - pre.winPct : 0
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">
          #{index} {formatHole(hand.hole)}
          <span className="ml-2 text-mute">보드 {formatBoard(hand.board)}</span>
        </div>
        <div className="he-num text-accent">{hand.finalWinPct.toFixed(1)}%</div>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-mute">
        <span>결과 {OUTCOME_KO[hand.outcome]}</span>
        <span>권고 {last?.actionLabel ?? '-'}</span>
        <span>
          흐름 {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)}%p
        </span>
        <span>스냅샷 {hand.snapshots.length}</span>
      </div>
    </div>
  )
}
