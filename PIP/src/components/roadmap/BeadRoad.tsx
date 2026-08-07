import { useEffect, useRef, useState } from 'react'
import type { BeadCell, BeadRoadModel } from '../../game/roadmap'
import { MAIN_ROAD_MAX_ROWS } from '../../game/roadmap'
import { labelChoice } from '../../betting/labels'
import styles from './roadmap.module.css'

type Props = {
  model: BeadRoadModel
  followLatest: boolean
  onUserBrowse: () => void
  mode: 'duel' | 'total'
}

function toneClass(outcome: string): string {
  if (outcome === 'UP' || outcome === 'HIGH') return styles.toneUP
  if (outcome === 'DOWN' || outcome === 'LOW') return styles.toneDOWN
  return styles.toneSAME
}

function pipDots(value: number): string {
  return '●'.repeat(value)
}

export function BeadRoad({ model, followLatest, onUserBrowse, mode }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [selected, setSelected] = useState<BeadCell | null>(null)

  useEffect(() => {
    if (!followLatest) return
    const node = scrollerRef.current
    if (!node) return
    node.scrollLeft = node.scrollWidth
  }, [followLatest, model.beads.length])

  return (
    <div>
      <div className={styles.statLabel} style={{ marginBottom: 6 }}>
        PIP 구슬표 · 시간 순서
      </div>
      <div
        ref={scrollerRef}
        className={styles.scroll}
        onScroll={() => {
          const node = scrollerRef.current
          if (!node) return
          const nearEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 24
          if (!nearEnd) onUserBrowse()
        }}
        onPointerDown={onUserBrowse}
      >
        <div className={styles.beadGrid} aria-label="PIP 구슬표">
          {(model.columns.length === 0 ? [null] : model.columns).map((column, colIndex) =>
            Array.from({ length: MAIN_ROAD_MAX_ROWS }, (_, rowIndex) => {
              const bead = column?.[rowIndex]
              if (!bead) {
                return (
                  <div
                    key={`e-${colIndex}-${rowIndex}`}
                    className={`${styles.bead} ${styles.cellEmpty}`}
                  />
                )
              }
              const outcome = mode === 'duel' ? bead.cardDuel : bead.totalBand
              const icon = mode === 'duel' ? bead.duelIcon : bead.totalIcon
              return (
                <button
                  key={`b-${bead.round}`}
                  type="button"
                  className={`${styles.bead} ${toneClass(outcome)}`}
                  onClick={() => setSelected(bead)}
                  aria-label={`라운드 ${bead.round}`}
                >
                  <span className={styles.beadIcon}>{icon}</span>
                  <small>R{bead.round}</small>
                </button>
              )
            }),
          )}
        </div>
      </div>

      {selected ? (
        <div className={styles.detail} role="status">
          <p className={styles.detailTitle}>Round {selected.round}</p>
          <div>
            Card A <span className={styles.pips}>{pipDots(selected.cardA)}</span>
          </div>
          <div>
            Card B <span className={styles.pips}>{pipDots(selected.cardB)}</span>
          </div>
          <div>
            카드 비교 · {labelChoice(selected.cardDuel)}
          </div>
          <div>합계 · {selected.total}</div>
          <div>합계 결과 · {labelChoice(selected.totalBand)}</div>
          <div>홀짝 · {labelChoice(selected.oddEven)}</div>
          <div>Pair · {selected.isPair ? '맞음' : '아님'}</div>
          <button type="button" className={styles.archiveBtn} onClick={() => setSelected(null)}>
            닫기
          </button>
        </div>
      ) : null}
    </div>
  )
}
