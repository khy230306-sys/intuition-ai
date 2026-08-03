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
        <div className="card-sub" style={{ marginTop: '0.5rem' }}>
          이번 업데이트는 자동차·색깔 놀이를 중심으로 새 게임을 많이 넣었어요.
        </div>
        <ul style={{ margin: '0.8rem 0 0', paddingLeft: '1.1rem', color: 'var(--muted)' }}>
          <li>색깔 차고 / 부릉부릉 레이스 / 주차 놀이</li>
          <li>자동차 색칠공장 / 조립 / 색깔 섞기</li>
          <li>자동차 기억카드 · 소리 맞추기</li>
        </ul>
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
