import { formatCard } from '../game/baccarat/cardLabel'
import type { Card } from '../game/baccarat/types'
import styles from './PlayingCard.module.css'

type PlayingCardProps = {
  card?: Card | null
  hidden?: boolean
}

export function PlayingCard({ card, hidden = false }: PlayingCardProps) {
  if (!card || hidden) {
    return <div className={`${styles.card} ${styles.back}`} aria-hidden="true" />
  }

  const view = formatCard(card)
  const tone = view.red ? styles.red : styles.black

  return (
    <div className={`${styles.card} ${tone}`} aria-label={`${view.rank}${view.suit}`}>
      <span className={styles.rank}>
        {view.rank}
        {view.suit}
      </span>
      <span className={styles.suitCenter}>{view.suit}</span>
      <span className={`${styles.rank} ${styles.rankBottom}`}>
        {view.rank}
        {view.suit}
      </span>
    </div>
  )
}
