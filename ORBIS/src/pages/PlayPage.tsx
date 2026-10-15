import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playClickSound, playCoreSound, playResultSound, playSyncSound } from '../app/sound'
import { Button } from '../components/Button'
import { AlignStage } from '../game/align/AlignStage'
import {
  advanceDrift,
  alignmentErrors,
  createRings,
  createStage,
  isAligned,
  nextPhaseAfterTick,
  rotateRing,
  scoreForClear,
} from '../game/align/engine'
import {
  loadBestScore,
  loadUnlockedLevel,
  resetAlignProgress,
  saveBestScore,
  saveUnlockedLevel,
} from '../game/align/storage'
import type { AlignPhase, RingState } from '../game/align/types'
import { useI18n } from '../i18n'
import { useSettings } from '../storage/SettingsContext'
import styles from './PlayPage.module.css'

export function PlayPage() {
  const t = useI18n()
  const navigate = useNavigate()
  const { settings } = useSettings()

  const [level, setLevel] = useState(() => loadUnlockedLevel())
  const [bestScore, setBestScore] = useState(() => loadBestScore())
  const [sessionScore, setSessionScore] = useState(0)
  const [phase, setPhase] = useState<AlignPhase>('ready')
  const [rings, setRings] = useState<RingState[]>(() => createRings(createStage(level)))
  const [selected, setSelected] = useState(0)
  const [timeLeft, setTimeLeft] = useState(() => createStage(level).timeLimitSec)
  const [tolerance, setTolerance] = useState(() => createStage(level).tolerance)
  const [flash, setFlash] = useState(false)
  const [lastGain, setLastGain] = useState(0)
  const [message, setMessage] = useState('')

  const phaseRef = useRef<AlignPhase>('ready')
  const ringsRef = useRef(rings)
  const toleranceRef = useRef(tolerance)
  const timeRef = useRef(timeLeft)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    ringsRef.current = rings
  }, [rings])
  useEffect(() => {
    toleranceRef.current = tolerance
  }, [tolerance])
  useEffect(() => {
    timeRef.current = timeLeft
  }, [timeLeft])

  const errors = useMemo(() => alignmentErrors(rings), [rings])

  const setupLevel = (nextLevel: number) => {
    const config = createStage(nextLevel)
    const nextRings = createRings(config)
    setLevel(nextLevel)
    setRings(nextRings)
    setTolerance(config.tolerance)
    setTimeLeft(config.timeLimitSec)
    setSelected(0)
    setFlash(false)
    setLastGain(0)
    setMessage('')
    setPhase('ready')
  }

  const startLevel = () => {
    playCoreSound(settings.soundEnabled)
    setPhase('playing')
    setMessage(t.play.playingHint)
  }

  useEffect(() => {
    if (phase !== 'playing') return

    let raf = 0
    let last = performance.now()
    let accTime = 0

    const tick = (now: number) => {
      if (phaseRef.current !== 'playing') return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (!settings.reduceMotion) {
        const drifted = advanceDrift(ringsRef.current, dt)
        ringsRef.current = drifted
        setRings(drifted)
      }

      accTime += dt
      if (accTime >= 0.2) {
        accTime = 0
        const nextTime = Math.max(0, timeRef.current - 0.2)
        timeRef.current = nextTime
        setTimeLeft(Number(nextTime.toFixed(1)))
      }

      const nextPhase = nextPhaseAfterTick(
        'playing',
        ringsRef.current,
        toleranceRef.current,
        timeRef.current,
      )

      if (nextPhase === 'cleared') {
        const gain = scoreForClear(
          level,
          timeRef.current,
          toleranceRef.current,
          alignmentErrors(ringsRef.current),
        )
        setLastGain(gain)
        setSessionScore((prev) => {
          const total = prev + gain
          setBestScore((best) => {
            if (total > best) {
              saveBestScore(total)
              return total
            }
            return best
          })
          return total
        })
        const unlocked = Math.min(20, level + 1)
        saveUnlockedLevel(unlocked)
        setFlash(true)
        window.setTimeout(() => setFlash(false), 500)
        setMessage(`${t.play.cleared} · +${gain}`)
        playResultSound(settings.soundEnabled, true)
        setPhase('cleared')
        return
      }

      if (nextPhase === 'failed') {
        setMessage(t.play.failed)
        playResultSound(settings.soundEnabled, false)
        setPhase('failed')
        return
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, level, settings.reduceMotion, settings.soundEnabled, t.play.cleared, t.play.failed])

  const onRotate = (delta: number) => {
    if (phase !== 'playing') return
    playSyncSound(settings.soundEnabled)
    setRings((prev) => {
      const next = rotateRing(prev, selected, delta)
      if (isAligned(next, tolerance)) {
        // alignment will be caught on next animation frame
      }
      return next
    })
  }

  const onResetProgress = () => {
    playClickSound(settings.soundEnabled)
    resetAlignProgress()
    setBestScore(0)
    setSessionScore(0)
    setupLevel(1)
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
          <span className={styles.statLabel}>{t.play.level}</span>
          <span className={styles.statValue}>{level}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t.play.time}</span>
          <span className={styles.statValue}>{Math.ceil(timeLeft)}s</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t.play.score}</span>
          <span className={styles.statValue}>{sessionScore}</span>
        </div>
      </div>

      <p className={styles.notice}>{t.play.freeNotice}</p>
      <p className={styles.rules}>{t.play.rules}</p>

      <AlignStage
        rings={rings}
        selectedIndex={selected}
        flash={flash}
        label={t.play.stageLabel}
      />

      <div className={styles.ringTabs} role="group" aria-label={t.play.chooseRing}>
        {rings.map((ring, index) => (
          <button
            key={ring.id}
            type="button"
            className={`${styles.ringTab} ${
              ring.color === 'blue'
                ? styles.tabBlue
                : ring.color === 'gold'
                  ? styles.tabGold
                  : styles.tabViolet
            } ${selected === index ? styles.tabActive : ''}`}
            disabled={phase !== 'playing' && phase !== 'ready'}
            aria-pressed={selected === index}
            onClick={() => {
              playClickSound(settings.soundEnabled)
              setSelected(index)
            }}
          >
            {ring.color.toUpperCase()}
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.controlBtn}
          disabled={phase !== 'playing'}
          onClick={() => onRotate(-15)}
        >
          ⟪ -15°
        </button>
        <button
          type="button"
          className={styles.controlBtn}
          disabled={phase !== 'playing'}
          onClick={() => onRotate(-5)}
        >
          ⟨ -5°
        </button>
        <button
          type="button"
          className={styles.controlBtn}
          disabled={phase !== 'playing'}
          onClick={() => onRotate(5)}
        >
          +5° ⟩
        </button>
        <button
          type="button"
          className={styles.controlBtn}
          disabled={phase !== 'playing'}
          onClick={() => onRotate(15)}
        >
          +15° ⟫
        </button>
      </div>

      <div className={styles.errors} aria-label={t.play.alignment}>
        {errors.map((err, index) => (
          <div
            key={`err-${index}`}
            className={`${styles.errorItem} ${err <= tolerance ? styles.errorOk : ''}`}
          >
            {rings[index]?.color.toUpperCase()} Δ{err}° / {tolerance}°
          </div>
        ))}
      </div>

      {phase === 'ready' ? <p className={styles.hint}>{t.play.readyHint}</p> : null}
      {phase === 'playing' ? <p className={styles.hint}>{message || t.play.playingHint}</p> : null}

      {phase === 'cleared' || phase === 'failed' ? (
        <section className={styles.resultCard} aria-live="polite">
          <h2 className={styles.resultTitle}>{message}</h2>
          <p className={styles.resultBody}>
            {t.play.bestScore}: {bestScore}
            {lastGain > 0 ? ` · ${t.play.gain} +${lastGain}` : ''}
          </p>
        </section>
      ) : null}

      <div className={styles.actions}>
        {phase === 'ready' ? (
          <Button variant="primary" onClick={startLevel}>
            {t.play.startAlign}
          </Button>
        ) : null}
        {phase === 'cleared' ? (
          <Button variant="primary" onClick={() => setupLevel(Math.min(20, level + 1))}>
            {t.play.nextLevel}
          </Button>
        ) : null}
        {phase === 'failed' ? (
          <Button variant="primary" onClick={() => setupLevel(level)}>
            {t.play.retry}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          disabled={phase === 'playing'}
          onClick={onResetProgress}
        >
          {t.play.reset}
        </Button>
        <Button variant="ghost" className={styles.cardWide} onClick={() => navigate('/')}>
          {t.actions.backHome}
        </Button>
      </div>
    </div>
  )
}
