import type { ExtraMode, PrimaryMode } from '../game/types'
import { STAKE_PRESETS } from '../game/types'
import styles from './GameOptions.module.css'

type GameOptionsProps = {
  disabled: boolean
  primaryMode: PrimaryMode
  primaryChoice: string
  stake: number
  showMore: boolean
  extraMode: ExtraMode | null
  extraChoice: string | null
  onPrimaryMode: (mode: PrimaryMode) => void
  onPrimaryChoice: (choice: string) => void
  onStake: (stake: number) => void
  onToggleMore: () => void
  onExtraMode: (mode: ExtraMode | null) => void
  onExtraChoice: (choice: string | null) => void
}

export function GameOptions({
  disabled,
  primaryMode,
  primaryChoice,
  stake,
  showMore,
  extraMode,
  extraChoice,
  onPrimaryMode,
  onPrimaryChoice,
  onStake,
  onToggleMore,
  onExtraMode,
  onExtraChoice,
}: GameOptionsProps) {
  const duelChoices = ['DOWN', 'SAME', 'UP']
  const totalChoices = ['LOW', 'CENTER', 'HIGH']
  const choices = primaryMode === 'CARD_DUEL' ? duelChoices : totalChoices

  return (
    <div className={styles.wrap}>
      <div className={styles.modeRow}>
        <button
          type="button"
          className={`${styles.modeBtn} ${primaryMode === 'CARD_DUEL' ? styles.active : ''}`}
          disabled={disabled}
          onClick={() => {
            onPrimaryMode('CARD_DUEL')
            onPrimaryChoice('UP')
          }}
        >
          CARD DUEL
        </button>
        <button
          type="button"
          className={`${styles.modeBtn} ${primaryMode === 'TOTAL' ? styles.active : ''}`}
          disabled={disabled}
          onClick={() => {
            onPrimaryMode('TOTAL')
            onPrimaryChoice('CENTER')
          }}
        >
          TOTAL
        </button>
      </div>

      <div className={styles.choiceRow}>
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className={`${styles.choiceBtn} ${primaryChoice === choice ? styles.active : ''}`}
            disabled={disabled}
            onClick={() => onPrimaryChoice(choice)}
          >
            {choice}
          </button>
        ))}
      </div>

      <div className={styles.stakeRow}>
        {STAKE_PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            className={`${styles.stakeBtn} ${stake === value ? styles.active : ''}`}
            disabled={disabled}
            onClick={() => onStake(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <div className={styles.customStake}>
        <input
          className={styles.input}
          type="number"
          min={1}
          max={100000}
          value={stake}
          disabled={disabled}
          onChange={(event) => onStake(Math.max(1, Number(event.target.value) || 1))}
          aria-label="Custom stake"
        />
        <button type="button" className={styles.moreBtn} disabled={disabled} onClick={onToggleMore}>
          MORE
        </button>
      </div>

      {showMore ? (
        <div className={styles.morePanel}>
          <p className={styles.sectionLabel}>ODD / EVEN</p>
          <div className={styles.choiceRow}>
            {['ODD', 'EVEN'].map((choice) => (
              <button
                key={choice}
                type="button"
                className={`${styles.choiceBtn} ${extraMode === 'ODD_EVEN' && extraChoice === choice ? styles.active : ''}`}
                disabled={disabled}
                onClick={() => {
                  onExtraMode('ODD_EVEN')
                  onExtraChoice(choice)
                }}
              >
                {choice}
              </button>
            ))}
            <button
              type="button"
              className={styles.choiceBtn}
              disabled={disabled}
              onClick={() => {
                onExtraMode(null)
                onExtraChoice(null)
              }}
            >
              CLEAR
            </button>
          </div>

          <p className={styles.sectionLabel}>PAIR</p>
          <div className={styles.choiceRow}>
            {['PAIR', 'NO_PAIR'].map((choice) => (
              <button
                key={choice}
                type="button"
                className={`${styles.choiceBtn} ${extraMode === 'PAIR' && extraChoice === choice ? styles.active : ''}`}
                disabled={disabled}
                onClick={() => {
                  onExtraMode('PAIR')
                  onExtraChoice(choice)
                }}
              >
                {choice}
              </button>
            ))}
          </div>

          <p className={styles.sectionLabel}>EXACT TOTAL</p>
          <div className={styles.exactGrid}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.stakeBtn} ${extraMode === 'EXACT_TOTAL' && extraChoice === String(value) ? styles.active : ''}`}
                disabled={disabled}
                onClick={() => {
                  onExtraMode('EXACT_TOTAL')
                  onExtraChoice(String(value))
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
