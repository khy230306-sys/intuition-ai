import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProfile, getSettings, setMuteSfx, setMuteSpeech, setName, useProfileSubscribe } from '../lib/store'
import { formatMinutes, getParentDashboard, setParentSettings } from '../lib/learningProgress'
import type { DifficultyBias } from '../lib/learningTypes'
import { GameArt } from '../components/GameArt'
import { ProgressBar } from '../components/visual/ProgressBar'
import { VisualIcon } from '../components/visual/VisualIcon'
import { Character } from '../components/visual/Character'
import { ParentPinGate } from '../components/ParentPinGate'

export function Parents() {
  return (
    <ParentPinGate>
      <ParentsInner />
    </ParentPinGate>
  )
}

function ParentsInner() {
  const [name, setNameLocal] = useState(() => getProfile().name)
  const [profile, setProfile] = useState(getProfile)
  const [muteSpeech, setMuteSpeechLocal] = useState(() => getSettings().muteSpeech)
  const [muteSfx, setMuteSfxLocal] = useState(() => getSettings().muteSfx)
  const [dash, setDash] = useState(() => getParentDashboard())

  useEffect(() => {
    return useProfileSubscribe(() => {
      setProfile(getProfile())
      const s = getSettings()
      setMuteSpeechLocal(s.muteSpeech)
      setMuteSfxLocal(s.muteSfx)
      setDash(getParentDashboard())
    })
  }, [])

  return (
    <div className="parents-v1">
      <div className="page-head">
        <h1>부모님</h1>
      </div>
      <p className="section-sub" style={{ marginTop: '-0.35rem' }}>
        성장 리포트 · 광고 없음 · 아이 화면과 분리
      </p>

      <section className="card soft-card parents-hero">
        <Character name="youngi" state="encourage" size="md" animate />
        <div>
          <div className="card-title">{profile.name}의 성장</div>
          <div className="card-sub">
            연속 {dash.playStreak}일 · 별 {profile.stars} · 스티커 {profile.stickers.length}
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">오늘</div>
          <div className="stat-value">{formatMinutes(dash.todayMinutes)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">이번 주</div>
          <div className="stat-value">{formatMinutes(dash.weekMinutes)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">활동 수</div>
          <div className="stat-value">{dash.totalActivities}</div>
        </div>
      </div>

      <h2 className="section-title">영역별 성장도</h2>
      <div className="card soft-card">
        {dash.categoryStats.map((c) => (
          <ProgressBar key={c.id} value={c.mastery} label={c.ko} color={c.accent} />
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: '0.9rem' }}>
        <div className="card soft-card">
          <div className="card-title">잘하는 영역</div>
          {dash.strong.length === 0 ? (
            <p className="card-sub">아직 데이터가 쌓이는 중이에요</p>
          ) : (
            dash.strong.map((c) => (
              <div key={c.id} className="parent-list-row">
                <span>{c.short}</span>
                <strong>{c.mastery}%</strong>
              </div>
            ))
          )}
        </div>
        <div className="card soft-card">
          <div className="card-title">연습이 필요해요</div>
          {dash.needs.map((c) => (
            <div key={c.id} className="parent-list-row">
              <span>{c.short}</span>
              <strong>{c.mastery}%</strong>
            </div>
          ))}
        </div>
      </div>

      <h2 className="section-title">최근 7일 활동</h2>
      <div className="week-bars card soft-card">
        {dash.last7.map((d) => (
          <div key={d.date} className="week-col">
            <div className="week-bar-wrap">
              <div className="week-bar" style={{ height: `${Math.min(100, Math.max(8, d.count * 18))}%` }} />
            </div>
            <span>{d.label}</span>
          </div>
        ))}
      </div>

      {dash.topGames.length > 0 && (
        <>
          <h2 className="section-title">가장 많이 한 놀이</h2>
          <div className="grid-2">
            {dash.topGames.map((g) => (
              <div key={g.id} className="card art-card photo-card">
                <div className="art-wrap photo">
                  <GameArt id={g.id} size={88} />
                </div>
                <div className="card-title">{g.title}</div>
                <div className="card-sub">{g.count}번</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">추천 학습</h2>
      <div className="rec-rail">
        {dash.recommendations.map((r) => (
          <Link key={r.gameId} to={`/games/${r.gameId}`} className="rec-card anim-tap">
            <div className="rec-art">
              <GameArt id={r.gameId} size={72} />
            </div>
            <div className="rec-body">
              <div className="card-title">{r.title}</div>
              <p className="rec-why">{r.reason}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '0.9rem', marginTop: '1rem' }}>
        <div className="card-title">아이 이름</div>
        <input value={name} maxLength={12} onChange={(e) => setNameLocal(e.target.value)} className="parent-input" />
        <button type="button" className="btn btn-sunny btn-block" style={{ marginTop: '0.7rem' }} onClick={() => setName(name)}>
          저장
        </button>
      </div>

      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <div className="card-title">스크린타임</div>
        <p className="card-sub">하루 권장 놀이 시간</p>
        <div className="chip-row">
          {[15, 30, 45, 60].map((m) => (
            <button
              key={m}
              type="button"
              className={`chip${dash.settings.screenTimeMinutes === m ? ' on' : ''}`}
              onClick={() => setParentSettings({ screenTimeMinutes: m })}
            >
              {m}분
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '0.9rem' }}>
        <div className="card-title">콘텐츠 난이도</div>
        <div className="chip-row">
          {(
            [
              ['easy', '쉬움'],
              ['auto', '자동'],
              ['challenge', '도전'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chip${dash.settings.difficultyBias === id ? ' on' : ''}`}
              onClick={() => setParentSettings({ difficultyBias: id as DifficultyBias })}
            >
              {label}
            </button>
          ))}
        </div>
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
        <label className="parent-toggle">
          <input type="checkbox" checked={!dash.settings.muteBgm} onChange={(e) => setParentSettings({ muteBgm: !e.target.checked })} />
          <span>배경음악 (준비됨 · 현재 미사용)</span>
        </label>
      </div>

      <p className="section-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <VisualIcon name="reward.gift" size={22} />
        짧게 자주 하는 게 좋아요
      </p>
    </div>
  )
}
