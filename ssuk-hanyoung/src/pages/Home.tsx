import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CORE_GAMES, getGame } from '../data/games'
import { CATEGORIES } from '../data/learning'
import { getDailyMissions, getProfile, useProfileSubscribe } from '../lib/store'
import { getTodaysRecommendations } from '../lib/learningProgress'
import { CHAR_IMG, CharImg, GameArt } from '../components/GameArt'
import { Character } from '../components/visual/Character'
import { VisualIcon } from '../components/visual/VisualIcon'

export function Home() {
  const [profile, setProfile] = useState(getProfile)
  const [missions, setMissions] = useState(getDailyMissions)
  const [recs, setRecs] = useState(() => getTodaysRecommendations(4))

  useEffect(() => {
    return useProfileSubscribe(() => {
      setProfile(getProfile())
      setMissions(getDailyMissions())
      setRecs(getTodaysRecommendations(4))
    })
  }, [])

  const doneCount = missions.filter((m) => m.done).length
  const streak = profile.playStreak || 0
  const charState = doneCount >= 2 ? 'celebrate' : streak > 0 ? 'happy' : 'encourage'

  return (
    <div className="home-v1">
      <section className="home-topbar-stats">
        <div>
          <p className="hero-hi">안녕, {profile.name}!</p>
          <h1 className="home-brand">
            <span className="brand-aizio-inline">AIZIO</span>
            <span className="brand-hero">쑥쑥놀이터</span>
          </h1>
        </div>
        <div className="home-stat-chips">
          <div className="stat-chip" aria-label={`오늘 별 ${profile.stars}개`}>
            <VisualIcon name="reward.star" size={28} />
            <span>{profile.stars}</span>
          </div>
          <div className="stat-chip" aria-label={`연속 ${streak}일`}>
            <VisualIcon name="nature.sun" size={28} />
            <span>{streak}일</span>
          </div>
        </div>
      </section>

      <section className="home-hero-char card soft-card">
        <div className="home-char-pair">
          <Character name="hani" state={charState} size="large" animate />
          <Character name="youngi" state={charState === 'celebrate' ? 'happy' : 'idle'} size="md" animate />
        </div>
        <div className="home-message">
          <p className="home-message-title">오늘의 메시지</p>
          <p>
            {doneCount === 0
              ? '오늘도 쑥쑥 놀아볼까요?'
              : doneCount >= missions.length
                ? '미션을 모두 해냈어요! 최고예요!'
                : `미션 ${doneCount}개 완료! 조금만 더 해봐요`}
          </p>
        </div>
      </section>

      <h2 className="section-title">오늘의 쑥쑥 추천</h2>
      <p className="section-sub">지금 하기 좋은 놀이</p>
      <div className="rec-rail">
        {recs.map((r) => (
          <Link key={r.gameId} to={`/games/${r.gameId}`} className="rec-card anim-tap">
            <div className="rec-art">
              <GameArt id={r.gameId} size={88} />
            </div>
            <div className="rec-body">
              <div className="card-title">{r.title}</div>
              <p className="rec-why">{r.reason}</p>
              <div className="rec-meta">
                <span>약 {r.estimatedMinutes}분</span>
                <span className="rec-stars">
                  <VisualIcon name="reward.star" size={18} />+{r.rewardStars || 1}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="section-title">학습 영역</h2>
      <p className="section-sub">관심 있는 곳을 골라요</p>
      <div className="category-grid">
        {CATEGORIES.map((c) => (
          <Link key={c.id} to={`/games?cat=${c.id}`} className="category-card anim-tap" style={{ ['--cat' as string]: c.accent }}>
            <VisualIcon name={c.visualKey} size={56} />
            <span className="category-name">{c.short}</span>
          </Link>
        ))}
      </div>

      <h2 className="section-title">자유 놀이터</h2>
      <p className="section-sub">원하는 놀이를 골라요</p>
      <Link to="/games" className="btn btn-sky btn-block btn-lg anim-tap" style={{ marginBottom: '1rem' }}>
        놀이 더 보기 ({CORE_GAMES.length}+)
      </Link>

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
              className="card art-card photo-card anim-tap"
              style={{ opacity: m.done ? 0.82 : 1, background: m.done ? '#d9fbe5' : '#FFFDF5' }}
            >
              <div className="art-wrap photo">
                <GameArt id={m.id} size={96} />
              </div>
              <div className="card-title">{g.title}</div>
              <div className="card-sub">{m.done ? '완료!' : '해 볼까요?'}</div>
            </Link>
          )
        })}
        <Link to="/games/sticker-book" className="card art-card photo-card anim-tap" style={{ background: '#FFF3C4' }}>
          <div className="art-wrap photo">
            <CharImg src={CHAR_IMG.star} size={110} />
          </div>
          <div className="card-title">스티커</div>
          <div className="card-sub">{profile.stickers.length}개</div>
        </Link>
      </div>

      <h2 className="section-title">탐험</h2>
      <div className="grid-2">
        <Link to="/explore/colors" className="card art-card photo-card anim-tap" style={{ background: '#FFD6E4' }}>
          <div className="art-wrap photo">
            <CharImg src={CHAR_IMG.paint} size={110} />
          </div>
          <div className="card-title">색깔</div>
          <div className="card-sub">눌러 보아요</div>
        </Link>
        <Link to="/explore/vehicles" className="card art-card photo-card anim-tap" style={{ background: '#D6E4FF' }}>
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
