import './style.css'
import {
  sfxFever,
  sfxGameOver,
  sfxGo,
  sfxHit,
  sfxLevelUp,
  sfxMiss,
  sfxPerfect,
  sfxStage,
  sfxStart,
  unlockAudio,
  vibrate,
} from './audio'
import {
  FEVER_COMBO,
  STAGE_EVERY,
  SWIPE_ARROW,
  SWIPE_LABEL,
  colorById,
  comboMultiplier,
  createStats,
  isFever,
  nextRound,
  rivalLine,
  scoreForGo,
  scoreForSpeed,
  stageClearBonus,
  type GameStats,
  type Round,
  type Screen,
  type SwipeDir,
} from './game'
import {
  MEDALS,
  dailyTarget,
  gradeForGo,
  gradeForSpeed,
  loadProfile,
  rankProgress,
  settleRun,
  type Profile,
  type SettleResult,
} from './meta'

const app = document.querySelector<HTMLDivElement>('#app')!

let screen: Screen = 'title'
let profile: Profile = loadProfile()
let stats: GameStats = createStats()
let round: Round | null = null
let phase: 'wait' | 'armed' | 'active' | 'feedback' | 'stage' = 'wait'
let feedback: 'hit' | 'miss' | null = null
let feedbackText = ''
let goArmedAt = 0
let roundStartedAt = 0
let pickHit = new Set<number>()
let timerId: number | null = null
let goDelayId: number | null = null
let flashClass = ''
let settle: SettleResult | null = null
let stageBanner = ''
let justEnteredFever = false

function clearTimers() {
  if (timerId != null) {
    window.clearTimeout(timerId)
    timerId = null
  }
  if (goDelayId != null) {
    window.clearTimeout(goDelayId)
    goDelayId = null
  }
}

function setScreen(next: Screen) {
  screen = next
  render()
}

function refreshMult() {
  stats.multiplier = comboMultiplier(stats.combo, stats.fever)
}

function startRun() {
  unlockAudio()
  sfxStart()
  clearTimers()
  profile = loadProfile()
  stats = createStats()
  settle = null
  feedback = null
  feedbackText = ''
  pickHit = new Set()
  flashClass = ''
  stageBanner = ''
  justEnteredFever = false
  screen = 'play'
  beginRound()
}

function beginRound() {
  clearTimers()
  pickHit = new Set()
  feedback = null
  feedbackText = ''
  flashClass = ''
  stageBanner = ''
  justEnteredFever = false
  round = nextRound(stats.round, stats.stage)
  phase = 'wait'
  refreshMult()
  render()

  if (round.kind === 'go') {
    phase = 'wait'
    render()
    goDelayId = window.setTimeout(() => {
      phase = 'armed'
      goArmedAt = performance.now()
      sfxGo()
      vibrate(8)
      flashClass = 'flash-go'
      render()
      window.setTimeout(() => {
        flashClass = ''
      }, 180)
      timerId = window.setTimeout(() => {
        failRound('늦었어요!')
      }, round && round.kind === 'go' ? round.windowMs : 900)
    }, round.delayMs)
    return
  }

  phase = 'active'
  roundStartedAt = performance.now()
  render()
  timerId = window.setTimeout(() => {
    failRound('시간 초과!')
  }, round.limitMs)
}

