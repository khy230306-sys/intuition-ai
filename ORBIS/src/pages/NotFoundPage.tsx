import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { useI18n } from '../i18n'
import styles from './pages.module.css'

export function NotFoundPage() {
  const t = useI18n()
  const navigate = useNavigate()

  return (
    <div className={`page-fade ${styles.notFound}`}>
      <p className={styles.kicker}>404</p>
      <h1>{t.notFound.title}</h1>
      <p>{t.notFound.body}</p>
      <Button variant="primary" onClick={() => navigate('/')}>
        {t.actions.backHome}
      </Button>
    </div>
  )
}
