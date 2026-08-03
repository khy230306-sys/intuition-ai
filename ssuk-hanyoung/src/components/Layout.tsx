import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { getProfile, useProfileSubscribe } from '../lib/store'
import { unlockSpeech } from '../lib/speech'

const NAV = [
  { to: '/', label: '홈', ico: '🚌', end: true },
  { to: '/games', label: '게임', ico: '🎮' },
  { to: '/explore', label: '탐험', ico: '🧭' },
  { to: '/parents', label: '부모님', ico: '💚' },
]

export function Layout() {
  const [stars, setStars] = useState(() => getProfile().stars)
  const loc = useLocation()
  const hideNav = loc.pathname.startsWith('/games/')

  useEffect(() => {
    return useProfileSubscribe(() => setStars(getProfile().stars))
  }, [])

  useEffect(() => {
    const unlock = () => unlockSpeech()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  return (
    <div className="app-shell" onPointerDown={() => unlockSpeech()}>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="쑥쑥놀이터 홈">
          <span className="brand-badge">
            <img src="/assets/car-bus.png" alt="" width={36} height={36} />
          </span>
          <span className="brand-name">쑥쑥놀이터</span>
        </Link>
        <div className="star-chip" aria-label={`별 ${stars}개`}>
          <span aria-hidden>⭐</span>
          <span>{stars}</span>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      {!hideNav && (
        <nav className="bottom-nav" aria-label="주요 메뉴">
          <div className="bottom-nav-inner">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="ico" aria-hidden>
                  {n.ico}
                </span>
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
