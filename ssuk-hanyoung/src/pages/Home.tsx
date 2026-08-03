import { Link } from 'react-router-dom'
import { GAMES } from '../data/games'
import { getProfile } from '../lib/store'

const FEATURED = ['car-paint', 'sand-play', 'bubble-pop', 'stamp-pad', 'finger-paint', 'pop-it']

export function Home() {
  const profile = getProfile()
  const featured = FEATURED.map((id) => GAMES.find((g) => g.id === id)!).filter(Boolean)
  const news = GAMES.filter((g) => g.tags.includes('new')).slice(0, 6)

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
          <p>색칠·모래놀이·방울 팡팡까지! 터치만 해도 신나게 놀 수 있어요.</p>
          <Link to="/games" className="btn btn-sunny btn-lg" style={{ marginTop: '1.1rem' }}>
            지금 출발하기 🚗💨
          </Link>
        </div>
      </section>

      <h2 className="section-title">한영이 추천 🚗🎨</h2>
      <p className="section-sub">자동차랑 색깔을 좋아하는 친구를 위한 오늘의 놀이</p>
      <div className="grid-2">
        {featured.map((g, i) => (
          <Link
            key={g.id}
            to={`/games/${g.id}`}
            className="card"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="card-emoji">{g.emoji}</div>
            <div className="card-title">{g.title}</div>
            <div className="card-sub">{g.subtitle}</div>
            {g.tags.includes('new') && <span className="tag new">새로워요</span>}
          </Link>
        ))}
      </div>

      <h2 className="section-title">새로 생긴 놀이 ✨</h2>
      <div className="grid-2">
        {news.map((g) => (
          <Link key={g.id} to={`/games/${g.id}`} className="card">
            <div className="card-emoji">{g.emoji}</div>
            <div className="card-title">{g.title}</div>
            <div className="card-sub">{g.subtitle}</div>
          </Link>
        ))}
      </div>

      <h2 className="section-title">탐험도 해 볼까요?</h2>
      <div className="grid-2">
        <Link to="/explore/colors" className="card" style={{ background: '#ffe3ea' }}>
          <div className="card-emoji">🎨</div>
          <div className="card-title">색깔 탐험</div>
          <div className="card-sub">빨간색, 파란색… 이름을 배워요</div>
        </Link>
        <Link to="/explore/vehicles" className="card" style={{ background: '#dde8ff' }}>
          <div className="card-emoji">🚒</div>
          <div className="card-title">탈것 탐험</div>
          <div className="card-sub">소방차, 버스, 경찰차를 만나요</div>
        </Link>
      </div>
    </div>
  )
}
