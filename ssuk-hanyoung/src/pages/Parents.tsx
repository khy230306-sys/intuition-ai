import { useEffect, useState } from 'react'
import { getProfile, getSettings, setMuteSfx, setMuteSpeech, setName, useProfileSubscribe } from '../lib/store'
import { GAMES } from '../data/games'
import { GameArt } from '../components/GameArt'

export function Parents() {
  const [name, setNameLocal] = useState(() => getProfile().name)
  const [profile, setProfile] = useState(getProfile)
  const [muteSpeech, setMuteSpeechLocal] = useState(() => getSettings().muteSpeech)
  const [muteSfx, setMuteSfxLocal] = useState(() => getSettings().muteSfx)

  useEffect(() => {
    return useProfileSubscribe(() => {
      setProfile(getProfile())
      const s = getSettings()
      setMuteSpeechLocal(s.muteSpeech)
      setMuteSfxLocal(s.muteSfx)
    })
  }, [])

  const played = Object.entries(profile.played).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="page-head">
        <h1>부모님</h1>
      </div>
      <p className="section-sub" style={{ marginTop: '-0.35rem' }}>
        4~5세 자동차·색깔 놀이 · 광고 없음
      </p>

      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <div className="card-title">아이 이름</div>
        <input
          value={name}
          maxLength={12}
          onChange={(e) => setNameLocal(e.target.value)}
          className="parent-input"
        />
        <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.7rem' }} onClick={() => setName(name)}>
          저장
        </button>
      </div>

      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <div className="card-title">소리 설정</div>
        <label className="parent-toggle">
          <input
            type="checkbox"
            checked={!muteSpeech}
            onChange={(e) => {
              setMuteSpeech(!e.target.checked)
              setMuteSpeechLocal(!e.target.checked)
            }}
          />
          <span>말소리 (읽어 주기)</span>
        </label>
        <label className="parent-toggle">
          <input
            type="checkbox"
            checked={!muteSfx}
            onChange={(e) => {
              setMuteSfx(!e.target.checked)
              setMuteSfxLocal(!e.target.checked)
            }}
          />
          <span>효과음 (빵빵·톡)</span>
        </label>
      </div>

      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <div className="card-title">
          별 {profile.stars} · 스티커 {profile.stickers.length}
        </div>
        <div className="card-sub" style={{ marginTop: '0.4rem' }}>
          짧게 자주 하는 게 좋아요. 추천 놀이는 퍼즐·따라하기·색칠·사운드보드예요.
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
                <div key={id} className="card art-card photo-card">
                  <div className="art-wrap photo">
                    <GameArt id={id} size={88} />
                  </div>
                  <div className="card-title">{g.title}</div>
                  <div className="card-sub">{count}번</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
