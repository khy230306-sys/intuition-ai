import { useEffect, useRef } from 'react'
import type { MainRoadCell, MainRoadModel } from '../../game/roadmap'
import { MAIN_ROAD_MAX_ROWS } from '../../game/roadmap'
import styles from './roadmap.module.css'

type Props = {
  model: MainRoadModel
  title: string
  followLatest: boolean
  onUserBrowse: () => void
}

function toneClass(outcome: string): string {
  if (outcome === 'UP' || outcome === 'HIGH') return styles.toneUP
  if (outcome === 'DOWN' || outcome === 'LOW') return styles.toneDOWN
  return styles.toneSAME
}

function cellAt(columnCells: MainRoadCell[], rowIndex: number): MainRoadCell | null {
  if (columnCells.length === 0) return null
  // Dragon-only column: show the tail on the bottom row.
  if (columnCells.length === 1 && columnCells[0].isDragonTail) {
    return rowIndex === MAIN_ROAD_MAX_ROWS - 1 ? columnCells[0] : null
  }
  return columnCells[rowIndex] ?? null
}

export function MainRoad({ model, title, followLatest, onUserBrowse }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const columns = model.columns.length > 0 ? model.columns : []

  useEffect(() => {
    if (!followLatest) return
    const node = scrollerRef.current
    if (!node) return
    node.scrollLeft = node.scrollWidth
  }, [followLatest, model.columns.length, model.sequence.length])

  return (
    <div>
      <div className={styles.statLabel} style={{ marginBottom: 6 }}>
        {title}
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
        <div className={styles.roadGrid} aria-label={title}>
          {(columns.length === 0 ? [null] : columns).map((column, colIndex) =>
            Array.from({ length: MAIN_ROAD_MAX_ROWS }, (_, rowIndex) => {
              const active = column ? cellAt(column.cells, rowIndex) : null
              if (!active) {
                return (
                  <div
                    key={`e-${colIndex}-${rowIndex}`}
                    className={`${styles.cell} ${styles.cellEmpty}`}
                  />
                )
              }
              return (
                <div
                  key={`c-${colIndex}-${rowIndex}-${active.rounds.join('-')}`}
                  className={`${styles.cell} ${toneClass(active.outcome)} ${
                    active.isDragonTail ? styles.dragon : ''
                  }`}
                  title={`${active.label}${active.sameCount ? ` · 무×${active.sameCount}` : ''}`}
                >
                  <span>{active.icon}</span>
                  {active.sameCount > 0 ? (
                    <span className={styles.sameBadge}>
                      {active.sameCount === 1 ? '¹' : `×${active.sameCount}`}
                    </span>
                  ) : null}
                  {active.streakIndex >= 3 ? (
                    <span className={styles.streakBadge}>{active.streakIndex}</span>
                  ) : null}
                </div>
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}
