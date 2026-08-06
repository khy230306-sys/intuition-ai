import { memo } from 'react'
import type { OrbId } from './types'
import { ORB_TARGET_ANGLE } from './types'
import styles from './RoundStage.module.css'

type RoundStageProps = {
  selected: OrbId | null
  markerAngle: number
  running: boolean
  flash: boolean
  reduceMotion: boolean
  label: string
}

function place(angle: number, radiusPercent: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  const x = 50 + Math.cos(rad) * radiusPercent
  const y = 50 + Math.sin(rad) * radiusPercent
  return { left: `${x}%`, top: `${y}%` }
}

function RoundStageComponent({
  selected,
  markerAngle,
  running,
  flash,
  reduceMotion,
  label,
}: RoundStageProps) {
  const markerPos = place(markerAngle, 40)
  const targetPos = selected ? place(ORB_TARGET_ANGLE[selected], 40) : null

  return (
    <div
      className={`${styles.stage} ${reduceMotion ? styles.reduced : ''}`}
      role="img"
      aria-label={label}
    >
      <div className={styles.ring} />
      <div className={`${styles.flash} ${flash ? styles.flashOn : ''}`} />
      <div className={styles.core} />

      {(['blue', 'gold', 'violet'] as OrbId[]).map((orb) => {
        const pos = place(ORB_TARGET_ANGLE[orb], 40)
        return (
          <span
            key={orb}
            className={`${styles.orbChip} ${styles[orb]}`}
            style={{
              left: pos.left,
              top: pos.top,
              marginLeft: '-6px',
              marginTop: '-6px',
              opacity: !selected || selected === orb ? 1 : 0.35,
              transform: selected === orb ? 'scale(1.35)' : 'scale(1)',
            }}
          />
        )
      })}

      {selected && targetPos ? (
        <span
          className={`${styles.targetArc} ${styles[selected]}`}
          style={{
            left: targetPos.left,
            top: targetPos.top,
            marginLeft: '-14px',
            marginTop: '-14px',
          }}
        />
      ) : null}

      <span
        className={styles.marker}
        style={{
          left: markerPos.left,
          top: markerPos.top,
          marginLeft: '-7px',
          marginTop: '-7px',
          transition: running || reduceMotion ? 'none' : 'left 80ms linear, top 80ms linear',
        }}
      />
    </div>
  )
}

export const RoundStage = memo(RoundStageComponent)
