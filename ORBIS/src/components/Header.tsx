import { NavLink } from 'react-router-dom'
import { Logo } from '../brand/Logo'
import { useI18n } from '../i18n'
import { useSettings } from '../storage/SettingsContext'
import { playClickSound } from '../app/sound'
import styles from './Header.module.css'

type HeaderProps = {
  menuOpen: boolean
  onToggleMenu: () => void
}

const navItems = [
  { to: '/', key: 'home' as const },
  { to: '/brand', key: 'brand' as const },
  { to: '/about', key: 'about' as const },
  { to: '/settings', key: 'settings' as const },
]

export function Header({ menuOpen, onToggleMenu }: HeaderProps) {
  const t = useI18n()
  const { settings, toggleSound } = useSettings()

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brandLink} aria-label={t.brandName}>
          <Logo size={34} />
        </NavLink>

        <nav className={styles.desktopNav} aria-label="Desktop">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`.trim()
              }
              end={item.to === '/'}
            >
              {t.nav[item.key]}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.iconButton} ${settings.soundEnabled ? styles.iconButtonActive : ''}`}
            aria-label={settings.soundEnabled ? t.actions.soundOff : t.actions.soundOn}
            aria-pressed={settings.soundEnabled}
            onClick={() => {
              const next = !settings.soundEnabled
              toggleSound()
              if (next) playClickSound(true)
            }}
          >
            {settings.soundEnabled ? '♪' : '🔇'}
          </button>

          <NavLink
            to="/settings"
            className={styles.iconButton}
            aria-label={t.actions.openSettings}
          >
            ⚙
          </NavLink>

          <button
            type="button"
            className={`${styles.iconButton} ${styles.burger}`}
            aria-label={menuOpen ? t.a11y.closeMobileMenu : t.a11y.openMobileMenu}
            aria-expanded={menuOpen}
            onClick={() => {
              playClickSound(settings.soundEnabled)
              onToggleMenu()
            }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </header>
  )
}
