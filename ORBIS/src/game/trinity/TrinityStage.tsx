import { memo } from 'react'
import type { OrbColor } from './types'
import styles from './TrinityStage.module.css'

type TrinityStageProps = {
  revealed: Array<OrbColor | null>
  drawing: boolean
  flash: boolean
  reduceMotion: boolean
  label: string
}

function TrinityStageComponent({
  revealed,
  drawing,
  flash,
  reduceMotion,
  label,
}: TrinityStageProps) {
  return (
    <div
      className={[
        styles.stage,
        drawing ? styles.drawing : '',
        reduceMotion ? styles.reduced : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={label}
    >
      <div className={styles.ring} />
      <div className={styles.core} />
      <div className={`${styles.flash} ${flash ? styles.flashOn : ''}`} />

      <div className={styles.slots}>
        {revealed.map((color, index) => (
          <div
            key={`slot-${index}`}
            className={`${styles.slot} ${color ? styles.slotActive : ''}`}
          >
            {color ? (
              <span
                className={`${styles.orb} ${
                  color === 'blue'
                    ? styles.orbBlue
                    : color === 'gold'
                      ? styles.orbGold
                      : styles.orbViolet
                }`}
              />
            ) : (
              <span className={styles.placeholder} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export const TrinityStage = memo(TrinityStageComponent)
