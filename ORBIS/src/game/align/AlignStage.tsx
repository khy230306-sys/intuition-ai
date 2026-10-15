import { memo } from 'react'
import type { RingState } from './types'
import styles from './AlignStage.module.css'

type AlignStageProps = {
  rings: RingState[]
  selectedIndex: number
  flash: boolean
  label: string
}

const RING_SIZE = [78, 60, 42]

function AlignStageComponent({ rings, selectedIndex, flash, label }: AlignStageProps) {
  return (
    <div className={styles.stage} role="img" aria-label={label}>
      <div className={styles.beam} />
      <div className={styles.beamCap} />
      <div className={`${styles.alignedFlash} ${flash ? styles.alignedFlashOn : ''}`} />

      {rings.map((ring, index) => (
        <div
          key={ring.id}
          className={`${styles.ring} ${selectedIndex === index ? styles.ringSelected : ''}`}
          style={{
            width: `${RING_SIZE[index]}%`,
            height: `${RING_SIZE[index]}%`,
            transform: `translate(-50%, -50%) rotate(${ring.angle}deg)`,
          }}
        >
          <span
            className={`${styles.gate} ${
              ring.color === 'blue'
                ? styles.gateBlue
                : ring.color === 'gold'
                  ? styles.gateGold
                  : styles.gateViolet
            }`}
          />
        </div>
      ))}

      <div className={styles.core} />
    </div>
  )
}

export const AlignStage = memo(AlignStageComponent)
