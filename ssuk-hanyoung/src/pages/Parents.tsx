import { useState } from 'react'
import { getProfile, setName } from '../lib/store'
import { GAMES } from '../data/games'

export function Parents() {
  const [name, setNameLocal] = useState(() => getProfile().name)
  const profile = getProfile()
  const played = Object.entries(profile.played).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="page-head">
        <h1>부모님 💚</h1>
      </div>
      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <div className="card-title">아이 이름</div>
        <div className="card-sub">홈 화면에서 불러 줄 이름이에요</div>
        <input
          value={name}
          maxLength={12}
          onChange={(e) => setNameLocal(e.target.value)}
          style={{
            marginTop: '0.7rem',
            width: '100%',
            borderRadius: '1rem',
            border: '3px solid var(--fg)',
            padding: '0.75rem 0.9rem',
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            background: '#fff',
          }}
        />
        <button
          type="button"
          className="btn btn-sunny btn-block"
          style={{ marginTop: '0.7rem' }}
          onClick={() => setName(name)}
        >
          저장하기
        </button>
      </div>

      <div className="card">
        <div className="card-title">모아둔 별 ⭐ {profile.stars}</div>
        <div className="card-sub" style={{ marginTop: '0.35rem' }}>
          스티커 {profile.stickers?.length ?? 0}개 · 오늘 미션으로 다시 들어오게 유도해요
        </div>
        <div className="card-sub" style={{ marginTop: '0.5rem' }}>
          이번 강화: 사운드보드, 자동차 동화, 퍼레이드, 퍼즐, 스티커 차고, 오늘의 미션
        </div>
      </div>

      {played.length > 0 && (
        <>
          <h2 className="section-title">자주 한 놀이</h2>
          <div className="grid-2">
            {played.slice(0, 6).map(([id, count]) => {
              const g = GAMES.find((x) => x.id === id)
              if (!g) return null
              return (
                <div key={id} className="card">
                  <div className="card-emoji">{g.emoji}</div>
                  <div className="card-title">{g.title}</div>
                  <div className="card-sub">{count}번 플레이</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
