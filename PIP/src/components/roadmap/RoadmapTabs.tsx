import type { RoadmapTabId } from '../../game/roadmap'
import styles from './roadmap.module.css'

const TABS: Array<{ id: RoadmapTabId; label: string }> = [
  { id: 'duel', label: '카드 비교' },
  { id: 'total', label: '합계' },
  { id: 'bead', label: '전체 결과' },
  { id: 'distribution', label: 'PIP 분포' },
]

type Props = {
  active: RoadmapTabId
  onChange: (tab: RoadmapTabId) => void
}

export function RoadmapTabs({ active, onChange }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="대로표 탭">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`${styles.tab} ${active === tab.id ? styles.tabActive : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
