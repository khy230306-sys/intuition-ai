import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useAppStore, roleLabel } from '@/stores/appStore'
import { t } from '@/i18n'
import { Button } from '@/components/ui/Button'

const nav = [
  { to: '/', label: t('home'), end: true },
  { to: '/timer', label: t('timer') },
  { to: '/players', label: t('players') },
  { to: '/tables', label: t('tables') },
  { to: '/more', label: t('more') },
]

export function AppShell() {
  const session = useAppStore((s) => s.session)
  const lastError = useAppStore((s) => s.lastError)
  const logout = useAppStore((s) => s.logout)
  const undoLast = useAppStore((s) => s.undoLast)
  const navigate = useNavigate()

  return (
    <div className="pd-safe mx-auto flex min-h-dvh max-w-6xl flex-col pb-24 md:pb-8">
      <header className="sticky top-0 z-40 mb-3 border-b border-line/60 bg-felt/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 py-3">
          <div>
            <div className="pd-title text-2xl text-gold sm:text-3xl">{t('appName')}</div>
            <div className="text-xs text-mute sm:text-sm">{t('subtitle')}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => undoLast()} className="hidden sm:inline-flex">
              Undo
            </Button>
            <div className="hidden text-right text-xs text-mute sm:block">
              <div className="text-white">{session?.displayName}</div>
              <div>{session ? roleLabel(session.role) : ''}</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              {t('logout')}
            </Button>
          </div>
        </div>
        {lastError ? (
          <div className="mb-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-rose-200">
            {lastError}
          </div>
        ) : null}
        <nav className="no-print mb-2 hidden gap-2 md:flex">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'min-h-11 rounded-xl px-4 py-2 text-sm',
                  isActive ? 'bg-gold text-black' : 'bg-panel text-mute hover:text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="pd-bottom-nav no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-felt/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-2 pt-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-12 flex-col items-center justify-center rounded-xl text-[11px]',
                  isActive ? 'bg-gold text-black' : 'text-mute',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
