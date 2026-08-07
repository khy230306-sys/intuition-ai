import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { PlayingCard } from '@/components/PlayingCard'
import { CardPicker } from '@/components/CardPicker'
import { FlowDashboard } from '@/components/FlowDashboard'
import { StreetTimeline } from '@/components/StreetTimeline'
import { useHandSession } from '@/hooks/useHandSession'
import type { Position } from '@/engine/strategy'
import type { HandOutcome } from '@/engine/session'

const STREET_KO = {
  preflop: '프리플랍',
  flop: '플랍',
  turn: '턴',
  river: '리버',
} as const

const POSITIONS: { id: Position; label: string }[] = [
  { id: 'early', label: '앞' },
  { id: 'middle', label: '중' },
  { id: 'late', label: '뒤' },
  { id: 'blinds', label: '블' },
]

export default function App() {
  const s = useHandSession()
  const [tab, setTab] = useState<'play' | 'flow'>('play')
  const [showDetail, setShowDetail] = useState(false)

  const boardLabel =
    s.board.length < 3 ? '플랍' : s.board.length === 3 ? '턴' : s.board.length === 4 ? '리버' : '완료'

  return (
    <div className="mx-auto flex h-dvh max-h-dvh max-w-lg flex-col overflow-hidden px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.4rem,env(safe-area-inset-top))]">
      <header className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold tracking-[0.22em] text-accent">HOLDEM EDGE</div>
          <h1 className="he-title truncate text-2xl leading-none">홀덤 엣지</h1>
        </div>
        <div className="flex rounded-xl border border-line bg-panel p-0.5">
          <TabButton active={tab === 'play'} onClick={() => setTab('play')}>
            플레이
          </TabButton>
          <TabButton active={tab === 'flow'} onClick={() => setTab('flow')}>
            흐름 {s.flow.handCount ? `(${s.flow.handCount})` : ''}
          </TabButton>
        </div>
      </header>

      {tab === 'flow' ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-panel/80 p-3">
          <FlowDashboard session={s.daySession} flow={s.flow} onClear={s.clearToday} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {/* Cards row */}
          <section className="shrink-0 rounded-2xl border border-line bg-panel/80 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-xs font-semibold">
                홀 · 보드 <span className="font-normal text-mute">({STREET_KO[s.street]})</span>
              </div>
              <button type="button" className="text-[11px] text-mute underline" onClick={s.reset}>
                초기화
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="flex shrink-0 gap-1">
                {[0, 1].map((i) => (
                  <PlayingCard
                    key={`h${i}`}
                    card={s.hole[i]}
                    size="sm"
                    onClick={() => {
                      if (s.hole[i]) s.removeHole(i)
                      else s.setPickerFor('hole')
                    }}
                  />
                ))}
              </div>
              <div className="h-10 w-px shrink-0 bg-line" />
              <div className="flex shrink-0 gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <PlayingCard
                    key={`b${i}`}
                    card={s.board[i]}
                    size="xs"
                    dimmed={i >= s.board.length}
                    onClick={() => {
                      if (s.board[i]) s.removeBoardFrom(i)
                      else if (s.hole.length === 2 && s.board.length < 5) s.setPickerFor('board')
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2 flex gap-1.5">
              {s.hole.length < 2 ? (
                <button
                  type="button"
                  className="min-h-10 flex-1 rounded-xl bg-accent text-sm font-semibold text-[#062019]"
                  onClick={() => s.setPickerFor('hole')}
                >
                  홀카드 입력
                </button>
              ) : s.board.length < 5 ? (
                <button
                  type="button"
                  className="min-h-10 flex-1 rounded-xl bg-accent-2 text-sm font-semibold text-[#2a1605]"
                  onClick={() => s.setPickerFor('board')}
                >
                  {boardLabel} 입력
                </button>
              ) : (
                <button
                  type="button"
                  className="min-h-10 flex-1 rounded-xl border border-line text-sm"
                  onClick={s.resetBoard}
                >
                  보드 다시
                </button>
              )}
              <button
                type="button"
                className="min-h-10 rounded-xl border border-line px-3 text-xs text-mute"
                onClick={s.resetBoard}
              >
                보드×
              </button>
            </div>
          </section>

          {/* Compact settings */}
          <section className="grid shrink-0 grid-cols-[5.5rem_1fr] gap-2">
            <label className="rounded-xl border border-line bg-panel/80 px-2 py-1.5">
              <div className="text-[10px] text-mute">상대</div>
              <select
                className="he-num w-full bg-transparent text-sm font-semibold outline-none"
                value={s.opponents}
                onChange={(e) => s.setOpponents(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}명
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-panel/80 p-1">
              {POSITIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={clsx(
                    'min-h-9 rounded-lg text-xs font-semibold',
                    s.position === p.id ? 'bg-accent/20 text-accent' : 'text-mute',
                  )}
                  onClick={() => s.setPosition(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* Strategy main */}
          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-accent/30 bg-gradient-to-b from-panel to-panel-2 p-3">
            {s.hole.length < 2 ? (
              <div className="grid flex-1 place-items-center text-center text-sm text-mute">
                홀카드 2장을 입력하면
                <br />
                승률과 전략이 여기에 표시됩니다
              </div>
            ) : s.equity && s.advice ? (
              <>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] tracking-wider text-mute">
                      {STREET_KO[s.advice.street]}
                      {s.pending ? ' · 계산중' : ''}
                    </div>
                    <div className="he-title text-3xl leading-none text-accent-2">
                      {s.advice.actionLabel}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-semibold">{s.advice.title}</div>
                  </div>
                  <div className="shrink-0 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-center">
                    <div className="text-[10px] text-mute">승률</div>
                    <div className="he-num text-2xl font-bold text-accent">
                      {s.equity.winPct.toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="mb-2 text-xs text-mute">
                  {s.advice.handLabel}
                  {s.advice.draws.length ? ` · ${s.advice.draws.join(', ')}` : ''}
                </div>

                <StreetTimeline snapshots={s.snapshots} />

                <button
                  type="button"
                  className="mt-2 text-left text-[11px] text-mute underline"
                  onClick={() => setShowDetail((v) => !v)}
                >
                  {showDetail ? '상세 접기' : '상세 이유 보기'}
                </button>
                {showDetail ? (
                  <ul className="mt-1 max-h-20 space-y-1 overflow-auto text-xs text-ink/90">
                    {s.advice.reasons.map((r) => (
                      <li key={r} className="flex gap-1.5">
                        <span className="text-accent">▸</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-auto grid grid-cols-4 gap-1.5 pt-2">
                  {(
                    [
                      ['won', '승', 'bg-accent text-[#062019]'],
                      ['lost', '패', 'bg-danger text-white'],
                      ['folded', '폴드', 'border border-line bg-panel-2'],
                      ['unknown', '다음', 'border border-line text-mute'],
                    ] as const
                  ).map(([id, label, cls]) => (
                    <button
                      key={id}
                      type="button"
                      className={clsx('min-h-11 rounded-xl text-sm font-semibold', cls)}
                      onClick={() => s.saveAndNext(id as HandOutcome)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid flex-1 place-items-center text-sm text-accent">계산 중…</div>
            )}
          </section>

          {/* Tiny flow strip */}
          <button
            type="button"
            className="flex shrink-0 items-center justify-between rounded-xl border border-line bg-panel/70 px-3 py-2 text-left"
            onClick={() => setTab('flow')}
          >
            <span className="text-xs text-mute">오늘 흐름</span>
            <span className="text-xs font-semibold text-accent">
              {s.flow.handCount
                ? `${s.flow.insight.level.toUpperCase()} · 모멘텀 ${s.flow.momentum >= 0 ? '+' : ''}${s.flow.momentum.toFixed(0)}`
                : '기록 없음 · 탭에서 확인'}
            </span>
          </button>
        </div>
      )}

      {s.pickerFor ? (
        <CardPicker used={s.used} onPick={s.pickCard} onClose={() => s.setPickerFor(null)} />
      ) : null}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'min-h-9 rounded-lg px-3 text-xs font-semibold',
        active ? 'bg-accent/20 text-accent' : 'text-mute',
      )}
    >
      {children}
    </button>
  )
}