function afterSuccess(points: number, detail: string, grade: 'S' | 'A' | 'B' | 'C') {
  clearTimers()
  const nextCombo = stats.combo + 1
  const wasFever = stats.fever
  const fever = isFever(nextCombo)
  let feverPeaks = stats.feverPeaks
  justEnteredFever = fever && !wasFever
  if (justEnteredFever) {
    feverPeaks += 1
    sfxFever()
    vibrate([10, 30, 10, 30, 10])
  }

  let perfects = stats.perfects
  if (grade === 'S') {
    perfects += 1
    sfxPerfect()
  } else {
    sfxHit()
  }

  stats = {
    ...stats,
    score: stats.score + points,
    combo: nextCombo,
    bestCombo: Math.max(stats.bestCombo, nextCombo),
    round: stats.round + 1,
    lastDelta: points,
    lastGrade: grade,
    perfects,
    fever,
    feverPeaks,
    multiplier: comboMultiplier(nextCombo, fever),
  }

  feedback = 'hit'
  feedbackText = detail
  phase = 'feedback'
  flashClass = justEnteredFever ? 'flash-fever' : grade === 'S' ? 'flash-perfect' : 'flash-hit'
  if (!justEnteredFever) vibrate(10)
  render()

  // Stage milestone every STAGE_EVERY successful rounds counted via round index
  const shouldStage = stats.round > 0 && stats.round % STAGE_EVERY === 0

  window.setTimeout(() => {
    flashClass = ''
    if (shouldStage) {
      clearStageUp()
    } else {
      beginRound()
    }
  }, justEnteredFever ? 720 : grade === 'S' ? 560 : 420)
}

function clearStageUp() {
  const bonus = stageClearBonus(stats.stage, stats.multiplier)
  const heal = stats.lives < stats.maxLives
  stats = {
    ...stats,
    score: stats.score + bonus,
    stage: stats.stage + 1,
    lives: heal ? stats.lives + 1 : stats.lives,
    lastDelta: bonus,
  }
  stageBanner = heal
    ? `STAGE ${stats.stage} · +${bonus} · 목숨 +1`
    : `STAGE ${stats.stage} · +${bonus}`
  phase = 'stage'
  sfxStage()
  vibrate([15, 25, 15])
  flashClass = 'flash-stage'
  render()
  window.setTimeout(() => {
    flashClass = ''
    stageBanner = ''
    beginRound()
  }, 900)
}

function failRound(reason: string) {
  clearTimers()
  const lives = stats.lives - 1
  stats = {
    ...stats,
    lives,
    combo: 0,
    fever: false,
    multiplier: 1,
    round: stats.round + 1,
    lastDelta: 0,
    lastGrade: null,
  }
  feedback = 'miss'
  feedbackText = reason
  phase = 'feedback'
  flashClass = 'flash-miss'
  justEnteredFever = false
  sfxMiss()
  vibrate([20, 40, 20])
  render()

  window.setTimeout(() => {
    flashClass = ''
    if (lives <= 0) {
      endRun()
    } else {
      beginRound()
    }
  }, 700)
}

function endRun() {
  clearTimers()
  settle = settleRun(profile, {
    score: stats.score,
    bestCombo: stats.bestCombo,
    stage: stats.stage,
    perfects: stats.perfects,
    feverPeaks: stats.feverPeaks,
    bestReactMs: stats.bestReactMs,
    nearMiss: profile.bestScore > 0 && profile.bestScore - stats.score <= 120 && stats.score < profile.bestScore,
  })
  profile = settle.profile
  if (settle.leveledUp) sfxLevelUp()
  else sfxGameOver()
  setScreen('result')
}

function onGoTap() {
  if (!round || round.kind !== 'go' || phase === 'feedback' || phase === 'stage') return
  if (phase === 'wait') {
    failRound('성급했어요!')
    return
  }
  if (phase === 'armed') {
    const ms = performance.now() - goArmedAt
    clearTimers()
    const grade = gradeForGo(ms)
    const upcomingFever = isFever(stats.combo + 1)
    const useMult = comboMultiplier(stats.combo + 1, upcomingFever)
    const pts = scoreForGo(ms, useMult, grade)
    stats.bestReactMs =
      stats.bestReactMs == null ? Math.round(ms) : Math.min(stats.bestReactMs, Math.round(ms))
    afterSuccess(pts, `${Math.round(ms)}ms · ${grade}`, grade)
  }
}

