import { useI18n } from '../i18n'
import styles from './pages.module.css'

export function AboutPage() {
  const t = useI18n()

  return (
    <div className={`page-fade ${styles.page}`}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t.about.title}</h1>
        <p className={styles.pageSubtitle}>{t.about.subtitle}</p>
      </header>

      <section className={`${styles.cardGrid} ${styles.twoCols}`}>
        <article className={styles.card}>
          <h2>{t.about.purposeTitle}</h2>
          <p>{t.about.purposeBody}</p>
        </article>
        <article className={styles.card}>
          <h2>{t.about.freeTitle}</h2>
          <p>{t.about.freeBody}</p>
        </article>
        <article className={styles.card}>
          <h2>{t.about.disclaimerTitle}</h2>
          <p>{t.about.disclaimerBody}</p>
        </article>
      </section>
    </div>
  )
}
