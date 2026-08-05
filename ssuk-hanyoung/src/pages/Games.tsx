import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CORE_GAMES, GAMES, MORE_GAMES } from '../data/games'
import { GameArt } from '../components/GameArt'

type Filter = 'core' | 'car' | 'color' | 'focus' | 'more'

export function Games() {
  const [filter, setFilter] = useState<Filter>('core')
  const list = useMemo(() => {
    if (filter === 'core') return CORE_GAMES
    if (filter === 'more') return MORE_GAMES
    return GAMES.filter((g) => g.tags.includes(filter))
  }, [filter])

  return (
    <div>
      <div className="page-head">
        <h1>놀이</h1>
      </div>
      <p className="section-sub" style={{ marginTop: '-0.4rem' }}>
        마음에 드는 걸 골라요
      </p>
      <div className="filter-row" role="tablist" aria-label="놀이 필터">
        {(
          [
            ['core', '추천'],
            ['car', '자동차'],
            ['color', '색깔'],
            ['focus', '집중'],
            ['more', '더보기'],
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
        {list.length}개
      </p>
      {list.length === 0 ? (
        <p className="section-sub">이 칸에는 아직 없어요</p>
      ) : (
        <div className="grid-2">
          {list.map((g) => (
            <Link key={g.id} to={`/games/${g.id}`} className="card art-card photo-card">
              <div className="art-wrap photo">
                <GameArt id={g.id} size={132} />
              </div>
              <div className="card-title">{g.title}</div>
              <div className="card-sub">{g.subtitle}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
