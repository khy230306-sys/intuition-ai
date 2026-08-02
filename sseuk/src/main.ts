import './style.css'
import { sfxDeny, sfxSlide, sfxUndo, sfxWin, unlockAudio, vibrate } from './audio'
import {
  STAGES,
  THEMES,
  createGame,
  formatTime,
  slide,
  starsFor,
  tileColor,
  undo,
  type GameState,
} from './game'
import {
  MEDALS,
  dailyTarget,
  loadProfile,
  rankProgress,
  settleClear,
  touchSession,
  type Profile,
  type Screen,
} from './meta'

const app = document.querySelector<HTMLDivElement>('#app')!

let screen: Screen = 'home'
let profile: Profile = touchSession(loadProfile())
let game: GameState | null = null
let usedUndo = false
let timerId: number | null = null
let result: {
  stars: number
  moves: number
  timeMs: number
  xp: number
  medals: string[]
  title: string
  stageId: number
} | null = null

function stopTimer() {
  if (timerId != null) {
    window.clearInterval(timerId)
    timerId = null
  }
}

function startTimer() {
  stopTimer()
  timerId = window.setInterval(() => {
    if (!game || game.solved) return
    game = { ...game, elapsedMs: Date.now() - game.startedAt }
    const el = app.querySelector('[data-time]')
    if (el) el.textContent = formatTime(game.elapsedMs)
  }, 250)
}

function setScreen(next: Screen) {
  screen = next
  if (next !== 'play') stopTimer()
  render()
}

function startStage(id: number) {
  unlockAudio()
  profile = touchSession(loadProfile())
  const stage = STAGES.find((s) => s.id === id) ?? STAGES[0]!
  game = createGame(stage)
  usedUndo = false
  result = null
  setScreen('play')
  startTimer()
}

function onTile(index: number) {
  if (!game || game.solved) return
  const next = slide(game, index)
  if (!next) {
    sfxDeny()
    vibrate(12)
    return
  }
  game = next
  sfxSlide()
  vibrate(6)
  render()
  if (game.solved) {
    stopTimer()
    sfxWin()
    vibrate([10, 30, 10])
    const stars = starsFor(game.moves, game.stage.par)
    const settled = settleClear(profile, {
      stageId: game.stage.id,
      size: game.size,
      moves: game.moves,
      par: game.stage.par,
      stars,
      timeMs: game.elapsedMs,
      usedUndo,
    })
    profile = settled.profile
    result = {
      stars,
      moves: game.moves,
      timeMs: game.elapsedMs,
      xp: settled.xpGained,
      medals: settled.newMedals.map((m) => m.title),
      title: game.stage.title,
      stageId: game.stage.id,
    }
    window.setTimeout(() => setScreen('result'), 550)
  }
}

function onUndo() {
  if (!game) return
  const next = undo(game)
  if (!next) {
    sfxDeny()
    return
  }
  usedUndo = true
  game = next
  sfxUndo()
  render()
}

function renderHome() {
  const rp = rankProgress(profile.xp)
  const target = dailyTarget()
  const dailyPct = Math.min(1, profile.dailyClears / target)
  const starsSum = Object.values(profile.stageStars).reduce((a, b) => a + b, 0)
  return `
    <div class="shell home">
      <div class="hero-art" aria-hidden="true">
        <div class="mini-board">
          <i class="a"></i><i class="b"></i><i class="c"></i>
          <i class="d"></i><i class="gap"></i><i class="e"></i>
          <i class="f"></i><i class="g"></i><i class="h"></i>
        </div>
      </div>
      <div class="rank-chip" style="--rank:${rp.cur.color}">
        <span>${rp.cur.label}</span>
        <span class="bar"><i style="width:${Math.round(rp.pct * 100)}%"></i></span>
        <span>${rp.next ? `다음 ${rp.next.label} ${rp.need}` : 'MAX'}</span>
      </div>
      <header class="hero">
        <p class="eyebrow">SLIDING PUZZLE</p>
        <h1 class="brand">스윽</h1>
        <p class="tagline">빈칸으로 타일을 밀어, 그림을 맞춰보세요.</p>
        <div class="cta-row">
          <button type="button" class="btn primary" data-go="stages">스테이지</button>
          <button type="button" class="btn ghost" data-act="continue">이어하기</button>
        </div>
        <div class="stats">
          <div><span>해금</span><strong>${Math.min(profile.maxStage, 40)}/40</strong></div>
          <div><span>별</span><strong>${starsSum}</strong></div>
          <div><span>클리어</span><strong>${profile.totalClears}</strong></div>
        </div>
        <div class="daily">
          <div class="daily-head"><span>오늘의 클리어</span><strong>${profile.dailyClears}/${target}</strong></div>
          <div class="daily-bar"><i style="width:${Math.round(dailyPct * 100)}%"></i></div>
          <p>${profile.dailyCleared ? '데일리 완료!' : '파 이내로 밀면 별 3개.'}</p>
        </div>
        <p class="meta-line">메달 ${profile.medals.length}/${MEDALS.length} · 연속 ${profile.dayStreak}일</p>
      </header>
    </div>
  `
}

