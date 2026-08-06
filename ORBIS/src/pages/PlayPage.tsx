import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playClickSound, playCoreSound, playResultSound, playSyncSound } from '../app/sound'
import { Button } from '../components/Button'
import { PlayingCard } from '../components/PlayingCard'
import { createShoe, dealBaccaratRound, settlePayout } from '../game/baccarat/engine'
import {
  STARTING_BALANCE,
  loadBalance,
  loadRoad,
  resetTableProgress,
  saveBalance,
  saveRoad,
} from '../game/baccarat/storage'
import type {
  Card,
  RoadBead,
  RoundOutcome,
  Side,
  TablePhase,
} from '../game/baccarat/types'
import { useI18n } from '../i18n'
import { useSettings } from '../storage/SettingsContext'
import styles from './PlayPage.module.css'

const CHIP_VALUES = [10, 50, 100, 250] as const

type VisibleHands = {
  player: Card[]
  banker: Card[]
}

export function PlayPage() {
  const t = useI18n()
  const navigate = useNavigate()
  const { settings } = useSettings()

  const shoeRef = useRef<Card[]>(createShoe(6))
  const [phase, setPhase] = useState<TablePhase>('betting')
  const [side, setSide] = useState<Side>('player')
  const [chip, setChip] = useState<(typeof CHIP_VALUES)[number]>(50)
  const [balance, setBalance] = useState(() => loadBalance())
  const [road, setRoad] = useState<RoadBead[]>(() => loadRoad())
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const [visible, setVisible] = useState<VisibleHands>({ player: [], banker: [] })
  const [payout, setPayout] = useState(0)
  const [message, setMessage] = useState('')

  const betAmount = chip
  const canDeal = phase === 'betting' && balance >= betAmount && betAmount > 0

  const winnerClass = useMemo(() => {
    if (!outcome || phase !== 'result') return ''
    if (outcome.winner === 'player') return styles.winnerPlayer
    if (outcome.winner === 'banker') return styles.winnerBanker
    return styles.winnerTie
  }, [outcome, phase])

  useEffect(() => {
    saveBalance(balance)
  }, [balance])

  useEffect(() => {
    saveRoad(road)
  }, [road])

  const sideLabel = (value: Side) => {
    if (value === 'player') return t.play.player
    if (value === 'banker') return t.play.banker
    return t.play.tie
  }

  const revealHands = async (next: RoundOutcome) => {
    setVisible({ player: [], banker: [] })
    const sequence: Array<['player' | 'banker', Card]> = []
    next.player.cards.forEach((card, index) => {
      if (index < 2) sequence.push(['player', card])
    })
    next.banker.cards.forEach((card, index) => {
      if (index < 2) sequence.push(['banker', card])
    })
    if (next.player.cards[2]) sequence.push(['player', next.player.cards[2]])
    if (next.banker.cards[2]) sequence.push(['banker', next.banker.cards[2]])

    for (const [hand, card] of sequence) {
      await wait(settings.reduceMotion ? 80 : 280)
      playSyncSound(settings.soundEnabled)
      setVisible((prev) => ({
        ...prev,
        [hand]: [...prev[hand], card],
      }))
    }
  }

  const startDeal = async () => {
    if (!canDeal) return
    playCoreSound(settings.soundEnabled)
    setPhase('dealing')
    setOutcome(null)
    setPayout(0)
    setMessage(t.play.dealing)
    setBalance((prev) => prev - betAmount)

    const next = dealBaccaratRound(shoeRef.current)
    setOutcome(next)
    await revealHands(next)

    const won = settlePayout(side, betAmount, next.winner)
    setPayout(won)
    setBalance((prev) => prev + won)
    setRoad((prev) => [
      ...prev,
      { winner: next.winner, id: `${Date.now()}-${next.winner}-${prev.length}` },
    ].slice(-48))

    const winText =
      next.winner === 'tie'
        ? t.play.resultTie
        : next.winner === 'player'
          ? t.play.resultPlayer
          : t.play.resultBanker

    if (won > betAmount) {
      setMessage(`${winText} · ${t.play.youWin} +${won - betAmount}`)
      playResultSound(settings.soundEnabled, true)
    } else if (won === betAmount) {
      setMessage(`${winText} · ${t.play.stakeReturned}`)
      playResultSound(settings.soundEnabled, true)
    } else {
      setMessage(`${winText} · ${t.play.youLose}`)
      playResultSound(settings.soundEnabled, false)
    }

    setPhase('result')
  }

  const nextRound = () => {
    playClickSound(settings.soundEnabled)
    setOutcome(null)
    setVisible({ player: [], banker: [] })
    setPayout(0)
    setMessage('')
    setPhase('betting')
  }

  const onReset = () => {
    playClickSound(settings.soundEnabled)
    resetTableProgress()
    shoeRef.current = createShoe(6)
    setBalance(STARTING_BALANCE)
    setRoad([])
    setOutcome(null)
    setVisible({ player: [], banker: [] })
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

      <section className={styles.table}>
        <div className={styles.hands}>
          <article className={`${styles.hand} ${winnerClass}`}>
            <h2 className={styles.handTitle}>{t.play.player}</h2>
            <p className={styles.handTotal}>
              {visible.player.length
                ? visible.player.reduce((sum, card) => sum + baccaratValue(card), 0) % 10
                : '-'}
            </p>
            <div className={styles.cards}>
              {visible.player.map((card) => (
                <PlayingCard key={card.id} card={card} />
              ))}
              {phase === 'dealing' && visible.player.length === 0 ? (
                <PlayingCard hidden />
              ) : null}
            </div>
          </article>

          <article className={`${styles.hand} ${winnerClass}`}>
            <h2 className={styles.handTitle}>{t.play.banker}</h2>
            <p className={styles.handTotal}>
              {visible.banker.length
                ? visible.banker.reduce((sum, card) => sum + baccaratValue(card), 0) % 10
                : '-'}
            </p>
            <div className={styles.cards}>
              {visible.banker.map((card) => (
                <PlayingCard key={card.id} card={card} />
              ))}
              {phase === 'dealing' && visible.banker.length === 0 ? (
                <PlayingCard hidden />
              ) : null}
            </div>
          </article>
        </div>

        <div className={styles.sides} role="group" aria-label={t.play.chooseSide}>
          {(
            [
              ['player', t.play.player, t.play.oddsPlayer, styles.sidePlayer],
              ['banker', t.play.banker, t.play.oddsBanker, styles.sideBanker],
              ['tie', t.play.tie, t.play.oddsTie, styles.sideTie],
            ] as Array<[Side, string, string, string]>
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
      </section>

      {phase === 'result' && outcome ? (
        <section className={styles.resultCard} aria-live="polite">
          <h2 className={styles.resultTitle}>{message}</h2>
          <p className={styles.resultBody}>
            {t.play.player} {outcome.player.total} : {t.play.banker} {outcome.banker.total}
            {payout > 0 ? ` · ${t.play.payout} ${payout}` : ''}
          </p>
        </section>
      ) : null}

      {phase === 'dealing' ? <p className={styles.notice}>{t.play.dealing}</p> : null}

      <div className={styles.roadWrap}>
        <p className={styles.roadTitle}>{t.play.road}</p>
        <div className={styles.road} aria-label={t.play.road}>
          {Array.from({ length: 16 }, (_, index) => {
            const bead = road[road.length - 16 + index]
            if (!bead) {
              return <span key={`empty-${index}`} className={`${styles.bead} ${styles.beadEmpty}`} />
            }
            const tone =
              bead.winner === 'player'
                ? styles.beadPlayer
                : bead.winner === 'banker'
                  ? styles.beadBanker
                  : styles.beadTie
            const mark =
              bead.winner === 'player' ? 'P' : bead.winner === 'banker' ? 'B' : 'T'
            return (
              <span key={bead.id} className={`${styles.bead} ${tone}`}>
                {mark}
              </span>
            )
          })}
        </div>
      </div>

      <div className={styles.actions}>
        {phase === 'betting' ? (
          <Button variant="primary" disabled={!canDeal} onClick={() => void startDeal()}>
            {balance < betAmount ? t.play.needChips : t.play.deal}
          </Button>
        ) : null}
        {phase === 'result' ? (
          <Button variant="primary" onClick={nextRound}>
            {t.play.nextRound}
          </Button>
        ) : null}
        <Button variant="secondary" disabled={phase === 'dealing'} onClick={onReset}>
          {t.play.reset}
        </Button>
        <Button variant="ghost" className={styles.cardWide} onClick={() => navigate('/')}>
          {t.actions.backHome}
        </Button>
      </div>
    </div>
  )
}

function baccaratValue(card: Card): number {
  if (card.rank === 'A') return 1
  if (card.rank === '10' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 0
  return Number(card.rank)
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
