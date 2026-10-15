import { useState } from 'react'
import { BUNDLE_MODE_LABELS, formatPick, labelChoice, labelMode } from '../betting/labels'
import { usePipGame } from '../hooks/usePipGame'
import type { PipValue } from '../game/types'
import { Card } from './Card'
import { GameOptions } from './GameOptions'
import { HistoryBoard } from './HistoryBoard'
import { PipLogo } from './PipLogo'
import { PipRoadmap } from './roadmap/PipRoadmap'
import styles from './GameTable.module.css'

export function GameTable() {
  const game = usePipGame()
  const [sheetOpen, setSheetOpen] = useState(false)

  const resultTone = (() => {
    if (!game.latestResult) return ''
    if (game.primaryMode === 'CARD_DUEL') {
      if (game.latestResult.cardDuel === 'UP') return styles.resultUp
      if (game.latestResult.cardDuel === 'DOWN') return styles.resultDown
      return styles.resultSame
    }
    if (game.latestResult.totalBand === 'LOW') return styles.resultLow
    if (game.latestResult.totalBand === 'HIGH') return styles.resultHigh
    return styles.resultCenter
  })()

  const selectedBundles = game.bundleIds

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <PipLogo />
          <div className={styles.brandText}>
            <h1 className={styles.brandName}>PIP</h1>
            <p className={styles.brandSub}>무료 데모 프로토타입</p>
          </div>
        </div>
        <div className={styles.metaCard}>
          <span className={styles.metaLabel}>
            데모 포인트
            <small>DEMO POINT</small>
          </span>
          <span className={styles.metaValue}>{game.demoPoints.toLocaleString()}</span>
        </div>
      </header>

      <div className={styles.meta}>
        <div className={styles.metaCard}>
          <span className={styles.metaLabel}>
            슈<small>SHOE</small>
          </span>
          <span className={styles.metaValue}>#{game.shoe.shoeNumber}</span>
        </div>
        <div className={styles.metaCard}>
          <span className={styles.metaLabel}>
            라운드<small>ROUND</small>
          </span>
          <span className={styles.metaValue}>{game.round} / 22</span>
        </div>
        <div className={styles.metaCard}>
          <span className={styles.metaLabel}>남은 카드</span>
          <span className={styles.metaValue}>{game.remaining}</span>
        </div>
        <div className={styles.metaCard}>
          <span className={styles.metaLabel}>
            비공개 카드<small>HIDDEN</small>
          </span>
          <span className={styles.metaValue}>6</span>
        </div>
      </div>

      <p className={styles.notice}>
        데모 포인트는 금전적 가치가 없으며 현금으로 교환할 수 없습니다.
      </p>

      <div className={styles.layout}>
        <section className={styles.stage}>
          <div className={styles.cards}>
            <Card
              value={(game.pending?.cardAValue as PipValue) ?? null}
              faceUp={game.revealedA}
              label="A"
            />
            <Card
              value={(game.pending?.cardBValue as PipValue) ?? null}
              faceUp={game.revealedB}
              label="B"
            />
          </div>

          <div className={`${styles.resultBanner} ${resultTone}`}>
            <p className={styles.resultText}>
              {game.latestResult
                ? `${game.latestResult.cardA} + ${game.latestResult.cardB} = ${game.latestResult.total} · ${labelChoice(game.latestResult.cardDuel)} · ${labelChoice(game.latestResult.totalBand)}`
                : `${game.message}${game.phase === 'BETTING_OPEN' ? ` · ${game.timer}초` : ''}`}
            </p>
          </div>

          {game.settlements.length > 0 ? (
            <div className={styles.resultBanner}>
              <p className={styles.resultText}>
                {game.settlements
                  .map(
                    (item) =>
                      `${formatPick(item.selection.mode, item.selection.choice)} ${
                        item.won ? '성공' : '실패'
                      } ${item.payout}`,
                  )
                  .join(' · ')}
              </p>
            </div>
          ) : null}

          <div className={styles.hiddenRow}>
            <span className={styles.hiddenLabel}>비공개 카드</span>
            {game.shoe.hidden.map((card, index) => (
              <span key={card.id} className={styles.hiddenChip}>
                {game.hiddenRevealIndex >= index || game.phase === 'NEW_SHOE' ? card.value : '?'}
              </span>
            ))}
          </div>

          <GameOptions
            disabled={!game.canBet}
            primaryMode={game.primaryMode}
            primaryChoice={game.primaryChoice}
            stake={game.stake}
            showMore={game.showMore}
            extraMode={game.extraMode}
            extraChoice={game.extraChoice}
            bundleIds={game.bundleIds}
            bundleAmountMode={game.bundleAmountMode}
            sheetOpen={sheetOpen && game.canBet}
            onToggleSheet={() => {
              if (!game.canBet) return
              setSheetOpen((open) => !open)
            }}
            onPrimaryMode={game.setPrimaryMode}
            onPrimaryChoice={game.setPrimaryChoice}
            onStake={game.setStake}
            onToggleMore={() => game.setShowMore((value) => !value)}
            onExtraMode={game.setExtraMode}
            onExtraChoice={game.setExtraChoice}
            onToggleBundle={game.toggleBundle}
            onBundleAmountMode={game.setBundleAmountMode}
          />

          <div className={styles.summaryBox}>
            <div className={styles.summaryTitle}>현재 선택</div>
            {game.resolvedPicks.length === 0 ? (
              <p className={styles.summaryEmpty}>선택된 항목이 없습니다.</p>
            ) : (
              <>
                <ul className={styles.summaryList}>
                  {game.primaryChoice ? (
                    <li>
                      {labelMode(game.primaryMode)} · {labelChoice(game.primaryChoice)}
                    </li>
                  ) : null}
                  {game.extraMode && game.extraChoice ? (
                    <li>
                      {labelMode(game.extraMode)} · {labelChoice(game.extraChoice)}
                    </li>
                  ) : null}
                  {selectedBundles.length > 0 ? (
                    <li>묶음 {selectedBundles.length}개 선택</li>
                  ) : null}
                </ul>
                <div className={styles.summarySplit}>
                  <div className={styles.summarySubtitle}>배분</div>
                  <ul className={styles.summaryList}>
                    {game.summaryLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.summaryMode}>
                  묶음 금액 방식 · {BUNDLE_MODE_LABELS[game.bundleAmountMode]}
                </div>
                <div className={styles.summaryTotal}>
                  총 사용 데모 포인트 <strong>{game.estimatedStake.toLocaleString()}</strong>
                </div>
              </>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.lockBtn}
              disabled={!game.canConfirm}
              onClick={() => {
                setSheetOpen(false)
                void game.lockAndResolve()
              }}
            >
              선택 확정
            </button>
            <div className={styles.secondaryActions}>
              <button
                type="button"
                className={styles.ghostBtn}
                disabled={!game.canBet}
                onClick={() => {
                  game.clearSelection()
                  setSheetOpen(false)
                }}
              >
                선택 취소
              </button>
              {game.phase === 'NEW_SHOE' ? (
                <button type="button" className={styles.actionBtn} onClick={game.startNewShoe}>
                  새 슈
                </button>
              ) : (
                <button type="button" className={styles.ghostBtn} onClick={game.resetPoints}>
                  데모 포인트 초기화
                </button>
              )}
            </div>
          </div>
        </section>

        <aside>
          <HistoryBoard history={game.shoe.history} stats={game.stats} />
        </aside>
      </div>

      <PipRoadmap
        history={game.shoe.history}
        phase={game.phase}
        shoeNumber={game.shoe.shoeNumber}
        archivedShoes={game.archivedShoes}
        sameIndependent={game.sameIndependent}
        onSameIndependentChange={game.setSameIndependent}
        activeHiddenValues={
          game.phase === 'NEW_SHOE' || game.phase === 'HIDDEN_REVEAL'
            ? game.shoe.hidden.map((card) => card.value)
            : null
        }
      />

      {import.meta.env.DEV ? (
        <div className={styles.devBox}>
          DEV VERIFY · phase={game.phase} · integrity=
          {game.integrity.length === 0 ? 'OK' : game.integrity.join(' | ')} · history=
          {game.shoe.history.length}/22 · cursor={game.shoe.cursor}
        </div>
      ) : null}
    </div>
  )
}
