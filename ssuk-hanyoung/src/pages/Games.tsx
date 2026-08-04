import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GAMES } from '../data/games'
import { GameArt } from '../components/GameArt'

type Filter = 'all' | 'car' | 'color' | 'touch' | 'focus' | 'new'

export function Games() {
  const [filter, setFilter] = useState<Filter>('all')
  const list = useMemo(() => {
    if (filter === 'all') return GAMES
    if (filter === 'new') return GAMES.filter((g) => g.tags.includes('new'))
    return GAMES.filter((g) => g.tags.includes(filter))
  }, [filter])

  return (
    <div>
      <div className="page-head">
        <h1>게임</h1>
      </div>
      <p className="section-sub" style={{ marginTop: '-0.4rem' }}>
        선명한 그림으로 골라 보아요
      </p>
      <div className="filter-row" role="tablist" aria-label="게임 필터">
        {(
          [
            ['all', '전체'],
            ['focus', '집중'],
            ['touch', '터치'],
            ['car', '자동차'],
            ['color', '색깔'],
            ['new', '새 게임'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={`chip${filter === id ? ' on' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="filter-count" aria-live="polite">
        {list.length}개 놀이
      </p>
      <div className="grid-2">
        {list.map((g) => (
          <Link key={g.id} to={`/games/${g.id}`} className="card art-card photo-card">
            <div className="art-wrap photo">
              <GameArt id={g.id} size={132} />
            </div>
            <div className="card-title">{g.title}</div>
            <div className="card-sub">{g.subtitle}</div>
            {g.tags.includes('new') && <span className="tag new">NEW</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
