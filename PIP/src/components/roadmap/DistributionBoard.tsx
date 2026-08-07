import type { RoadStatistics } from '../../game/roadmap'
import styles from './roadmap.module.css'

type Props = {
  stats: RoadStatistics
}

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max <= 0 ? 0 : Math.round((count / max) * 100)
  return (
    <div className={styles.barRow}>
      <span>{label}</span>
      <div>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${width}%` }} />
        </div>
        <div className={styles.dots}>{'●'.repeat(count) || '-'}</div>
      </div>
      <strong>{count}</strong>
    </div>
  )
}

export function DistributionBoard({ stats }: Props) {
  const pipMax = Math.max(...Object.values(stats.pipCounts), 1)
  const totalMax = Math.max(...Object.values(stats.totalHistogram), 1)

  return (
    <div className={styles.distWrap}>
      <section>
        <div className={styles.statLabel}>PIP 분포 · 공개된 카드만</div>
        {([1, 2, 3, 4, 5] as const).map((value) => (
          <Bar key={value} label={String(value)} count={stats.pipCounts[value]} max={pipMax} />
        ))}
      </section>

      <section>
        <div className={styles.statLabel}>PAIR {stats.pairTotal}회</div>
        <div className={styles.pairGrid}>
          {([1, 2, 3, 4, 5] as const).map((value) => (
            <div key={value} className={styles.pairCell}>
              <div>
                {value}-{value}
              </div>
              <strong>{stats.pairByValue[value]}</strong>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className={styles.statLabel}>합계 분포 2~10</div>
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((total) => (
          <Bar
            key={total}
            label={String(total)}
            count={stats.totalHistogram[total] ?? 0}
            max={totalMax}
          />
        ))}
      </section>
    </div>
  )
}
