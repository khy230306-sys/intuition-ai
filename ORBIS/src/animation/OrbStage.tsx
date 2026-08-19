import { memo, useMemo } from 'react'
import { useSettings } from '../storage/SettingsContext'
import styles from './OrbStage.module.css'
import { useParallax } from './useParallax'
import { useVisibilityPause } from './useVisibilityPause'

type OrbStageProps = {
  label: string
}

function createStars(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const left = ((index * 47) % 100)
    const top = ((index * 29) % 100)
    const delay = (index % 12) * 0.35
    const duration = 18 + (index % 7) * 3
    return { id: index, left, top, delay, duration }
  })
}

function OrbStageComponent({ label }: OrbStageProps) {
  const { settings } = useSettings()
  const visible = useVisibilityPause()
  const reduced =
    settings.reduceMotion ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const starCount =
    settings.animationQuality === 'high'
      ? 28
      : settings.animationQuality === 'medium'
        ? 16
        : 8

  const stars = useMemo(() => createStars(starCount), [starCount])
  const parallaxRef = useParallax<HTMLDivElement>({
    enabled: !reduced && settings.animationQuality !== 'low',
    intensity: settings.animationQuality === 'high' ? 10 : 6,
  })

  const qualityClass =
    settings.animationQuality === 'low'
      ? styles.qualityLow
      : settings.animationQuality === 'high'
        ? styles.qualityHigh
        : styles.qualityMedium

  return (
    <div
      ref={parallaxRef}
      className={[
        styles.stage,
        qualityClass,
        !visible ? styles.paused : '',
        reduced ? styles.reduced : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={label}
    >
      <div className={styles.nebula} />
      <div className={styles.stars}>
        {stars.map((star) => (
          <span
            key={star.id}
            className={styles.star}
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>

      <div className={`${styles.orbitRing} ${styles.orbitRingBlue}`} />
      <div className={`${styles.orbitRing} ${styles.orbitRingGold}`} />
      <div className={`${styles.orbitRing} ${styles.orbitRingViolet}`} />

      <div className={`${styles.orbTrack} ${styles.trackBlue}`}>
        <span className={`${styles.orb} ${styles.orbBlue}`} />
      </div>
      <div className={`${styles.orbTrack} ${styles.trackGold}`}>
        <span className={`${styles.orb} ${styles.orbGold}`} />
      </div>
      <div className={`${styles.orbTrack} ${styles.trackViolet}`}>
        <span className={`${styles.orb} ${styles.orbViolet}`} />
      </div>

      <div className={styles.coreWrap}>
        <div className={styles.coreHalo} />
        <div className={styles.core} />
      </div>
    </div>
  )
}

export const OrbStage = memo(OrbStageComponent)
