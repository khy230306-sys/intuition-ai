import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { getProfile, useProfileSubscribe } from '../lib/store'
import { unlockSpeech } from '../lib/speech'
import { CHAR_IMG, CharImg } from './GameArt'

const NAV = [
  { to: '/', label: '홈', src: CHAR_IMG.bus, end: true },
  { to: '/games', label: '게임', src: CHAR_IMG.car },
  { to: '/explore', label: '탐험', src: CHAR_IMG.star },
  { to: '/parents', label: '부모님', src: CHAR_IMG.ambulance },
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
          <span className="brand-badge photo">
            <CharImg src={CHAR_IMG.bus} size={44} />
          </span>
          <span className="brand-name">쑥쑥놀이터</span>
        </Link>
        <div className="star-chip" aria-label={`별 ${stars}개`}>
          <CharImg src={CHAR_IMG.star} size={22} />
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
                <span className="ico photo" aria-hidden>
                  <CharImg src={n.src} size={30} />
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
