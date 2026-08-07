import { BUNDLE_CATALOG, BUNDLE_CATEGORY_LABEL, type BundleCategory } from '../betting/bundles'
import {
  BUNDLE_MODE_LABELS,
  choiceButtonText,
  labelChoice,
  labelMode,
} from '../betting/labels'
import type { BundleAmountMode } from '../betting/selection'
import type { ExtraMode, PrimaryMode } from '../game/types'
import { STAKE_PRESETS } from '../game/types'
import styles from './GameOptions.module.css'

type GameOptionsProps = {
  disabled: boolean
  primaryMode: PrimaryMode
  primaryChoice: string | null
  stake: number
  showMore: boolean
  extraMode: ExtraMode | null
  extraChoice: string | null
  bundleIds: string[]
  bundleAmountMode: BundleAmountMode
  sheetOpen: boolean
  onToggleSheet: () => void
  onPrimaryMode: (mode: PrimaryMode) => void
  onPrimaryChoice: (choice: string) => void
  onStake: (stake: number) => void
  onToggleMore: () => void
  onExtraMode: (mode: ExtraMode | null) => void
  onExtraChoice: (choice: string | null) => void
  onToggleBundle: (id: string) => void
  onBundleAmountMode: (mode: BundleAmountMode) => void
}

const CATEGORY_ORDER: BundleCategory[] = ['duel', 'total', 'cross', 'extra']

