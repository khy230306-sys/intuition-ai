import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GAMES } from '../data/games'
import { CATEGORIES, getLearningMeta, type LearningCategory } from '../data/learning'
import { getGameIllustrationKey } from '../design/visualAssets'
import { getProfile } from '../lib/store'
import { GameArt } from '../components/GameArt'
import { VisualIcon } from '../components/visual/VisualIcon'
import { ProgressBar } from '../components/visual/ProgressBar'

type Filter = 'all' | LearningCategory

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: '전체' },
  ...CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.short })),
]

export function Games() {
  const [params, setParams] = useSearchParams()
  const initial = (params.get('cat') as Filter) || 'all'
  const [filter, setFilter] = useState<Filter>(FILTERS.some((f) => f.id === initial) ? initial : 'all')
  const profile = getProfile()

  const list = useMemo(() => {
    if (filter === 'all') return GAMES
    return GAMES.filter((g) => getLearningMeta(g.id)?.category === filter)
  }, [filter])

  function select(id: Filter) {
    setFilter(id)
    if (id === 'all') setParams({})
    else setParams({ cat: id })
  }

  return (
    <div>
      <div className="page-head">
        <h1>놀이</h1>
      </div>
      <p className="section-sub" style={{ marginTop: '-0.4rem' }}>
        마음에 드는 걸 골라요
      </p>
      <div className="filter-row filter-row-scroll" role="tablist" aria-label="학습 영역 필터">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`chip${filter === f.id ? ' on' : ''}`}
            onClick={() => select(f.id)}
          >
            {f.id === 'all' ? (
              f.label
            ) : (
              <span className="chip-with-icon">
                <VisualIcon name={`category.${f.id}`} size={22} />
                {f.label}
              </span>
            )}
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
          {list.map((g) => {
            const meta = getLearningMeta(g.id)
            const skill = meta ? profile.learningProgress?.[meta.category]?.[meta.skill] : undefined
            const mastery = skill?.mastery ?? 0
            const cat = CATEGORIES.find((c) => c.id === meta?.category)
            const illus = getGameIllustrationKey(g.id, cat ? `category.${cat.id}` : undefined)
            return (
              <Link key={g.id} to={`/games/${g.id}`} className="card art-card photo-card game-meta-card anim-tap">
                <div className="illustration-slot" style={{ background: cat ? `${cat.accent}22` : '#FFF7CC' }}>
                  <GameArt id={g.id} size={88} />
                  <span className="illustration-fallback" aria-hidden>
                    <VisualIcon name={illus} size={36} />
                  </span>
                </div>
                {cat && (
                  <div className="cat-badge">
                    <VisualIcon name={`category.${cat.id}`} size={18} />
                    <span>{cat.short}</span>
                  </div>
                )}
                <div className="card-title">{g.title}</div>
                <div className="card-sub">{g.subtitle}</div>
                {meta && (
                  <div className="game-meta-row">
                    <span className="meta-pill">난이도 {meta.difficulty === 1 ? '쉬움' : meta.difficulty === 2 ? '보통' : '도전'}</span>
                    <span className="meta-pill">
                      {meta.recommendedAge[0]}~{meta.recommendedAge[1]}세
                    </span>
                    <span className="meta-pill">약 {meta.estimatedMinutes}분</span>
                    <span className="meta-pill meta-star">
                      <VisualIcon name="reward.star" size={14} />+{meta.rewardStars || 1}
                    </span>
                  </div>
                )}
                <ProgressBar value={mastery} label="진도" color={cat?.accent} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