function onSwipe(dir: SwipeDir) {
  if (!round || round.kind !== 'swipe' || phase !== 'active') return
  const elapsed = performance.now() - roundStartedAt
  if (dir === round.dir) {
    const grade = gradeForSpeed(elapsed, round.limitMs)
    const upcomingFever = isFever(stats.combo + 1)
    const useMult = comboMultiplier(stats.combo + 1, upcomingFever)
    const pts = scoreForSpeed(elapsed, round.limitMs, useMult, grade)
    afterSuccess(pts, `${SWIPE_LABEL[dir]} · ${grade}`, grade)
  } else {
    failRound('방향 틀림!')
  }
}

function onPickTile(index: number) {
  if (!round || round.kind !== 'pick' || phase !== 'active') return
  if (pickHit.has(index)) return
  const pick = round
  const color = pick.tiles[index]!
  if (color !== pick.target) {
    failRound('잘못된 색!')
    return
  }
  pickHit.add(index)
  vibrate(6)
  const remaining = pick.tiles.filter((c, i) => c === pick.target && !pickHit.has(i))
  if (remaining.length === 0) {
    const elapsed = performance.now() - roundStartedAt
    const grade = gradeForSpeed(elapsed, pick.limitMs)
    const upcomingFever = isFever(stats.combo + 1)
    const useMult = comboMultiplier(stats.combo + 1, upcomingFever)
    const pts = scoreForSpeed(elapsed, pick.limitMs, useMult, grade)
    afterSuccess(pts, `${pick.needed}개 · ${grade}`, grade)
  } else {
    render()
  }
}

/* ── Swipe detection ── */
let touchStart: { x: number; y: number } | null = null

function attachSwipe(el: HTMLElement) {
  const threshold = 36
  const start = (x: number, y: number) => {
    touchStart = { x, y }
  }
  const end = (x: number, y: number) => {
    if (!touchStart) return
    const dx = x - touchStart.x
    const dy = y - touchStart.y
    const adx = Math.abs(dx)
    const ady = Math.abs(dy)
    touchStart = null
    if (Math.max(adx, ady) < threshold) return
    if (adx > ady) onSwipe(dx > 0 ? 'right' : 'left')
    else onSwipe(dy > 0 ? 'down' : 'up')
  }

  el.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0]
      if (t) start(t.clientX, t.clientY)
    },
    { passive: true },
  )
  el.addEventListener(
    'touchend',
    (e) => {
      const t = e.changedTouches[0]
      if (t) end(t.clientX, t.clientY)
    },
    { passive: true },
  )
  el.addEventListener('mousedown', (e) => start(e.clientX, e.clientY))
  el.addEventListener('mouseup', (e) => end(e.clientX, e.clientY))
}

function hearts(n: number, max: number): string {
  return Array.from({ length: max }, (_, i) =>
    i < n ? '<span class="heart on"></span>' : '<span class="heart"></span>',
  ).join('')
}

