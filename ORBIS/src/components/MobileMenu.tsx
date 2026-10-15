import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n'
import { playClickSound } from '../app/sound'
import { useSettings } from '../storage/SettingsContext'
import styles from './MobileMenu.module.css'

type MobileMenuProps = {
  open: boolean
  onClose: () => void
}

const navItems = [
  { to: '/', key: 'home' as const },
  { to: '/play', key: 'play' as const },
  { to: '/brand', key: 'brand' as const },
  { to: '/about', key: 'about' as const },
  { to: '/settings', key: 'settings' as const },
]

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const t = useI18n()
  const { settings } = useSettings()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.menu}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.top}>
          <p className={styles.title}>{t.nav.menu}</p>
          <button
            type="button"
            className={styles.close}
            aria-label={t.a11y.closeMobileMenu}
            onClick={() => {
              playClickSound(settings.soundEnabled)
              onClose()
            }}
          >
            ✕
          </button>
        </div>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.linkActive : ''}`.trim()
              }
              onClick={() => {
                playClickSound(settings.soundEnabled)
                onClose()
              }}
            >
              {t.nav[item.key]}
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  )
}
