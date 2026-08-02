import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { useTournamentBundle } from '@/hooks/useTournament'
import { useTimerAlerts } from '@/hooks/useTimerAlerts'
import { formatDuration, formatMoney, formatNumber } from '@/utils/time'
import type { DisplayTheme } from '@/types'
import clsx from 'clsx'

const themes: Record<DisplayTheme, string> = {
  black_gold: 'bg-[#050505] text-[#f5e6b2]',
  black_red: 'bg-[#0a0505] text-[#ffd0d0]',
  navy_blue: 'bg-[#061225] text-[#d7e7ff]',
  light: 'bg-[#f4f7f5] text-[#111]',
}

export function TvDisplayPage() {
  const { id } = useParams()
  const bundle = useTournamentBundle(id)
  useTimerAlerts(id)
  const settings = useAppStore((s) => s.settings[0])
  const setDisplayTheme = useAppStore((s) => s.setDisplayTheme)
  const [theme, setTheme] = useState<DisplayTheme>(settings?.displayTheme ?? 'black_gold')
  const live = bundle.live

  if (!bundle.tournament || !live) {
    return <div className="grid min-h-dvh place-items-center text-2xl">토너먼트를 찾을 수 없습니다.</div>
  }

  const level = live.currentLevel
  const next = live.nextLevel
  const nextBreak = bundle.structure?.levels
    .slice(bundle.timer?.currentLevelIndex ?? 0)
    .find((l) => l.isBreak)

  const accent =
    theme === 'black_red'
      ? 'text-rose-400'
      : theme === 'navy_blue'
        ? 'text-sky-300'
        : theme === 'light'
          ? 'text-amber-700'
          : 'text-amber-300'

  return (
    <div className={clsx('min-h-dvh p-4 sm:p-8', themes[theme])}>
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-7xl flex-col">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="pd-title text-4xl sm:text-6xl">{bundle.tournament.name}</div>
            <div className="mt-1 text-sm opacity-70 sm:text-lg">POKER DIRECTOR</div>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {(Object.keys(themes) as DisplayTheme[]).map((key) => (
              <button
                key={key}
                className="min-h-11 rounded-xl border border-white/20 px-3 text-sm"
                onClick={() => {
                  setTheme(key)
                  setDisplayTheme(key)
                }}
              >
                {key}
              </button>
            ))}
            <button
              className="min-h-11 rounded-xl border border-white/20 px-3 text-sm"
              onClick={() => document.documentElement.requestFullscreen?.()}
            >
              전체 화면
            </button>
          </div>
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-white/10 p-6 text-center sm:p-10">
            <div className="text-xl opacity-70 sm:text-2xl">
              LEVEL {live.levelNumber}
              {level?.isBreak ? ' · BREAK' : ''}
              {live.status === 'running' ? ' · LIVE' : ''}
            </div>
            <div className={clsx('pd-num mt-4 text-7xl font-bold sm:text-9xl', accent)}>
              {formatDuration(live.remainingMs)}
            </div>
            <div className="pd-num mt-6 text-4xl sm:text-6xl">
              {level?.isBreak
                ? 'BREAK'
                : `${formatNumber(level?.smallBlind ?? 0)} / ${formatNumber(level?.bigBlind ?? 0)}`}
            </div>
            <div className="mt-3 text-lg opacity-70 sm:text-2xl">
              Ante {formatNumber(level?.ante ?? 0)} · BB Ante {formatNumber(level?.bigBlindAnte ?? 0)}
            </div>
            <div className="mt-6 text-lg sm:text-2xl">
              NEXT{' '}
              {next
                ? next.isBreak
                  ? `BREAK ${next.breakMinutes ?? next.durationMinutes}m`
                  : `${formatNumber(next.smallBlind)} / ${formatNumber(next.bigBlind)}`
                : '-'}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              ['남은 플레이어', formatNumber(bundle.remaining)],
              ['총 참가자', formatNumber(bundle.entries.length)],
              ['평균 스택', formatNumber(bundle.avgStack)],
              ['총 칩', formatNumber(bundle.totalChips)],
              ['테이블', formatNumber(bundle.activeTables)],
              ['총 상금', formatMoney(bundle.pool?.netPrizePool ?? 0)],
              ['다음 브레이크', nextBreak ? `Lv ${nextBreak.levelNumber}` : '-'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 p-4">
                <div className="text-sm opacity-60 sm:text-base">{label}</div>
                <div className={clsx('pd-num mt-1 text-2xl sm:text-3xl', accent)}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {bundle.announcements[0] ? (
          <div className="mt-4 rounded-2xl border border-white/10 p-4 text-center text-lg sm:text-2xl">
            {bundle.announcements[0].body}
          </div>
        ) : null}
      </div>
    </div>
  )
}
