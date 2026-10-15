import { useState } from 'react'
import type { GamePhase, RoundResult } from '../../game/types'
import {
  buildBeadRoad,
  buildDuelMainRoad,
  buildTotalRoad,
  computeRoadStatistics,
  type ArchivedShoe,
  type RoadmapTabId,
} from '../../game/roadmap'
import { BeadRoad } from './BeadRoad'
import { DistributionBoard } from './DistributionBoard'
import { MainRoad } from './MainRoad'
import { RoadmapTabs } from './RoadmapTabs'
import styles from './roadmap.module.css'

type Props = {
  history: RoundResult[]
  phase: GamePhase
  shoeNumber: number
  archivedShoes: ArchivedShoe[]
  sameIndependent: boolean
  onSameIndependentChange: (value: boolean) => void
  /** Hidden cards for the active shoe — only shown after shoe completion. */
  activeHiddenValues?: number[] | null
}

export function PipRoadmap({
  history,
  phase,
  shoeNumber,
  archivedShoes,
  sameIndependent,
  onSameIndependentChange,
  activeHiddenValues = null,
}: Props) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<RoadmapTabId>('duel')
  const [followLatest, setFollowLatest] = useState(true)
  const [showArchive, setShowArchive] = useState(false)
  const [viewArchiveId, setViewArchiveId] = useState<string | null>(null)

  const viewingArchive = archivedShoes.find((item) => item.id === viewArchiveId) ?? null
  const viewHistory = viewingArchive?.rounds ?? history
  const viewingPast = viewingArchive != null

  const stats = computeRoadStatistics(viewHistory)
  const duelRoad = buildDuelMainRoad(viewHistory, { sameIndependent })
  const totalRoad = buildTotalRoad(viewHistory)
  const beadRoad = buildBeadRoad(viewHistory)

  const showHidden =
    viewingArchive != null
      ? viewingArchive.hidden != null
      : (phase === 'NEW_SHOE' || phase === 'HIDDEN_REVEAL') && activeHiddenValues != null

  const hiddenValues =
    viewingArchive?.hidden?.map((card) => card.value) ??
    (showHidden ? activeHiddenValues : null)

  const markBrowse = () => setFollowLatest(false)

  return (
    <section className={styles.panel} aria-label="대로표">
      <div className={styles.headerRow}>
        <h2 className={styles.title}>대로표</h2>
        <button type="button" className={styles.toggle} onClick={() => setOpen((value) => !value)}>
          {open ? '접기' : '펼치기'}
        </button>
      </div>

      {!open ? null : (
        <>
          <p className={styles.notice}>
            과거 기록은 단순 시각화이며, 다음 결과 확률이나 결과 생성에 영향을 주지 않습니다.
          </p>

          <div className={styles.stats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>카드 비교</div>
              <div className={styles.statValue}>
                상 {stats.cardDuel.UP} · 무 {stats.cardDuel.SAME} · 하 {stats.cardDuel.DOWN}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>합계</div>
              <div className={styles.statValue}>
                낮음 {stats.totalBand.LOW} · 중앙 {stats.totalBand.CENTER} · 높음{' '}
                {stats.totalBand.HIGH}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>현재 연속</div>
              <div className={styles.statValue}>
                {stats.currentStreak.outcome
                  ? `${stats.currentStreak.label} ×${stats.currentStreak.length}`
                  : '-'}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>최장 연속 / 진행</div>
              <div className={styles.statValue}>
                {stats.longestStreak.outcome
                  ? `${stats.longestStreak.label} ×${stats.longestStreak.length}`
                  : '-'}{' '}
                · {stats.progress.completed} / {stats.progress.total}
              </div>
            </div>
          </div>

          <div className={styles.toolbar}>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={sameIndependent}
                onChange={(event) => onSameIndependentChange(event.target.checked)}
              />
              무 독립 표시
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {viewingPast ? (
                <button
                  type="button"
                  className={styles.archiveBtn}
                  onClick={() => {
                    setViewArchiveId(null)
                    setFollowLatest(true)
                  }}
                >
                  현재 슈 #{shoeNumber}
                </button>
              ) : (
                <span className={styles.statLabel}>현재 슈 #{shoeNumber}</span>
              )}
              <button
                type="button"
                className={styles.archiveBtn}
                onClick={() => setShowArchive((value) => !value)}
              >
                지난 슈
              </button>
              {!followLatest ? (
                <button
                  type="button"
                  className={styles.archiveBtn}
                  onClick={() => setFollowLatest(true)}
                >
                  최신으로
                </button>
              ) : null}
            </div>
          </div>

          {showArchive ? (
            <div className={styles.archiveList}>
              {archivedShoes.length === 0 ? (
                <div className={styles.statLabel}>저장된 지난 슈가 없습니다.</div>
              ) : (
                archivedShoes.map((archive) => (
                  <button
                    key={archive.id}
                    type="button"
                    className={`${styles.archiveItem} ${
                      viewArchiveId === archive.id ? styles.archiveItemActive : ''
                    }`}
                    onClick={() => {
                      setViewArchiveId(archive.id)
                      setFollowLatest(true)
                      setShowArchive(false)
                    }}
                  >
                    <strong>슈 #{archive.shoeNumber}</strong>
                    <span>
                      {new Date(archive.startedAt).toLocaleString()} ~{' '}
                      {new Date(archive.endedAt).toLocaleString()}
                    </span>
                    <span>{archive.rounds.length}라운드</span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          <RoadmapTabs
            active={tab}
            onChange={(next) => {
              setTab(next)
              setFollowLatest(true)
            }}
          />

          {tab === 'duel' ? (
            <MainRoad
              model={duelRoad}
              title="PIP 큰길 · 카드 비교 대로"
              followLatest={followLatest}
              onUserBrowse={markBrowse}
            />
          ) : null}
          {tab === 'total' ? (
            <MainRoad
              model={totalRoad}
              title="합계 대로"
              followLatest={followLatest}
              onUserBrowse={markBrowse}
            />
          ) : null}
          {tab === 'bead' ? (
            <BeadRoad
              model={beadRoad}
              followLatest={followLatest}
              onUserBrowse={markBrowse}
              mode="duel"
            />
          ) : null}
          {tab === 'distribution' ? <DistributionBoard stats={stats} /> : null}

          {showHidden && hiddenValues ? (
            <div className={styles.hiddenRow}>
              <span className={styles.statLabel}>비공개 카드 (슈 종료 후)</span>
              {hiddenValues.map((value, index) => (
                <span key={`h-${index}`} className={styles.hiddenChip}>
                  {value}
                </span>
              ))}
            </div>
          ) : (
            <div className={styles.statLabel}>비공개 카드는 슈 종료 후에만 표시됩니다.</div>
          )}
        </>
      )}
    </section>
  )
}