export function GameOptions({
  disabled,
  primaryMode,
  primaryChoice,
  stake,
  showMore,
  extraMode,
  extraChoice,
  bundleIds,
  bundleAmountMode,
  sheetOpen,
  onToggleSheet,
  onPrimaryMode,
  onPrimaryChoice,
  onStake,
  onToggleMore,
  onExtraMode,
  onExtraChoice,
  onToggleBundle,
  onBundleAmountMode,
}: GameOptionsProps) {
  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>게임 선택</h3>
        <div className={styles.modeRow}>
          <button
            type="button"
            className={`${styles.modeBtn} ${primaryMode === 'CARD_DUEL' ? styles.active : ''}`}
            disabled={disabled}
            onClick={() => onPrimaryMode('CARD_DUEL')}
          >
            <strong>{labelMode('CARD_DUEL')}</strong>
            <small>CARD DUEL</small>
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${primaryMode === 'TOTAL' ? styles.active : ''}`}
            disabled={disabled}
            onClick={() => onPrimaryMode('TOTAL')}
          >
            <strong>{labelMode('TOTAL')}</strong>
            <small>TOTAL</small>
          </button>
        </div>
      </section>

      {primaryMode === 'CARD_DUEL' ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{labelMode('CARD_DUEL')} 선택</h3>
          <div className={styles.choiceRow}>
            {['DOWN', 'SAME', 'UP'].map((choice) => (
              <button
                key={choice}
                type="button"
                className={`${styles.choiceBtn} ${styles[`tone${choice}`] ?? ''} ${
                  primaryChoice === choice ? styles.active : ''
                }`}
                disabled={disabled}
                onClick={() => onPrimaryChoice(choice)}
              >
                <span className={styles.choiceMain}>{choiceButtonText(choice)}</span>
                <small>{choice}</small>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{labelMode('TOTAL')} 선택</h3>
          <div className={styles.choiceRow}>
            {['LOW', 'CENTER', 'HIGH'].map((choice) => (
              <button
                key={choice}
                type="button"
                className={`${styles.choiceBtn} ${styles[`tone${choice}`] ?? ''} ${
                  primaryChoice === choice ? styles.active : ''
                }`}
                disabled={disabled}
                onClick={() => onPrimaryChoice(choice)}
              >
                <span className={styles.choiceMain}>{choiceButtonText(choice)}</span>
                <small>{choice}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>선택 금액</h3>
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
        <label className={styles.customLabel}>
          <span>직접 입력</span>
          <input
            className={styles.input}
            type="number"
            min={1}
            max={100000}
            value={stake}
            disabled={disabled}
            onChange={(event) => onStake(Math.max(1, Number(event.target.value) || 1))}
            aria-label="직접 입력"
          />
        </label>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>묶음 선택</h3>
        <button
          type="button"
          className={styles.bundleOpenBtn}
          disabled={disabled}
          onClick={onToggleSheet}
        >
          묶음 선택{bundleIds.length > 0 ? ` (${bundleIds.length})` : ''}
        </button>
        <div className={styles.bundleModeBox}>
          <div className={styles.bundleModeTitle}>묶음 금액 방식</div>
          <div className={styles.bundleModeValue}>{BUNDLE_MODE_LABELS[bundleAmountMode]}</div>
          <div className={styles.modeRow}>
            <button
              type="button"
              className={`${styles.modeMini} ${
                bundleAmountMode === 'SPLIT_TOTAL' ? styles.active : ''
              }`}
              disabled={disabled}
              onClick={() => onBundleAmountMode('SPLIT_TOTAL')}
            >
              총 금액 균등 분배
            </button>
            <button
              type="button"
              className={`${styles.modeMini} ${bundleAmountMode === 'EACH_FULL' ? styles.active : ''}`}
              disabled={disabled}
              onClick={() => onBundleAmountMode('EACH_FULL')}
            >
              각 항목 동일 금액
            </button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <button
          type="button"
          className={styles.moreBtn}
          disabled={disabled}
          onClick={onToggleMore}
        >
          추가 선택
          <small>MORE</small>
        </button>
        {showMore ? (
          <div className={styles.morePanel}>
            <p className={styles.sectionLabel}>홀 / 짝</p>
            <div className={styles.row2}>
              {['ODD', 'EVEN'].map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={`${styles.extraBtn} ${
                    extraMode === 'ODD_EVEN' && extraChoice === choice ? styles.active : ''
                  }`}
                  disabled={disabled}
                  onClick={() => {
                    onExtraMode('ODD_EVEN')
                    onExtraChoice(choice)
                  }}
                >
                  <strong>{labelChoice(choice)}</strong>
                  <small>{choice}</small>
                </button>
              ))}
            </div>

            <p className={styles.sectionLabel}>같은 숫자</p>
            <div className={styles.row2}>
              {['PAIR', 'NO_PAIR'].map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={`${styles.extraBtn} ${
                    extraMode === 'PAIR' && extraChoice === choice ? styles.active : ''
                  }`}
                  disabled={disabled}
                  onClick={() => {
                    onExtraMode('PAIR')
                    onExtraChoice(choice)
                  }}
                >
                  <strong>{labelChoice(choice)}</strong>
                  <small>{choice}</small>
                </button>
              ))}
            </div>

            <p className={styles.sectionLabel}>합계 맞히기</p>
            <div className={styles.exactGrid}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.stakeBtn} ${
                    extraMode === 'EXACT_TOTAL' && extraChoice === String(value)
                      ? styles.active
                      : ''
                  }`}
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
      </section>

      {sheetOpen ? (
        <div className={styles.sheetRoot} role="dialog" aria-modal="true" aria-label="묶음 선택">
          <button
            type="button"
            className={styles.sheetBackdrop}
            aria-label="묶음 선택 닫기"
            onClick={onToggleSheet}
          />
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <h3>묶음 선택</h3>
              <button type="button" onClick={onToggleSheet}>
                닫기
              </button>
            </div>
            <p className={styles.sheetNote}>
              여러 결과를 한 번에 등록합니다. 중복 항목은 자동으로 하나로 합쳐집니다.
            </p>
            {CATEGORY_ORDER.map((category) => {
              const list = BUNDLE_CATALOG.filter((bundle) => bundle.category === category)
              return (
                <div key={category} className={styles.sheetGroup}>
                  <div className={styles.sheetGroupTitle}>{BUNDLE_CATEGORY_LABEL[category]}</div>
                  <div className={styles.bundleGrid}>
                    {list.map((bundle) => (
                      <button
                        key={bundle.id}
                        type="button"
                        className={`${styles.bundleCard} ${
                          bundleIds.includes(bundle.id) ? styles.bundleActive : ''
                        }`}
                        disabled={disabled}
                        onClick={() => onToggleBundle(bundle.id)}
                      >
                        {bundle.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
