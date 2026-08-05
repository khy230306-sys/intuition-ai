import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CORE_GAMES, getGame } from '../data/games'
import { getDailyMissions, getProfile, useProfileSubscribe } from '../lib/store'
import { CHAR_IMG, CharImg, GameArt } from '../components/GameArt'

const PLAY_NOW = ['sound-board', 'car-puzzle', 'color-follow', 'car-paint', 'story-tap', 'maze-drive']

export function Home() {
  const [profile, setProfile] = useState(getProfile)
  const [missions, setMissions] = useState(getDailyMissions)

  useEffect(() => {
    return useProfileSubscribe(() => {
      setProfile(getProfile())
      setMissions(getDailyMissions())
    })
  }, [])

  const playNow = PLAY_NOW.map((id) => getGame(id)!).filter(Boolean)
  const doneCount = missions.filter((m) => m.done).length

  return (
    <div>
      <section className="hero">
        <img src="/assets/hero-cars.jpg" alt="" width={1600} height={800} />
        <div className="hero-shade" aria-hidden />
        <div className="hero-body">
          <p className="hero-hi">안녕, {profile.name}!</p>
          <h1>
            <span className="brand-hero">쑥쑥놀이터</span>
          </h1>
          <p>자동차랑 색깔로 놀아요</p>
          <Link to="/games" className="btn btn-sunny btn-lg" style={{ marginTop: '1rem' }}>
            놀이 고르기
          </Link>
        </div>
      </section>

      <h2 className="section-title">오늘 미션</h2>
      <p className="section-sub">
        {doneCount}/{missions.length} 완료
      </p>
      <div className="grid-2">
        {missions.map((m) => {
          const g = getGame(m.id)
          if (!g) return null
          return (
            <Link
              key={m.id}
              to={`/games/${m.id}`}
              className="card art-card photo-card"
              style={{ opacity: m.done ? 0.82 : 1, background: m.done ? '#d9fbe5' : '#FFFDF5' }}
            >
              <div className="art-wrap photo">
                <GameArt id={m.id} size={110} />
              </div>
              <div className="card-title">{g.title}</div>
              <div className="card-sub">{m.done ? '완료!' : '해 볼까요?'}</div>
            </Link>
          )
        })}
        <Link to="/games/sticker-book" className="card art-card photo-card" style={{ background: '#FFF3C4' }}>
          <div className="art-wrap photo">
            <CharImg src={CHAR_IMG.star} size={110} />
          </div>
          <div className="card-title">스티커</div>
          <div className="card-sub">{profile.stickers.length}개</div>
        </Link>
      </div>

      <h2 className="section-title">지금 놀아요</h2>
      <p className="section-sub">제일 재미있는 놀이</p>
      <div className="grid-2">
        {playNow.map((g, i) => (
          <Link key={g.id} to={`/games/${g.id}`} className="card art-card photo-card" style={{ animationDelay: `${i * 0.04}s` }}>
            <div className="art-wrap photo">
              <GameArt id={g.id} size={128} />
            </div>
            <div className="card-title">{g.title}</div>
            <div className="card-sub">{g.subtitle}</div>
          </Link>
        ))}
      </div>

      <div className="home-more">
        <Link to="/games" className="btn btn-sky btn-block">
          놀이 더 보기 ({CORE_GAMES.length}+)
        </Link>
      </div>

      <h2 className="section-title">탐험</h2>
      <div className="grid-2">
        <Link to="/explore/colors" className="card art-card photo-card" style={{ background: '#FFD6E4' }}>
          <div className="art-wrap photo">
            <CharImg src={CHAR_IMG.paint} size={110} />
          </div>
          <div className="card-title">색깔</div>
          <div className="card-sub">눌러 보아요</div>
        </Link>
        <Link to="/explore/vehicles" className="card art-card photo-card" style={{ background: '#D6E4FF' }}>
          <div className="art-wrap photo">
            <CharImg src={CHAR_IMG.fire} size={110} />
          </div>
          <div className="card-title">자동차</div>
          <div className="card-sub">친구들 만나요</div>
        </Link>
      </div>
    </div>
  )
}
