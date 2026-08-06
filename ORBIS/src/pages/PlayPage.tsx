import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playClickSound, playCoreSound, playResultSound, playSyncSound } from '../app/sound'
import { Button } from '../components/Button'
import { TrinityStage } from '../game/trinity/TrinityStage'
import { drawTrinityRound, settleTrinityPayout, sideMark } from '../game/trinity/engine'
import {
  STARTING_BALANCE,
  loadBalance,
  loadRoad,
  resetTrinityProgress,
  saveBalance,
  saveRoad,
} from '../game/trinity/storage'
import type { BetSide, OrbColor, RoadBead, RoundOutcome, TablePhase } from '../game/trinity/types'
import { useI18n } from '../i18n'
import { useSettings } from '../storage/SettingsContext'
import styles from './PlayPage.module.css'

const CHIP_VALUES = [10, 50, 100, 250] as const

export function PlayPage() {
  const t = useI18n()
  const navigate = useNavigate()
  const { settings } = useSettings()

  const [phase, setPhase] = useState<TablePhase>('betting')
  const [side, setSide] = useState<BetSide>('blue')
  const [chip, setChip] = useState<(typeof CHIP_VALUES)[number]>(50)
  const [balance, setBalance] = useState(() => loadBalance())
  const [road, setRoad] = useState<RoadBead[]>(() => loadRoad())
  const [revealed, setRevealed] = useState<Array<OrbColor | null>>([null, null, null])
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const [payout, setPayout] = useState(0)
  const [flash, setFlash] = useState(false)
  const [message, setMessage] = useState('')

  const betAmount = chip
  const canDraw = phase === 'betting' && balance >= betAmount

  useEffect(() => {
    saveBalance(balance)
  }, [balance])

  useEffect(() => {
    saveRoad(road)
  }, [road])

  const sideLabel = (value: BetSide) => {
    if (value === 'blue') return t.play.blue
    if (value === 'gold') return t.play.gold
    if (value === 'violet') return t.play.violet
    return t.play.void
  }

  const startDraw = async () => {
    if (!canDraw) return
    playCoreSound(settings.soundEnabled)
    setPhase('drawing')
    setOutcome(null)
    setPayout(0)
    setMessage(t.play.drawing)
    setRevealed([null, null, null])
    setBalance((prev) => prev - betAmount)

    const next = drawTrinityRound()
    const delay = settings.reduceMotion ? 90 : 420

    for (let i = 0; i < 3; i += 1) {
      await wait(delay)
      playSyncSound(settings.soundEnabled)
      setRevealed((prev) => {
        const copy = [...prev] as Array<OrbColor | null>
        copy[i] = next.draws[i]!
        return copy
      })
    }

    await wait(settings.reduceMotion ? 60 : 220)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 480)

    const won = settleTrinityPayout(side, betAmount, next)
    setOutcome(next)
    setPayout(won)
    setBalance((prev) => prev + won)
    setRoad((prev) =>
      [
        ...prev,
        {
          id: `${Date.now()}-${next.winner}-${prev.length}`,
          winner: next.winner,
          pattern: next.pattern,
        },
      ].slice(-48),
    )

    const patternText =
      next.pattern === 'trinity'
        ? t.play.patternTrinity
        : next.pattern === 'void'
          ? t.play.patternVoid
          : t.play.patternMajority

    if (won > betAmount) {
      setMessage(`${patternText} · ${t.play.youWin} +${won - betAmount}`)
      playResultSound(settings.soundEnabled, true)
    } else if (won === betAmount) {
      setMessage(`${patternText} · ${t.play.stakeReturned}`)
      playResultSound(settings.soundEnabled, true)
    } else {
      setMessage(`${patternText} · ${t.play.youLose}`)
      playResultSound(settings.soundEnabled, false)
    }

    setPhase('result')
  }

  const nextRound = () => {
    playClickSound(settings.soundEnabled)
    setOutcome(null)
    setRevealed([null, null, null])
    setPayout(0)
    setMessage('')
    setPhase('betting')
  }

  const onReset = () => {
    playClickSound(settings.soundEnabled)
    resetTrinityProgress()
    setBalance(STARTING_BALANCE)
    setRoad([])
    setOutcome(null)
    setRevealed([null, null, null])
    setPayout(0)
    setMessage('')
    setPhase('betting')
  }

  return (
    <div className={`page-fade ${styles.page}`}>
      <header className={styles.header}>
        <p className={styles.kicker}>{t.play.kicker}</p>
        <h1 className={styles.title}>{t.play.title}</h1>
        <p className={styles.subtitle}>{t.play.subtitle}</p>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t.play.balance}</span>
          <span className={styles.statValue}>{balance}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t.play.currentBet}</span>
          <span className={styles.statValue}>
            {sideLabel(side)} · {betAmount}
          </span>
        </div>
      </div>

      <p className={styles.notice}>{t.play.freeNotice}</p>
      <p className={styles.rules}>{t.play.rules}</p>

      <TrinityStage
        revealed={revealed}
        drawing={phase === 'drawing'}
        flash={flash}
        reduceMotion={settings.reduceMotion}
        label={t.play.stageLabel}
      />

      <div className={styles.sides} role="group" aria-label={t.play.chooseSide}>
        {(
          [
            ['blue', t.play.blue, t.play.oddsColor, styles.sideBlue],
            ['gold', t.play.gold, t.play.oddsColor, styles.sideGold],
            ['violet', t.play.violet, t.play.oddsColor, styles.sideViolet],
            ['void', t.play.void, t.play.oddsVoid, styles.sideVoid],
          ] as Array<[BetSide, string, string, string]>
        ).map(([value, label, odds, tone]) => (
          <button
            key={value}
            type="button"
            className={`${styles.sideButton} ${tone} ${side === value ? styles.sideActive : ''}`}
            disabled={phase !== 'betting'}
            aria-pressed={side === value}
            onClick={() => {
              playClickSound(settings.soundEnabled)
              setSide(value)
            }}
          >
            <span>{label}</span>
            <span className={styles.odds}>{odds}</span>
          </button>
        ))}
      </div>

      <div className={styles.chips} role="group" aria-label={t.play.chooseChip}>
        {CHIP_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            className={`${styles.chip} ${chip === value ? styles.chipActive : ''}`}
            disabled={phase !== 'betting'}
            aria-pressed={chip === value}
            onClick={() => {
              playClickSound(settings.soundEnabled)
              setChip(value)
            }}
          >
            {value}
          </button>
        ))}
      </div>

      <div className={styles.betLine}>
        <span>
          {t.play.selected}: {sideLabel(side)}
        </span>
        <span>
          {t.play.stake}: {betAmount}
        </span>
      </div>

      {phase === 'result' && outcome ? (
        <section className={styles.resultCard} aria-live="polite">
          <h2 className={styles.resultTitle}>{message}</h2>
          <p className={styles.resultBody}>
            {t.play.draws}: {outcome.draws.map((c) => sideLabel(c)).join(' · ')}
            {payout > 0 ? ` · ${t.play.payout} ${payout}` : ''}
          </p>
        </section>
      ) : null}

      {phase === 'drawing' ? <p className={styles.notice}>{t.play.drawing}</p> : null}

      <div className={styles.roadWrap}>
        <p className={styles.roadTitle}>{t.play.road}</p>
        <div className={styles.road} aria-label={t.play.road}>
          {Array.from({ length: 16 }, (_, index) => {
            const bead = road[road.length - 16 + index]
            if (!bead) {
              return <span key={`empty-${index}`} className={`${styles.bead} ${styles.beadEmpty}`} />
            }
            const tone =
              bead.winner === 'blue'
                ? styles.beadBlue
                : bead.winner === 'gold'
                  ? styles.beadGold
                  : bead.winner === 'violet'
                    ? styles.beadViolet
                    : styles.beadVoid
            return (
              <span key={bead.id} className={`${styles.bead} ${tone}`}>
                {sideMark(bead.winner)}
              </span>
            )
          })}
        </div>
      </div>

      <div className={styles.actions}>
        {phase === 'betting' ? (
          <Button variant="primary" disabled={!canDraw} onClick={() => void startDraw()}>
            {balance < betAmount ? t.play.needChips : t.play.openCore}
          </Button>
        ) : null}
        {phase === 'result' ? (
          <Button variant="primary" onClick={nextRound}>
            {t.play.nextRound}
          </Button>
        ) : null}
        <Button variant="secondary" disabled={phase === 'drawing'} onClick={onReset}>
          {t.play.reset}
        </Button>
        <Button variant="ghost" className={styles.cardWide} onClick={() => navigate('/')}>
          {t.actions.backHome}
        </Button>
      </div>
    </div>
  )
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
