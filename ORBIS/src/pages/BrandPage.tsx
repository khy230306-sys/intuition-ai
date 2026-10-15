import { useI18n } from '../i18n'
import styles from './pages.module.css'

export function BrandPage() {
  const t = useI18n()

  return (
    <div className={`page-fade ${styles.page}`}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t.brand.title}</h1>
        <p className={styles.pageSubtitle}>{t.brand.subtitle}</p>
      </header>

      <section className={styles.cardGrid}>
        <article className={styles.card}>
          <h2>{t.brand.worldviewTitle}</h2>
          <p>{t.brand.worldviewBody}</p>
        </article>
        <article className={styles.card}>
          <h2>{t.brand.coreTitle}</h2>
          <p>{t.brand.coreBody}</p>
        </article>
      </section>

      <section className={styles.card}>
        <h2>{t.brand.orbsTitle}</h2>
        <div className={styles.orbRow}>
          <article className={`${styles.orbCard} ${styles.orbCardBlue}`}>
            <h3>{t.brand.blueTitle}</h3>
            <p>{t.brand.blueBody}</p>
          </article>
          <article className={`${styles.orbCard} ${styles.orbCardGold}`}>
            <h3>{t.brand.goldTitle}</h3>
            <p>{t.brand.goldBody}</p>
          </article>
          <article className={`${styles.orbCard} ${styles.orbCardViolet}`}>
            <h3>{t.brand.violetTitle}</h3>
            <p>{t.brand.violetBody}</p>
          </article>
        </div>
      </section>

      <section className={`${styles.cardGrid} ${styles.twoCols}`}>
        <article className={styles.card}>
          <h2>{t.brand.philosophyTitle}</h2>
          <p>{t.brand.philosophyBody}</p>
        </article>
        <article className={styles.card}>
          <h2>{t.brand.futureTitle}</h2>
          <p>{t.brand.futureBody}</p>
        </article>
      </section>
    </div>
  )
}