function renderTitle() {
  const rp = rankProgress(profile.xp)
  const target = dailyTarget(profile.xp)
  const dailyPct = Math.min(1, profile.dailyBest / target)
  const rival = rivalLine(profile.bestScore, 0)

  return `
    <div class="shell title-shell">
      <div class="sky" aria-hidden="true">
        <div class="bolt bolt-a"></div>
        <div class="bolt bolt-b"></div>
        <div class="ripple r1"></div>
        <div class="ripple r2"></div>
        <div class="ripple r3"></div>
      </div>
      <div class="rank-chip" style="--rank:${rp.cur.color}">
        <span class="rank-name">${rp.cur.label}</span>
        <span class="rank-bar"><i style="width:${Math.round(rp.pct * 100)}%"></i></span>
        <span class="rank-need">${rp.next ? `다음 ${rp.next.label}까지 ${rp.need}` : 'MAX'}</span>
      </div>
      <header class="hero">
        <p class="eyebrow">MOBILE ARCADE</p>
        <h1 class="brand">잽</h1>
        <p class="tagline">한 판 더. 베스트를 깨고, 랭크를 올려라.</p>
        <div class="cta-row">
          <button type="button" class="btn primary" data-action="play">한 판 더</button>
          <button type="button" class="btn ghost" data-action="how">방법</button>
        </div>
        <div class="meta-panel">
          <div class="meta-row">
            <span>베스트</span>
            <strong>${profile.bestScore}</strong>
          </div>
          <div class="meta-row">
            <span>연속 ${profile.dayStreak}일</span>
            <strong>${profile.totalPlays}판</strong>
          </div>
          <div class="daily">
            <div class="daily-head">
              <span>오늘의 도전</span>
              <strong>${profile.dailyBest}/${target}</strong>
            </div>
            <div class="daily-bar"><i style="width:${Math.round(dailyPct * 100)}%"></i></div>
            <p class="daily-note">${profile.dailyCleared ? '클리어! +150 XP 획득' : rival}</p>
          </div>
        </div>
        <button type="button" class="linkish" data-action="medals">메달 ${profile.medals.length}/${MEDALS.length}</button>
      </header>
    </div>
  `
}

function renderHow() {
  return `
    <div class="shell how-shell">
      <button type="button" class="back" data-action="title" aria-label="뒤로">←</button>
      <h2 class="section-title">플레이 방법</h2>
      <p class="section-lead">빨라질수록 점수·XP·랭크가 같이 올라갑니다.</p>
      <ul class="how-list">
        <li>
          <span class="how-badge go">GO</span>
          <div>
            <strong>대기 → 초록불</strong>
            <p>성급하면 아웃. S등급(≤160ms)은 보너스 폭주.</p>
          </div>
        </li>
        <li>
          <span class="how-badge swipe">SWIPE</span>
          <div>
            <strong>방향 스와이프</strong>
            <p>화살표 방향으로. 빠를수록 등급↑</p>
          </div>
        </li>
        <li>
          <span class="how-badge pick">PICK</span>
          <div>
            <strong>색 찾기</strong>
            <p>지시 색만 탭. 스테이지가 오르면 색이 늘어납니다.</p>
          </div>
        </li>
        <li>
          <span class="how-badge fever">FEVER</span>
          <div>
            <strong>콤보 ${FEVER_COMBO}+ 피버</strong>
            <p>×1.5 점수. ${STAGE_EVERY}라운드마다 스테이지 클리어 보너스·목숨 회복.</p>
          </div>
        </li>
      </ul>
      <button type="button" class="btn primary wide" data-action="play">지금 시작</button>
    </div>
  `
}

function renderMedals() {
  const unlocked = new Set(profile.medals)
  return `
    <div class="shell medals-shell">
      <button type="button" class="back" data-action="title" aria-label="뒤로">←</button>
      <h2 class="section-title">메달</h2>
      <p class="section-lead">${unlocked.size}/${MEDALS.length} 수집 · 깨면 깨고 싶은 목록</p>
      <ul class="medal-list">
        ${MEDALS.map((m) => {
          const on = unlocked.has(m.id)
          return `<li class="${on ? 'on' : 'off'}">
            <strong>${on ? m.title : '???'}</strong>
            <span>${on ? m.desc : '아직 잠김'}</span>
          </li>`
        }).join('')}
      </ul>
    </div>
  `
}

