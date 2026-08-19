import { playClickSound } from '../app/sound'
import { useI18n } from '../i18n'
import { useSettings } from '../storage/SettingsContext'
import type { AnimationQuality, Language } from '../storage/settings'
import styles from './pages.module.css'

export function SettingsPage() {
  const t = useI18n()
  const {
    settings,
    setLanguage,
    setSoundEnabled,
    setAnimationQuality,
    setReduceMotion,
  } = useSettings()

  const withClick = (action: () => void) => {
    playClickSound(settings.soundEnabled)
    action()
  }

  return (
    <div className={`page-fade ${styles.page}`}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t.settings.title}</h1>
        <p className={styles.pageSubtitle}>{t.settings.subtitle}</p>
      </header>

      <div className={styles.settingsList}>
        <section className={styles.field}>
          <div className={styles.fieldLabel}>{t.settings.language}</div>
          <div className={styles.segmented} role="group" aria-label={t.settings.language}>
            {(
              [
                ['ko', t.settings.languageKo],
                ['en', t.settings.languageEn],
              ] as Array<[Language, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`${styles.segment} ${settings.language === value ? styles.segmentActive : ''}`}
                aria-pressed={settings.language === value}
                onClick={() => withClick(() => setLanguage(value))}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.field}>
          <div className={styles.fieldLabel}>{t.settings.sound}</div>
          <div className={styles.segmented} role="group" aria-label={t.settings.sound}>
            <button
              type="button"
              className={`${styles.segment} ${settings.soundEnabled ? styles.segmentActive : ''}`}
              aria-pressed={settings.soundEnabled}
              onClick={() => {
                setSoundEnabled(true)
                playClickSound(true)
              }}
            >
              {t.settings.soundEnabled}
            </button>
            <button
              type="button"
              className={`${styles.segment} ${!settings.soundEnabled ? styles.segmentActive : ''}`}
              aria-pressed={!settings.soundEnabled}
              onClick={() => setSoundEnabled(false)}
            >
              {t.settings.soundDisabled}
            </button>
          </div>
        </section>

        <section className={styles.field}>
          <div className={styles.fieldLabel}>{t.settings.animationQuality}</div>
          <div
            className={styles.segmented}
            role="group"
            aria-label={t.settings.animationQuality}
          >
            {(
              [
                ['low', t.settings.qualityLow],
                ['medium', t.settings.qualityMedium],
                ['high', t.settings.qualityHigh],
              ] as Array<[AnimationQuality, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`${styles.segment} ${settings.animationQuality === value ? styles.segmentActive : ''}`}
                aria-pressed={settings.animationQuality === value}
                onClick={() => withClick(() => setAnimationQuality(value))}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.field}>
          <div className={styles.toggleRow}>
            <div>
              <div className={styles.fieldLabel}>{t.settings.reduceMotion}</div>
              <p className={styles.hint}>{t.settings.reduceMotionHint}</p>
            </div>
            <button
              type="button"
              className={`${styles.switch} ${settings.reduceMotion ? styles.switchOn : ''}`}
              aria-pressed={settings.reduceMotion}
              aria-label={t.settings.reduceMotion}
              onClick={() => withClick(() => setReduceMotion(!settings.reduceMotion))}
            />
          </div>
        </section>

        <p className={styles.hint}>{t.settings.savedHint}</p>
      </div>
    </div>
  )
}
