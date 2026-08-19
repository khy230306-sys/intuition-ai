import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { MobileMenu } from '../components/MobileMenu'
import { useI18n } from '../i18n'

export function AppLayout() {
  const t = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t.a11y.skipToContent}
      </a>
      <Header menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main id="main" className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