function renderStages() {
  return `
    <div class="shell stages">
      <button type="button" class="back" data-go="home">←</button>
      <h2 class="section-title">스테이지</h2>
      <p class="section-lead">3×3 → 4×4 → 5×5. 적을수록 별이 많아요.</p>
      <div class="stage-grid">
        ${STAGES.map((s) => {
          const locked = s.id > profile.maxStage
          const stars = profile.stageStars[String(s.id)] ?? 0
          return `<button type="button" class="stage-card ${locked ? 'locked' : ''}" data-stage="${s.id}" ${locked ? 'disabled' : ''}>
            <em>${s.size}×${s.size}</em>
            <strong>${s.id}</strong>
            <span class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
          </button>`
        }).join('')}
      </div>
    </div>
  `
}

function renderPlay() {
  if (!game) return ''
  const theme = THEMES[game.stage.theme]
  const size = game.size
  return `
    <div class="shell play">
      <header class="play-hud">
        <button type="button" class="back tiny" data-go="stages">←</button>
        <div class="mid">
          <span class="label">${game.stage.title} · ${theme.label}</span>
          <strong>${game.size}×${game.size}</strong>
        </div>
        <div class="right">
          <span data-time>${formatTime(game.elapsedMs)}</span>
          <em>${game.moves}수 / 파 ${game.stage.par}</em>
        </div>
      </header>
      <div class="board ${game.solved ? 'solved' : ''}" style="--n:${size}">
        ${game.board
          .map((tile, i) => {
            if (tile === 0) {
              return `<button type="button" class="tile empty" data-i="${i}" aria-label="빈칸"></button>`
            }
            const color = tileColor(tile, size, theme)
            const correct = tile === i + 1
            return `<button type="button" class="tile ${correct ? 'correct' : ''}" data-i="${i}" style="--c:${color}" aria-label="${tile}">
              <span class="num">${tile}</span>
            </button>`
          })
          .join('')}
      </div>
      <div class="actions">
        <button type="button" class="btn ghost" data-act="undo" ${game.history.length === 0 ? 'disabled' : ''}>되돌리기</button>
        <button type="button" class="btn ghost" data-act="restart">다시 섞기</button>
        <button type="button" class="btn primary" data-act="hint">목표 보기</button>
      </div>
      <p class="hint">빈칸 옆 타일을 탭하면 스윽—</p>
    </div>
  `
}

function renderHint() {
  if (!game) return
  const theme = THEMES[game.stage.theme]
  const size = game.size
  const overlay = document.createElement('div')
  overlay.className = 'hint-overlay'
  overlay.innerHTML = `
    <div class="hint-card">
      <p>완성 모습</p>
      <div class="board preview" style="--n:${size}">
        ${Array.from({ length: size * size }, (_, i) => {
          const tile = i === size * size - 1 ? 0 : i + 1
          if (tile === 0) return `<div class="tile empty"></div>`
          return `<div class="tile" style="--c:${tileColor(tile, size, theme)}"><span class="num">${tile}</span></div>`
        }).join('')}
      </div>
      <button type="button" class="btn primary wide" id="hint-close">닫기</button>
    </div>
  `
  app.appendChild(overlay)
  overlay.querySelector('#hint-close')?.addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })
}

