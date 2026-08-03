import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GAMES } from '../data/games'

type Filter = 'all' | 'car' | 'color' | 'new'

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
        <h1>게임 🎮</h1>
      </div>
      <p className="section-sub" style={{ marginTop: '-0.4rem' }}>
        자동차랑 색깔 놀이를 골라 보아요
      </p>
      <div className="filter-row" role="tablist" aria-label="게임 필터">
        {(
          [
            ['all', '전체'],
            ['car', '🚗 자동차'],
            ['color', '🎨 색깔'],
            ['new', '✨ 새 게임'],
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
          <Link key={g.id} to={`/games/${g.id}`} className="card">
            <div className="card-emoji">{g.emoji}</div>
            <div className="card-title">{g.title}</div>
            <div className="card-sub">{g.subtitle}</div>
            {g.tags.includes('new') && <span className="tag new">NEW</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
