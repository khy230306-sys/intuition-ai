import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { JeongTally } from '@/components/display/JeongTally'
import { getBuyInMarks } from '@/utils/buyInTally'
import { formatNumber } from '@/utils/time'
import clsx from 'clsx'

export function BuyInBoardPage() {
  const { id } = useParams()
  const bundle = useTournamentBundle(id)
  const addBuyInMark = useAppStore((s) => s.addBuyInMark)
  const removeBuyInMark = useAppStore((s) => s.removeBuyInMark)
  const getEntryName = useAppStore((s) => s.getEntryName)
  const [checkMode, setCheckMode] = useState(true)

  const rows = useMemo(() => {
    if (!bundle.tournament) return []
    return [...bundle.entries]
      .filter((e) => e.status !== 'cancelled')
      .sort((a, b) => a.entryNumber - b.entryNumber)
      .map((entry) => {
        const name = getEntryName(entry.id)
        const marks = getBuyInMarks(entry)
        return {
          entry,
          name,
          marks,
          eliminated: entry.status === 'eliminated',
        }
      })
  }, [bundle.entries, bundle.tournament, getEntryName])

  const totalMarks = rows.reduce((s, r) => s + r.marks, 0)
  const mid = Math.ceil(rows.length / 2)
  const left = rows.slice(0, mid)
  const right = rows.slice(mid)

  if (!bundle.tournament) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f3efe6] text-2xl text-[#1a1a1a]">
        토너먼트를 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#efe9dc] text-[#1c1914]">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,0,0,0.22) 32px)',
        }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-[1600px] flex-col p-3 sm:p-5">
        <header className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#1c1914]/pb-3">
          <div>
            <div className="text-xs font-semibold tracking-[0.2em] text-[#5c5346] sm:text-sm">
              BUY-IN CHECK
            </div>
            <h1 className="pd-title text-3xl leading-none sm:text-5xl">바인 체크판</h1>
            <p className="mt-1 text-sm text-[#5c5346] sm:text-base">{bundle.tournament.name}</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="text-right">
              <div className="text-xs text-[#5c5346]">총 바인</div>
              <div className="pd-num text-3xl font-bold sm:text-4xl">{formatNumber(totalMarks)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#5c5346]">인원</div>
              <div className="pd-num text-3xl font-bold sm:text-4xl">{formatNumber(rows.length)}</div>
            </div>
            <div className="no-print flex flex-wrap gap-2">
              <button
                type="button"
                className={clsx(
                  'min-h-11 rounded-lg border-2 border-[#1c1914] px-3 text-sm font-semibold',
                  checkMode ? 'bg-[#1c1914] text-[#efe9dc]' : 'bg-transparent',
                )}
                onClick={() => setCheckMode((v) => !v)}
              >
                {checkMode ? '체크 모드 ON' : '표시 전용'}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-lg border-2 border-[#1c1914] px-3 text-sm font-semibold"
                onClick={() => document.documentElement.requestFullscreen?.()}
              >
                전체 화면
              </button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-2">
          <BoardColumn
            rows={left}
            checkMode={checkMode}
            onPlus={addBuyInMark}
            onMinus={removeBuyInMark}
          />
          <BoardColumn
            rows={right}
            checkMode={checkMode}
            onPlus={addBuyInMark}
            onMinus={removeBuyInMark}
            startIndex={left.length}
          />
        </div>

        <footer className="mt-3 border-t border-[#1c1914]/40 pt-2 text-xs text-[#5c5346] sm:text-sm">
          正 하나 = 바인 5회 · 오른쪽 모니터용 화면 · 체크 모드에서 +/− 로 표시
        </footer>
      </div>
    </div>
  )
}

function BoardColumn({
  rows,
  checkMode,
  onPlus,
  onMinus,
  startIndex = 0,
}: {
  rows: Array<{
    entry: { id: string }
    name: string
    marks: number
    eliminated: boolean
  }>
  checkMode: boolean
  onPlus: (id: string) => void
  onMinus: (id: string) => void
  startIndex?: number
}) {
  return (
    <div className="rounded-xl border-2 border-[#1c1914]/bg-[#f7f2e7]/px-2 py-1 shadow-[4px_4px_0_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-[2.2rem_minmax(0,1fr)_minmax(0,1.4fr)_2.5rem] gap-1 border-b border-[#1c1914]/60 px-1 py-2 text-[11px] font-semibold tracking-wide text-[#5c5346] sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.6fr)_3rem_auto] sm:text-xs">
        <div>#</div>
        <div>닉네임</div>
        <div>바인(正)</div>
        <div className="text-right">합</div>
        {checkMode ? <div className="hidden sm:block" /> : null}
      </div>
      <ul>
        {rows.map((row, i) => (
          <li
            key={row.entry.id}
            className={clsx(
              'grid grid-cols-[2.2rem_minmax(0,1fr)_minmax(0,1.4fr)_2.5rem] items-center gap-1 border-b border-[#1c1914]/15 px-1 py-1.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.6fr)_3rem_auto] sm:py-2',
              row.eliminated && 'opacity-45',
            )}
          >
            <div className="pd-num text-sm text-[#5c5346] sm:text-base">{startIndex + i + 1}</div>
            <div className="truncate text-base font-semibold sm:text-lg">{row.name}</div>
            <div className="min-w-0 text-[#111]">
              <JeongTally count={row.marks} className="text-lg text-[#111] sm:text-xl" />
            </div>
            <div className="pd-num text-right text-base font-bold sm:text-lg">{row.marks}</div>
            {checkMode ? (
              <div className="col-span-4 mt-1 flex gap-1 sm:col-span-1 sm:mt-0 sm:justify-end">
                <button
                  type="button"
                  className="min-h-10 min-w-10 rounded-md border border-[#1c1914] bg-white text-lg font-bold"
                  onClick={() => onMinus(row.entry.id)}
                  aria-label={`${row.name} 바인 감소`}
                >
                  −
                </button>
                <button
                  type="button"
                  className="min-h-10 min-w-10 rounded-md border border-[#1c1914] bg-[#1c1914] text-lg font-bold text-[#efe9dc]"
                  onClick={() => onPlus(row.entry.id)}
                  aria-label={`${row.name} 바인 증가`}
                >
                  +
                </button>
              </div>
            ) : null}
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="px-2 py-8 text-center text-sm text-[#5c5346]">등록된 참가자가 없습니다.</li>
        ) : null}
      </ul>
    </div>
  )
}
