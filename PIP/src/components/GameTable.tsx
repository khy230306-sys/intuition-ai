import { usePipGame } from '../hooks/usePipGame'
import type { PipValue } from '../game/types'
import { Card } from './Card'
import { GameOptions } from './GameOptions'
import { HistoryBoard } from './HistoryBoard'
import { PipLogo } from './PipLogo'
import styles from './GameTable.module.css'

export function GameTable() {
  const game = usePipGame()

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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <PipLogo />
          <div className={styles.brandText}>
            <h1 className={styles.brandName}>PIP</h1>
            <p className={styles.brandSub}>Free Demo Prototype</p>
          </div>
        </div>
        <div className={styles.metaCard}>
          <span className={styles.metaLabel}>DEMO POINT</span>
          <span className={styles.metaValue}>{game.demoPoints.toLocaleString()}</span>
        </div>
      </header>

      <div className={styles.meta}>
        <div className={styles.metaCard}>
          <span className={styles.metaLabel}>SHOE</span>
          <span className={styles.metaValue}>#{game.shoe.shoeNumber}</span>
        </div>
        <div className={styles.metaCard}>
          <span className={styles.metaLabel}>ROUND</span>
          <span className={styles.metaValue}>{game.round} / 22</span>
        </div>
        <div className={styles.metaCard}>
          <span className={styles.metaLabel}>REMAINING</span>
          <span className={styles.metaValue}>{game.remaining}</span>
        </div>
        <div className={styles.metaCard}>
          <span className={styles.metaLabel}>HIDDEN</span>
          <span className={styles.metaValue}>6</span>
        </div>
      </div>

      <p className={styles.notice}>
        DEMO POINT는 금전적 가치가 없으며 현금으로 교환할 수 없습니다.
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
                ? `${game.latestResult.cardA} + ${game.latestResult.cardB} = ${game.latestResult.total} · CARD ${game.latestResult.cardDuel} · TOTAL ${game.latestResult.totalBand}`
                : `${game.message}${game.phase === 'BETTING_OPEN' ? ` · ${game.timer}s` : ''}`}
            </p>
          </div>

          {game.settlements.length > 0 ? (
            <div className={styles.resultBanner}>
              <p className={styles.resultText}>
                {game.settlements
                  .map(
                    (item) =>
                      `${item.selection.mode}:${item.selection.choice} ${item.won ? 'WIN' : 'LOSE'} ${item.payout}`,
                  )
                  .join(' · ')}
              </p>
            </div>
          ) : null}

          <div className={styles.hiddenRow}>
            <span className={styles.hiddenLabel}>HIDDEN</span>
            {game.shoe.hidden.map((card, index) => (
              <span key={card.id} className={styles.hiddenChip}>
                {game.hiddenRevealIndex >= index || game.phase === 'NEW_SHOE'
                  ? card.value
                  : '?'}
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
            onPrimaryMode={game.setPrimaryMode}
            onPrimaryChoice={game.setPrimaryChoice}
            onStake={game.setStake}
            onToggleMore={() => game.setShowMore((value) => !value)}
            onExtraMode={game.setExtraMode}
            onExtraChoice={game.setExtraChoice}
          />

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              disabled={!game.canBet}
              onClick={() => void game.lockAndResolve()}
            >
              LOCK IN
            </button>
            {game.phase === 'NEW_SHOE' ? (
              <button type="button" className={styles.actionBtn} onClick={game.startNewShoe}>
                NEW SHOE
              </button>
            ) : (
              <button type="button" className={styles.ghostBtn} onClick={game.resetPoints}>
                RESET POINTS
              </button>
            )}
          </div>
        </section>

        <aside>
          <HistoryBoard history={game.shoe.history} stats={game.stats} />
        </aside>
      </div>

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
