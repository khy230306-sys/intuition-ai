import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GAMES, getGame } from '../data/games'
import { getDailyMissions, getProfile, useProfileSubscribe } from '../lib/store'
import { GameArt } from '../components/GameArt'
import { CartoonArt } from '../components/CartoonArt'

const FEATURED = ['sound-board', 'story-tap', 'car-parade', 'car-puzzle', 'sticker-book', 'color-follow']

export function Home() {
  const [profile, setProfile] = useState(getProfile)
  const [missions, setMissions] = useState(getDailyMissions)

  useEffect(() => {
    return useProfileSubscribe(() => {
      setProfile(getProfile())
      setMissions(getDailyMissions())
    })
  }, [])

  const featured = FEATURED.map((id) => GAMES.find((g) => g.id === id)!).filter(Boolean)
  const doneCount = missions.filter((m) => m.done).length

  return (
    <div>
      <section className="hero">
        <img src="/assets/hero-cars.jpg" alt="즐겁게 달리는 자동차 친구들" width={1600} height={800} />
        <div className="hero-shade" aria-hidden />
        <div className="hero-body">
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', opacity: 0.92 }}>
            반가워요, {profile.name} 👋
          </p>
          <h1>
            오늘도 <span className="hi">부릉부릉</span> 달려요!
          </h1>
          <p>미션도 하고, 스티커도 모으고, 동화도 들어요!</p>
          <Link to="/games" className="btn btn-sunny btn-lg" style={{ marginTop: '1.1rem' }}>
            지금 출발하기 🚗💨
          </Link>
        </div>
      </section>

      <h2 className="section-title">오늘의 미션 ⭐</h2>
      <p className="section-sub">
        {doneCount}/{missions.length} 완료 · 하면 별 + 스티커
      </p>
      <div className="grid-2">
        {missions.map((m) => {
          const g = getGame(m.id)
          if (!g) return null
          return (
            <Link
              key={m.id}
              to={`/games/${m.id}`}
              className="card art-card"
              style={{ opacity: m.done ? 0.75 : 1, background: m.done ? '#d9fbe5' : '#FFFDF5' }}
            >
              <div className="art-wrap">
                <GameArt id={m.id} size={72} />
              </div>
              <div className="card-title">{g.title}</div>
              <div className="card-sub">{m.done ? '완료!' : g.subtitle}</div>
              {m.done && <span className="tag">완료</span>}
            </Link>
          )
        })}
        <Link to="/games/sticker-book" className="card art-card" style={{ background: '#FFF3C4' }}>
          <div className="art-wrap">
            <CartoonArt kind="star" color="#FFD400" size={72} />
          </div>
          <div className="card-title">스티커 차고</div>
          <div className="card-sub">{profile.stickers.length}개 보유</div>
        </Link>
      </div>

      <h2 className="section-title">새로 강화된 놀이</h2>
      <p className="section-sub">더 선명한 자동차 그림으로 놀아요</p>
      <div className="grid-2">
        {featured.map((g, i) => (
          <Link key={g.id} to={`/games/${g.id}`} className="card art-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="art-wrap">
              <GameArt id={g.id} size={72} />
            </div>
            <div className="card-title">{g.title}</div>
            <div className="card-sub">{g.subtitle}</div>
            <span className="tag new">NEW</span>
          </Link>
        ))}
      </div>

      <h2 className="section-title">탐험도 해 볼까요?</h2>
      <div className="grid-2">
        <Link to="/explore/colors" className="card art-card" style={{ background: '#FFD6E4' }}>
          <div className="art-wrap">
            <CartoonArt kind="flower" color="#FF2D55" size={72} />
          </div>
          <div className="card-title">색깔 탐험</div>
          <div className="card-sub">선명한 색깔을 만져요</div>
        </Link>
        <Link to="/explore/vehicles" className="card art-card" style={{ background: '#D6E4FF' }}>
          <div className="art-wrap">
            <CartoonArt kind="fire" color="#FF2D55" size={72} />
          </div>
          <div className="card-title">탈것 탐험</div>
          <div className="card-sub">뚜렷한 자동차 친구들</div>
        </Link>
      </div>
    </div>
  )
}
