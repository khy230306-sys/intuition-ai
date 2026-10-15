import type { HistoryStats } from '../game/history'
import type { RoundResult } from '../game/types'
import { ROUNDS_PER_SHOE } from '../game/types'
import styles from './HistoryBoard.module.css'

type HistoryBoardProps = {
  history: RoundResult[]
  stats: HistoryStats
}

export function HistoryBoard({ history, stats }: HistoryBoardProps) {
  return (
    <div className={styles.wrap}>
      <p className={styles.title}>PIP HISTORY BOARD</p>
      <div className={styles.grid} aria-label="Shoe history board">
        {Array.from({ length: ROUNDS_PER_SHOE }, (_, index) => {
          const round = history[index]
          if (!round) {
            return <span key={`empty-${index}`} className={styles.cell} />
          }
          const tone =
            round.cardDuel === 'UP'
              ? styles.up
              : round.cardDuel === 'DOWN'
                ? styles.down
                : styles.same
          return (
            <span key={round.round} className={`${styles.cell} ${tone}`} title={`R${String(round.round).padStart(2, '0')}`}>
              {round.cardDuel[0]}
              {round.totalBand[0]}
            </span>
          )
        })}
      </div>

      <div className={styles.list}>
        {[...history].reverse().map((round) => (
          <div key={`row-${round.round}`} className={styles.row}>
            <span>R{String(round.round).padStart(2, '0')}</span>
            <span>
              {round.cardA}/{round.cardB} · T{round.total}
            </span>
            <span>
              {round.cardDuel} · {round.totalBand}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.stats}>
        <div className={styles.statBox}>
          <div>PIP 1~5</div>
          <div>
            {([1, 2, 3, 4, 5] as const).map((value) => (
              <span key={value}>
                {value}:{stats.valueCounts[value]}{' '}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.statBox}>
          <div>CARD / TOTAL</div>
          <div>
            U{stats.cardDuel.UP} S{stats.cardDuel.SAME} D{stats.cardDuel.DOWN}
          </div>
          <div>
            L{stats.totalBand.LOW} C{stats.totalBand.CENTER} H{stats.totalBand.HIGH}
          </div>
        </div>
      </div>
    </div>
  )
}
