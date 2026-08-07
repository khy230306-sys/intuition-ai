import type { PipValue } from '../game/types'
import styles from './Card.module.css'

type CardProps = {
  value?: PipValue | number | null
  faceUp?: boolean
  label?: string
}

const layouts: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [50, 24],
    [26, 72],
    [74, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
}

export function Card({ value = null, faceUp = false, label = 'PIP' }: CardProps) {
  const pips = value && value >= 1 && value <= 5 ? layouts[value] : []

  return (
    <div className={styles.scene} aria-label={faceUp && value ? `PIP ${value}` : 'Hidden card'}>
      <div className={`${styles.card} ${faceUp ? styles.flipped : ''}`}>
        <div className={`${styles.face} ${styles.back}`}>
          <div className={styles.backRing}>
            <strong className={styles.backLabel}>PIP</strong>
          </div>
          <span className={styles.backLabel}>{label}</span>
        </div>
        <div className={`${styles.face} ${styles.front}`}>
          <div className={styles.pipBoard}>
            {pips.map(([x, y], index) => (
              <span
                key={`${value}-${index}`}
                className={styles.pip}
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
