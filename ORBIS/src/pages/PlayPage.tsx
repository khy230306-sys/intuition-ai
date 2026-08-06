import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playClickSound, playCoreSound, playResultSound, playSyncSound } from '../app/sound'
import { Button } from '../components/Button'
import { RoundStage } from '../game/RoundStage'
import { evaluateSync, gradeLabel, loadDemoEnergy, saveDemoEnergy } from '../game/score'
import { getStoryText } from '../game/stories'
import type { OrbId, RoundPhase, RoundResult } from '../game/types'
import { useI18n } from '../i18n'
import { useSettings } from '../storage/SettingsContext'
import styles from './PlayPage.module.css'

const BASE_SPEED = 160 // degrees per second

export function PlayPage() {
  const t = useI18n()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [phase, setPhase] = useState<RoundPhase>('select')
  const [selected, setSelected] = useState<OrbId | null>(null)
  const [markerAngle, setMarkerAngle] = useState(0)
  const [result, setResult] = useState<RoundResult | null>(null)
  const [energyTotal, setEnergyTotal] = useState(() => loadDemoEnergy())
  const [flash, setFlash] = useState(false)
  const [round, setRound] = useState(1)

  const angleRef = useRef(0)
  const rafRef = useRef(0)
  const lastTsRef = useRef(0)
  const phaseRef = useRef<RoundPhase>('select')

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    lastTsRef.current = 0
  }, [])

  useEffect(() => () => stopLoop(), [stopLoop])

  const startRunning = useCallback(() => {
    if (!selected) return
    stopLoop()
    setResult(null)
    phaseRef.current = 'running'
    setPhase('running')
    playCoreSound(settings.soundEnabled)

    const speed = BASE_SPEED + Math.min(80, (round - 1) * 12)
    const tick = (ts: number) => {
      if (phaseRef.current !== 'running') return
      if (!lastTsRef.current) lastTsRef.current = ts
      const delta = Math.min(0.05, (ts - lastTsRef.current) / 1000)
      lastTsRef.current = ts
      angleRef.current = (angleRef.current + speed * delta) % 360
      setMarkerAngle(angleRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [round, selected, settings.soundEnabled, stopLoop])

  const onSync = () => {
    if (phaseRef.current !== 'running' || !selected) return
    phaseRef.current = 'result'
    stopLoop()
    playSyncSound(settings.soundEnabled)
    const next = evaluateSync(selected, angleRef.current)
    setResult(next)
    setPhase('result')
    setFlash(true)
    window.setTimeout(() => setFlash(false), 420)

    const total = energyTotal + next.energy
    setEnergyTotal(total)
    saveDemoEnergy(total)
    playResultSound(settings.soundEnabled, next.grade === 'perfect' || next.grade === 'great')
  }

  const chooseOrb = (orb: OrbId) => {
    if (phase === 'running') return
    playClickSound(settings.soundEnabled)
    setSelected(orb)
    setResult(null)
    setPhase('ready')
  }

  const playAgain = () => {
    playClickSound(settings.soundEnabled)
    setResult(null)
    setRound((value) => value + 1)
    setPhase(selected ? 'ready' : 'select')
  }

  return (
    <div className={`page-fade ${styles.page}`}>
      <header className={styles.header}>
        <p className={styles.kicker}>{t.play.kicker}</p>
        <h1 className={styles.title}>{t.play.title}</h1>
        <p className={styles.subtitle}>{t.play.subtitle}</p>
      </header>

      <div className={styles.energyBar}>
        <span>{t.play.demoEnergy}</span>
        <span className={styles.energyValue}>{energyTotal}</span>
      </div>
      <p className={styles.notice}>{t.play.freeNotice}</p>

      <RoundStage
        selected={selected}
        markerAngle={markerAngle}
        running={phase === 'running'}
        flash={flash}
        reduceMotion={settings.reduceMotion}
        label={t.play.stageLabel}
      />

      <div className={styles.orbSelect} role="group" aria-label={t.play.chooseOrb}>
        {(
          [
            ['blue', t.play.orbBlue, styles.orbBlue],
            ['gold', t.play.orbGold, styles.orbGold],
            ['violet', t.play.orbViolet, styles.orbViolet],
          ] as Array<[OrbId, string, string]>
        ).map(([orb, label, tone]) => (
          <button
            key={orb}
            type="button"
            className={`${styles.orbButton} ${tone} ${selected === orb ? styles.orbActive : ''}`}
            aria-pressed={selected === orb}
            disabled={phase === 'running'}
            onClick={() => chooseOrb(orb)}
          >
            {label}
          </button>
        ))}
      </div>

      {phase === 'select' ? <p className={styles.hint}>{t.play.selectHint}</p> : null}
      {phase === 'ready' ? <p className={styles.hint}>{t.play.readyHint}</p> : null}
      {phase === 'running' ? <p className={styles.hint}>{t.play.runningHint}</p> : null}

      {result ? (
        <section className={styles.resultCard} aria-live="polite">
          <p
            className={`${styles.grade} ${
              result.grade === 'perfect'
                ? styles.gradePerfect
                : result.grade === 'great'
                  ? styles.gradeGreat
                  : result.grade === 'good'
                    ? styles.gradeGood
                    : styles.gradeMiss
            }`}
          >
            {gradeLabel(result.grade, settings.language)}
          </p>
          <p className={styles.story}>
            {getStoryText(result.orb, result.grade, settings.language)}
          </p>
          <p className={styles.meta}>
            {t.play.roundLabel} {round} · +{result.energy} {t.play.energyUnit} · Δ
            {result.angleError}°
          </p>
        </section>
      ) : null}

      <div className={styles.actions}>
        {phase === 'ready' ? (
          <Button variant="primary" onClick={startRunning}>
            {t.play.startRound}
          </Button>
        ) : null}
        {phase === 'running' ? (
          <Button variant="primary" onClick={onSync}>
            {t.play.syncNow}
          </Button>
        ) : null}
        {phase === 'result' ? (
          <Button variant="primary" onClick={playAgain}>
            {t.play.playAgain}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => navigate('/')}>
          {t.actions.backHome}
        </Button>
      </div>
    </div>
  )
}
