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
  { id: 'early', label: '앞자리' },
  { id: 'middle', label: '중간' },
  { id: 'late', label: '뒷자리' },
  { id: 'blinds', label: '블라인드' },
]

const OUTCOMES: { id: HandOutcome; label: string; className: string }[] = [
  { id: 'won', label: '승으로 저장 → 다음', className: 'bg-accent text-[#062019]' },
  { id: 'lost', label: '패로 저장 → 다음', className: 'bg-danger text-white' },
  { id: 'folded', label: '폴드 저장 → 다음', className: 'bg-panel-2 border border-line text-ink' },
  { id: 'unknown', label: '결과 없이 저장 → 다음', className: 'border border-line text-mute' },
]

export default function App() {
  const s = useHandSession()

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="he-enter mb-8">
        <p className="text-xs font-semibold tracking-[0.28em] text-accent">HOLDEM EDGE</p>
        <h1 className="he-title mt-2 text-4xl leading-none text-ink sm:text-6xl">홀덤 엣지</h1>
        <p className="mt-3 max-w-xl text-sm text-mute sm:text-base">
          카드를 입력하며 실시간 승률·전략을 보고, 핸드를 저장해 그날의 흐름까지 분석합니다.
        </p>
      </header>

      <FlowDashboard session={s.daySession} flow={s.flow} onClear={s.clearToday} />

      <section className="he-enter-delay mb-4 rounded-3xl border border-line bg-panel/80 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">1. 내 홀카드</h2>
          <button type="button" className="text-sm text-mute underline" onClick={s.reset}>
            현재 핸드 초기화
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {[0, 1].map((i) => (
            <PlayingCard
              key={i}
              card={s.hole[i]}
              size="lg"
              onClick={() => {
                if (s.hole[i]) s.removeHole(i)
                else s.setPickerFor('hole')
              }}
            />
          ))}
          {s.hole.length < 2 ? (
            <button
              type="button"
              className="min-h-12 rounded-xl bg-accent px-4 font-semibold text-[#062019]"
              onClick={() => s.setPickerFor('hole')}
            >
              카드 입력
            </button>
          ) : null}
        </div>
      </section>

      <section className="mb-4 rounded-3xl border border-line bg-panel/80 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">2. 바닥 카드</h2>
            <p className="text-sm text-mute">
              현재: {STREET_KO[s.street]}
              {s.boardNeed > 0 ? ` · ${s.boardNeed}장 더 입력` : ' · 완료'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="min-h-11 rounded-xl border border-line px-3 text-sm"
              onClick={s.resetBoard}
            >
              보드 지우기
            </button>
            {s.hole.length === 2 && s.board.length < 5 ? (
              <button
                type="button"
                className="min-h-11 rounded-xl bg-accent-2 px-4 text-sm font-semibold text-[#2a1605]"
                onClick={() => s.setPickerFor('board')}
              >
                {s.board.length < 3 ? '플랍 입력' : s.board.length === 3 ? '턴 입력' : '리버 입력'}
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <PlayingCard
              key={i}
              card={s.board[i]}
              size="md"
              dimmed={i >= s.board.length}
              onClick={() => {
                if (s.board[i]) s.removeBoardFrom(i)
                else if (s.hole.length === 2 && s.board.length < 5) s.setPickerFor('board')
              }}
            />
          ))}
        </div>
      </section>

      <section className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="rounded-3xl border border-line bg-panel/80 p-4">
          <div className="mb-2 text-sm text-mute">상대 수</div>
          <select
            className="min-h-12 w-full rounded-xl border border-line bg-panel-2 px-3"
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
        <div className="rounded-3xl border border-line bg-panel/80 p-4">
          <div className="mb-2 text-sm text-mute">내 포지션</div>
          <div className="grid grid-cols-2 gap-2">
            {POSITIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={clsx(
                  'min-h-11 rounded-xl border px-2 text-sm',
                  s.position === p.id
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-line bg-panel-2',
                )}
                onClick={() => s.setPosition(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-3xl border border-accent/30 bg-gradient-to-b from-panel to-panel-2 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">3. 확률 · 전략</h2>
          {s.pending ? <span className="text-sm text-accent">계산 중…</span> : null}
        </div>

        {s.hole.length < 2 ? (
          <p className="text-mute">홀카드 2장을 입력하면 승률과 배팅 전략이 표시됩니다.</p>
        ) : s.equity && s.advice ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="승률" value={`${s.equity.winPct.toFixed(1)}%`} accent />
              <Stat label="타이" value={`${s.equity.tiePct.toFixed(1)}%`} />
              <Stat label="패배" value={`${s.equity.losePct.toFixed(1)}%`} />
            </div>

            <div
              className={clsx(
                'rounded-2xl border px-4 py-4',
                s.advice.action === 'fold' && 'border-danger/40 bg-danger/10',
                s.advice.action === 'raise' && 'border-accent/40 bg-accent/10',
                s.advice.action === 'all_in' && 'border-accent-2/50 bg-accent-2/10',
                s.advice.action === 'check_call' && 'border-line bg-panel',
              )}
            >
              <div className="text-xs uppercase tracking-widest text-mute">
                {STREET_KO[s.advice.street]} · 신뢰도 {s.advice.confidence}
              </div>
              <div className="he-title mt-1 text-3xl text-accent-2 sm:text-4xl">
                {s.advice.actionLabel}
              </div>
              <div className="mt-1 text-lg font-semibold">{s.advice.title}</div>
              <div className="mt-2 text-sm text-mute">핸드: {s.advice.handLabel}</div>
              {s.advice.draws.length ? (
                <div className="mt-1 text-sm text-accent">드로우: {s.advice.draws.join(', ')}</div>
              ) : null}
              <ul className="mt-3 space-y-1.5 text-sm text-ink/90">
                {s.advice.reasons.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-accent">▸</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <StreetTimeline snapshots={s.snapshots} />

            <div className="rounded-2xl border border-line bg-panel px-3 py-3">
              <div className="mb-2 text-sm font-semibold">핸드 결과 저장 & 계속 진행</div>
              <p className="mb-3 text-xs text-mute">
                결과를 저장하면 오늘 흐름·모멘텀에 반영됩니다. 저장 후 바로 다음 핸드를 입력하세요.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={clsx('min-h-12 rounded-xl px-3 text-sm font-semibold', o.className)}
                    onClick={() => s.saveAndNext(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {s.lastSavedId ? (
                <p className="mt-2 text-xs text-accent">저장됨 · 다음 핸드를 입력하세요</p>
              ) : null}
            </div>

            <p className="text-xs text-mute">
              몬테카를로 {s.equity.trials.toLocaleString('ko-KR')}회 시뮬레이션 · 상대 {s.equity.opponents}명
              랜덤 핸드 기준. 참고용이며 실제 테이블 상황·스택·성향을 함께 고려하세요.
            </p>
          </div>
        ) : (
          <p className="text-mute">계산 준비 중…</p>
        )}
      </section>

      {s.pickerFor ? (
        <CardPicker used={s.used} onPick={s.pickCard} onClose={() => s.setPickerFor(null)} />
      ) : null}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-3 py-3">
      <div className="text-xs text-mute">{label}</div>
      <div className={clsx('he-num mt-1 text-xl font-bold sm:text-2xl', accent && 'text-accent')}>
        {value}
      </div>
    </div>
  )
}