function renderResult() {
  if (!result) return ''
  const rp = rankProgress(profile.xp)
  return `
    <div class="shell result">
      <p class="eyebrow">CLEARED</p>
      <h2 class="brand result-brand">스윽</h2>
      <p class="stars-big">${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}</p>
      <p class="result-sub">${result.title}</p>
      <div class="result-meta">
        <div><span>수</span><strong>${result.moves}</strong></div>
        <div><span>시간</span><strong>${formatTime(result.timeMs)}</strong></div>
        <div><span>XP</span><strong>+${result.xp}</strong></div>
      </div>
      <div class="xp-block">
        <div class="xp-head"><span style="color:${rp.cur.color}">${rp.cur.label}</span><strong>${rp.next ? `다음까지 ${rp.need}` : 'MAX'}</strong></div>
        <div class="bar tall"><i style="width:${Math.round(rp.pct * 100)}%;background:${rp.cur.color}"></i></div>
      </div>
      ${
        result.medals.length
          ? `<div class="new-medals">${result.medals.map((m) => `<span>${m}</span>`).join('')}</div>`
          : ''
      }
      <div class="cta-row">
        <button type="button" class="btn primary" data-act="${result.stageId < 40 ? 'next' : 'retry'}">${result.stageId < 40 ? '다음' : '재도전'}</button>
        <button type="button" class="btn ghost" data-go="stages">목록</button>
      </div>
    </div>
  `
}

function render() {
  let body = ''
  if (screen === 'home') body = renderHome()
  else if (screen === 'stages') body = renderStages()
  else if (screen === 'play') body = renderPlay()
  else body = renderResult()

  app.innerHTML = `
    <div class="atmosphere" aria-hidden="true"><div class="wash"></div></div>
    ${body}
  `
  bind()
}

function bind() {
  app.querySelectorAll<HTMLElement>('[data-go]').forEach((el) => {
    el.addEventListener('click', () => setScreen(el.dataset.go as Screen))
  })

  app.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const act = el.dataset.act
      if (act === 'continue') startStage(Math.min(profile.maxStage, 40))
      else if (act === 'undo') onUndo()
      else if (act === 'restart' && game) startStage(game.stage.id)
      else if (act === 'hint') renderHint()
      else if (act === 'next' && result) startStage(result.stageId + 1)
      else if (act === 'retry' && result) startStage(result.stageId)
    })
  })

  app.querySelectorAll<HTMLElement>('[data-stage]').forEach((el) => {
    el.addEventListener('click', () => startStage(Number(el.dataset.stage)))
  })

  app.querySelectorAll<HTMLElement>('.tile[data-i]').forEach((el) => {
    el.addEventListener('click', () => onTile(Number(el.dataset.i)))
  })

  // swipe on board
  const board = app.querySelector('.board:not(.preview)')
  if (!board || !game) return
  let start: { x: number; y: number } | null = null
  board.addEventListener(
    'touchstart',
    (e) => {
      const t = (e as TouchEvent).changedTouches[0]
      if (t) start = { x: t.clientX, y: t.clientY }
    },
    { passive: true },
  )
  board.addEventListener(
    'touchend',
    (e) => {
      if (!start || !game) return
      const t = (e as TouchEvent).changedTouches[0]
      if (!t) return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      start = null
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return
      const empty = game.empty
      const size = game.size
      let target = -1
      if (Math.abs(dx) > Math.abs(dy)) {
        // swipe right → tile left of empty moves right into empty
        if (dx > 0 && empty % size > 0) target = empty - 1
        if (dx < 0 && empty % size < size - 1) target = empty + 1
      } else {
        if (dy > 0 && empty >= size) target = empty - size
        if (dy < 0 && empty < size * (size - 1)) target = empty + size
      }
      if (target >= 0) onTile(target)
    },
    { passive: true },
  )
}

render()
