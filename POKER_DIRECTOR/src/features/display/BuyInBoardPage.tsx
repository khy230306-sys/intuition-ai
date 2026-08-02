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
      <div className="grid min-h-dvh place-items-center bg-[#050505] text-2xl text-[#f5e6b2]">
        토너먼트를 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#050505] p-4 text-[#f5e6b2] sm:p-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-7xl flex-col">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="pd-title text-4xl sm:text-6xl">바인 체크판</div>
            <div className="mt-1 text-sm opacity-70 sm:text-lg">POKER DIRECTOR · {bundle.tournament.name}</div>
          </div>
          <div className="flex flex-wrap items-end gap-4 sm:gap-6">
            <div className="text-right">
              <div className="text-sm opacity-60 sm:text-base">총 바인</div>
              <div className="pd-num text-2xl text-amber-300 sm:text-3xl">{formatNumber(totalMarks)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-60 sm:text-base">인원</div>
              <div className="pd-num text-2xl text-amber-300 sm:text-3xl">{formatNumber(rows.length)}</div>
            </div>
            <div className="no-print flex flex-wrap gap-2">
              <button
                type="button"
                className={clsx(
                  'min-h-11 rounded-xl border border-white/20 px-3 text-sm',
                  checkMode && 'bg-white/10',
                )}
                onClick={() => setCheckMode((v) => !v)}
              >
                {checkMode ? '체크 모드 ON' : '표시 전용'}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-white/20 px-3 text-sm"
                onClick={() => document.documentElement.requestFullscreen?.()}
              >
                전체 화면
              </button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
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

        <footer className="mt-4 rounded-2xl border border-white/10 p-4 text-center text-lg opacity-70 sm:text-2xl">
          正 하나 = 바인 5회 · 왼쪽 TV와 동일한 표시 크기
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
    <div className="flex h-full flex-col rounded-3xl border border-white/10 p-4 sm:p-6">
      <div className="grid grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.6fr)_3.5rem] items-center gap-2 border-b border-white/15 px-1 pb-3 text-sm opacity-60 sm:grid-cols-[3.5rem_minmax(0,1.1fr)_minmax(0,1.8fr)_4rem_auto] sm:gap-3 sm:text-base">
        <div>#</div>
        <div>닉네임</div>
        <div>바인(正)</div>
        <div className="text-right">합</div>
        {checkMode ? <div className="hidden sm:block" /> : null}
      </div>
      <ul className="flex flex-1 flex-col">
        {rows.map((row, i) => (
          <li
            key={row.entry.id}
            className={clsx(
              'grid flex-1 grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.6fr)_3.5rem] items-center gap-2 border-b border-white/10 px-1 py-3 sm:grid-cols-[3.5rem_minmax(0,1.1fr)_minmax(0,1.8fr)_4rem_auto] sm:gap-3 sm:py-4',
              row.eliminated && 'opacity-40',
            )}
          >
            <div className="pd-num text-xl opacity-60 sm:text-2xl">{startIndex + i + 1}</div>
            <div className="truncate text-2xl font-semibold sm:text-3xl">{row.name}</div>
            <div className="min-w-0">
              <JeongTally count={row.marks} className="text-3xl text-amber-300 sm:text-4xl" />
            </div>
            <div className="pd-num text-right text-2xl font-bold text-amber-300 sm:text-3xl">
              {row.marks}
            </div>
            {checkMode ? (
              <div className="col-span-4 mt-2 flex gap-2 sm:col-span-1 sm:mt-0 sm:justify-end">
                <button
                  type="button"
                  className="min-h-12 min-w-12 rounded-xl border border-white/20 text-2xl font-bold"
                  onClick={() => onMinus(row.entry.id)}
                  aria-label={`${row.name} 바인 감소`}
                >
                  −
                </button>
                <button
                  type="button"
                  className="min-h-12 min-w-12 rounded-xl border border-amber-300/40 bg-amber-300/15 text-2xl font-bold text-amber-300"
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
          <li className="grid flex-1 place-items-center text-xl opacity-60 sm:text-2xl">
            등록된 참가자가 없습니다.
          </li>
        ) : null}
      </ul>
    </div>
  )
}
