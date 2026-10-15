import { useNavigate } from 'react-router-dom'
import { OrbStage } from '../animation/OrbStage'
import { playCoreSound } from '../app/sound'
import { Button } from '../components/Button'
import { useI18n } from '../i18n'
import { useSettings } from '../storage/SettingsContext'
import styles from './pages.module.css'

export function HomePage() {
  const t = useI18n()
  const navigate = useNavigate()
  const { settings } = useSettings()

  const startPlay = () => {
    playCoreSound(settings.soundEnabled)
    navigate('/play')
  }

  return (
    <div className={`page-fade ${styles.hero}`}>
      <div className={styles.stageBlock}>
        <OrbStage label={t.home.stageLabel} />
      </div>

      <div className={styles.copy}>
        <p className={styles.kicker}>Playable Prototype</p>
        <h1 className={styles.title}>{t.home.title}</h1>
        <p className={styles.slogan}>{t.slogan}</p>
        <p className={styles.tagline}>{t.tagline}</p>
      </div>

      <div className={styles.actions}>
        <Button variant="primary" onClick={startPlay}>
          {t.actions.startExperience}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/brand')}>
          {t.actions.brandIntro}
        </Button>
        <Button variant="ghost" onClick={startPlay}>
          {t.actions.demoPrototype}
        </Button>
      </div>
    </div>
  )
}