function renderPlay() {
  if (!round) return ''

  const feverClass = stats.fever ? 'is-fever' : ''
  const hud = `
    <div class="hud">
      <div class="hud-score">
        <span class="label">SCORE</span>
        <span class="value">${stats.score}</span>
      </div>
      <div class="hud-mid">
        <div class="lives">${hearts(stats.lives, stats.maxLives)}</div>
        <div class="combo ${stats.combo > 1 ? 'hot' : ''} ${stats.fever ? 'fever' : ''}">
          ${stats.fever ? `FEVER ×${stats.multiplier.toFixed(1)}` : stats.combo > 1 ? `${stats.combo} COMBO ×${stats.multiplier.toFixed(1)}` : `STAGE ${stats.stage}`}
        </div>
      </div>
      <div class="hud-delta ${feedback === 'hit' ? 'plus' : ''}">
        ${stats.lastDelta > 0 && feedback === 'hit' ? `+${stats.lastDelta}` : ''}
        ${stats.lastGrade && feedback === 'hit' ? `<em>${stats.lastGrade}</em>` : ''}
      </div>
    </div>
    <div class="stage-track">
      <span>S${stats.stage}</span>
      <div class="stage-bar"><i style="width:${((stats.round % STAGE_EVERY) / STAGE_EVERY) * 100}%"></i></div>
      <span>S${stats.stage + 1}</span>
    </div>
  `

  let stage = ''

  if (phase === 'stage') {
    stage = `
      <div class="stage stage-clear">
        <p class="feedback-mark stage-mark">CLEAR</p>
        <p class="feedback-detail">${stageBanner}</p>
      </div>
    `
  } else if (feedback && phase === 'feedback') {
    stage = `
      <div class="stage feedback-stage ${feedback} ${justEnteredFever ? 'fever-in' : ''}">
        <p class="feedback-mark">${justEnteredFever ? 'FEVER!' : feedback === 'hit' ? (stats.lastGrade === 'S' ? 'PERFECT' : '굿!') : '앗!'}</p>
        <p class="feedback-detail">${feedbackText}</p>
      </div>
    `
  } else if (round.kind === 'go') {
    const armed = phase === 'armed'
    stage = `
      <div class="stage go-stage ${armed ? 'armed' : 'waiting'}" data-zone="go">
        <p class="go-hint">${armed ? '지금!' : '기다리세요…'}</p>
        <button type="button" class="go-pad" data-action="go-tap" aria-label="탭">
          <span class="go-word">${armed ? '탭!' : 'WAIT'}</span>
        </button>
      </div>
    `
  } else if (round.kind === 'swipe') {
    stage = `
      <div class="stage swipe-stage" data-zone="swipe">
        <p class="swipe-hint">${SWIPE_LABEL[round.dir]} 스와이프</p>
        <div class="swipe-arrow" aria-hidden="true">${SWIPE_ARROW[round.dir]}</div>
        <div class="swipe-pad">
          <span class="swipe-guide">밀어서 반응</span>
        </div>
        <div class="timer-bar"><i style="animation-duration:${round.limitMs}ms"></i></div>
      </div>
    `
  } else {
    const target = colorById(round.target)
    stage = `
      <div class="stage pick-stage">
        <p class="pick-hint"><span class="swatch" style="background:${target.hex}"></span> ${target.label}만 탭</p>
        <div class="pick-grid" style="--cols:${Math.ceil(Math.sqrt(round.tiles.length))}">
          ${round.tiles
            .map((id, i) => {
              const c = colorById(id)
              const hit = pickHit.has(i)
              return `<button type="button" class="tile ${hit ? 'hit' : ''}" data-tile="${i}" style="--c:${c.hex}" aria-label="${c.label}"></button>`
            })
            .join('')}
        </div>
        <div class="timer-bar"><i style="animation-duration:${round.limitMs}ms"></i></div>
      </div>
    `
  }

  return `
    <div class="shell play-shell ${flashClass} ${feverClass}">
      ${hud}
      ${stage}
    </div>
  `
}

function renderResult() {
  const s = settle!
  const isNew = s.newBest
  const almost = s.profile.almostBeat
  const gap = s.gapToBest
  const rp = rankProgress(profile.xp)
  const target = dailyTarget(profile.xp)
  const tease = almost
    ? `아깝다… 베스트까지 ${gap}점. 지금 바로 복수.`
    : isNew
      ? '신기록! 이 점수, 내일의 라이벌입니다.'
      : rivalLine(profile.bestScore, stats.score)

  return `
    <div class="shell result-shell ${almost ? 'almost' : ''} ${isNew ? 'newbest' : ''}">
      <p class="eyebrow">${isNew ? 'NEW BEST' : almost ? 'SO CLOSE' : s.leveledUp ? 'RANK UP' : 'GAME OVER'}</p>
      <h2 class="brand result-brand">잽</h2>
      <p class="result-score">${stats.score}</p>
      <p class="tease">${tease}</p>
      <div class="result-meta">
        <div><span>스테이지</span><strong>${stats.stage}</strong></div>
        <div><span>최고 콤보</span><strong>${stats.bestCombo}</strong></div>
        <div><span>PERFECT</span><strong>${stats.perfects}</strong></div>
      </div>
      <div class="xp-block">
        <div class="xp-head">
          <span style="color:${rp.cur.color}">${rp.cur.label}</span>
          <strong>+${s.xpGained} XP</strong>
        </div>
        <div class="rank-bar tall"><i style="width:${Math.round(rp.pct * 100)}%;background:${rp.cur.color}"></i></div>
        <p class="xp-note">${s.leveledUp && s.newRank ? `${s.newRank.label} 승급!` : rp.next ? `다음 랭크까지 ${rp.need} XP` : '최고 랭크'}</p>
      </div>
      ${
        s.newMedals.length
          ? `<div class="new-medals">${s.newMedals.map((m) => `<span>${m.title}</span>`).join('')}</div>`
          : ''
      }
      <div class="daily mini">
        <div class="daily-head">
          <span>오늘 도전 ${target}</span>
          <strong>${profile.dailyBest}${profile.dailyCleared ? ' ✓' : ''}</strong>
        </div>
        <div class="daily-bar"><i style="width:${Math.min(100, Math.round((profile.dailyBest / target) * 100))}%"></i></div>
      </div>
      <div class="cta-row">
        <button type="button" class="btn primary" data-action="play">${almost ? '복수하기' : '한 판 더'}</button>
        <button type="button" class="btn ghost" data-action="title">홈</button>
      </div>
    </div>
  `
}

function render() {
  let body = ''
  if (screen === 'title') body = renderTitle()
  else if (screen === 'how') body = renderHow()
  else if (screen === 'medals') body = renderMedals()
  else if (screen === 'play') body = renderPlay()
  else body = renderResult()

  app.innerHTML = `
    <div class="atmosphere" aria-hidden="true">
      <div class="wash"></div>
      <div class="grain"></div>
    </div>
    ${body}
  `

  bind()
}

function bind() {
  app.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
    el.addEventListener('click', () => {
      const action = el.dataset.action
      if (action === 'play') startRun()
      else if (action === 'how') setScreen('how')
      else if (action === 'medals') setScreen('medals')
      else if (action === 'title') {
        clearTimers()
        setScreen('title')
      } else if (action === 'go-tap') onGoTap()
    })
  })

  const swipeZone = app.querySelector<HTMLElement>('[data-zone="swipe"]')
  if (swipeZone) attachSwipe(swipeZone)

  app.querySelectorAll<HTMLElement>('[data-tile]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      const idx = Number(el.dataset.tile)
      if (Number.isFinite(idx)) onPickTile(idx)
    })
  })
}

window.addEventListener('keydown', (e) => {
  if (screen !== 'play' || !round || phase === 'feedback' || phase === 'stage') return
  if (round.kind === 'go' && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault()
    onGoTap()
  }
  if (round.kind === 'swipe') {
    const map: Record<string, SwipeDir> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      KeyW: 'up',
      KeyS: 'down',
      KeyA: 'left',
      KeyD: 'right',
    }
    const dir = map[e.code]
    if (dir) {
      e.preventDefault()
      onSwipe(dir)
    }
  }
})

render()
