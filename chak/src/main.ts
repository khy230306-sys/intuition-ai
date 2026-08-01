import './style.css'
import {
  sfxClear,
  sfxDeny,
  sfxLose,
  sfxPlace,
  sfxWin,
  unlockAudio,
  vibrate,
} from './audio'
import {
  SIZE,
  STAGES,
  anyFit,
  canPlace,
  clearLines,
  createEndless,
  createGame,
  handEmpty,
  hardForScore,
  idx,
  place,
  refillHand,
  scoreClear,
  type GameState,
} from './game'
import {
  MEDALS,
  dailyTarget,
  loadProfile,
  rankProgress,
  settleRun,
  touchSession,
  type Profile,
  type Screen,
} from './meta'
import { shapeBounds, type Piece } from './pieces'

const app = document.querySelector<HTMLDivElement>('#app')!

let screen: Screen = 'home'
let profile: Profile = touchSession(loadProfile())
let game: GameState | null = null
let selectedHand = 0
let hover: { r: number; c: number } | null = null
let flash = new Set<number>()
let result: {
  won: boolean
  score: number
  stars: number
  xp: number
  medals: string[]
  mode: 'stage' | 'endless'
  title: string
} | null = null
let maxLinesAtOnce = 0
let dragging = false

function setScreen(next: Screen) {
  screen = next
  render()
}

function startStage(id: number) {
  unlockAudio()
  const stage = STAGES.find((s) => s.id === id) ?? STAGES[0]!
  profile = touchSession(loadProfile())
  game = createGame(stage, 'stage')
  selectedHand = 0
  hover = null
  flash = new Set()
  result = null
  maxLinesAtOnce = 0
  setScreen('play')
}

function startEndless() {
  unlockAudio()
  profile = touchSession(loadProfile())
  game = createEndless()
  selectedHand = 0
  hover = null
  flash = new Set()
  result = null
  maxLinesAtOnce = 0
  setScreen('play')
}

function currentPiece(): Piece | null {
  if (!game) return null
  return game.hand[selectedHand] ?? game.hand.find((p) => p != null) ?? null
}

function syncSelected() {
  if (!game) return
  if (game.hand[selectedHand] == null) {
    const i = game.hand.findIndex((p) => p != null)
    selectedHand = i >= 0 ? i : 0
  }
}

function finish(won: boolean) {
  if (!game || game.over) return
  game = { ...game, over: true, cleared: won }
  if (won) sfxWin()
  else sfxLose()
  vibrate(won ? [10, 30, 10] : [30, 40, 30])

  const settled = settleRun(profile, {
    mode: game.mode,
    stageId: game.stage.id,
    score: game.score,
    goal: game.stage.goal,
    won,
    bestCombo: game.bestCombo,
    maxLinesAtOnce,
  })
  profile = settled.profile
  result = {
    won,
    score: game.score,
    stars: settled.stars,
    xp: settled.xpGained,
    medals: settled.newMedals.map((m) => m.title),
    mode: game.mode,
    title: game.stage.title,
  }
  setScreen('result')
}

function tryPlaceAt(r: number, c: number) {
  if (!game || game.over) return
  const piece = game.hand[selectedHand]
  if (!piece) return
  if (!canPlace(game.board, piece, r, c)) {
    sfxDeny()
    vibrate(15)
    return
  }

  let board = place(game.board, piece, r, c)
  const cellsPlaced = piece.cells.length
  const cleared = clearLines(board)
  board = cleared.board
  const lines = cleared.rows.length + cleared.cols.length
  maxLinesAtOnce = Math.max(maxLinesAtOnce, lines)

  const combo = lines > 0 ? game.combo + 1 : 0
  const gained = scoreClear(lines, combo, cellsPlaced)
  const hand = [...game.hand]
  hand[selectedHand] = null

  let nextHand = hand
  let hard = game.stage.hard
  if (game.mode === 'endless') hard = hardForScore(game.score + gained)
  if (handEmpty(hand)) nextHand = refillHand(hard)

  // flash cleared cells briefly via previous positions
  flash = new Set()
  for (const rr of cleared.rows) for (let cc = 0; cc < SIZE; cc++) flash.add(idx(rr, cc))
  for (const cc of cleared.cols) for (let rr = 0; rr < SIZE; rr++) flash.add(idx(rr, cc))

  game = {
    ...game,
    board,
    hand: nextHand,
    score: game.score + gained,
    combo,
    bestCombo: Math.max(game.bestCombo, combo),
    clears: game.clears + lines,
    lastClear: lines,
    toast: lines > 0 ? `${lines}줄 클리어!${combo > 1 ? ` ×${combo}` : ''}` : null,
  }
  syncSelected()
  sfxPlace()
  if (lines > 0) {
    sfxClear(lines)
    vibrate([8, 20, 8])
  }

  render()
  window.setTimeout(() => {
    flash = new Set()
    if (game) game = { ...game, toast: null }
    render()
  }, 450)

  // win / lose checks after short delay for feedback
  window.setTimeout(() => {
    if (!game || game.over) return
    if (game.mode === 'stage' && game.score >= game.stage.goal) {
      finish(true)
      return
    }
    if (!anyFit(game.board, game.hand)) {
      finish(false)
    }
  }, 480)
}

function renderHome() {
  const rp = rankProgress(profile.xp)
  const target = dailyTarget()
  const dailyPct = Math.min(1, profile.dailyScore / target)
  return `
    <div class="shell home">
      <div class="hero-art" aria-hidden="true">
        <div class="tile t1"></div>
        <div class="tile t2"></div>
        <div class="tile t3"></div>
        <div class="tile t4"></div>
        <div class="tile t5"></div>
      </div>
      <div class="rank-chip" style="--rank:${rp.cur.color}">
        <span>${rp.cur.label}</span>
        <span class="bar"><i style="width:${Math.round(rp.pct * 100)}%"></i></span>
        <span>${rp.next ? `다음 ${rp.next.label} ${rp.need}` : 'MAX'}</span>
      </div>
      <header class="hero">
        <p class="eyebrow">BLOCK PUZZLE</p>
        <h1 class="brand">착</h1>
        <p class="tagline">블록을 맞춰 넣고, 줄이 찰 때 지워라.</p>
        <div class="cta-row">
          <button type="button" class="btn primary" data-go="stages">스테이지</button>
          <button type="button" class="btn ghost" data-act="endless">엔드리스</button>
        </div>
        <div class="stats">
          <div><span>해금</span><strong>${Math.min(profile.maxStage, 40)}/40</strong></div>
          <div><span>엔드리스</span><strong>${profile.bestEndless}</strong></div>
          <div><span>최고 콤보</span><strong>${profile.bestCombo}</strong></div>
        </div>
        <div class="daily">
          <div class="daily-head"><span>오늘의 점수</span><strong>${profile.dailyScore}/${target}</strong></div>
          <div class="daily-bar"><i style="width:${Math.round(dailyPct * 100)}%"></i></div>
          <p>${profile.dailyCleared ? '데일리 클리어!' : '한 판 더 가면 메달이 기다려요.'}</p>
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
      <p class="section-lead">목표 점수를 채우면 클리어. 별은 여유 점수에 따라.</p>
      <div class="stage-grid">
        ${STAGES.map((s) => {
          const locked = s.id > profile.maxStage
          const stars = profile.stageStars[String(s.id)] ?? 0
          return `<button type="button" class="stage-card ${locked ? 'locked' : ''}" data-stage="${s.id}" ${locked ? 'disabled' : ''}>
            <strong>${s.id}</strong>
            <span class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
          </button>`
        }).join('')}
      </div>
    </div>
  `
}

function piecePreview(piece: Piece, selected: boolean, handIndex: number): string {
  const { w, h } = shapeBounds(piece.cells)
  const cells = Array.from({ length: h * w }, () => '')
  for (const [r, c] of piece.cells) cells[r * w + c] = piece.color
  return `
    <button type="button" class="hand-piece ${selected ? 'selected' : ''}" data-hand="${handIndex}" aria-label="블록">
      <div class="mini" style="--w:${w};--h:${h}">
        ${cells
          .map((color) =>
            color
              ? `<i style="background:${color}"></i>`
              : `<i class="empty"></i>`,
          )
          .join('')}
      </div>
    </button>
  `
}

function renderPlay() {
  if (!game) return ''
  const goal =
    game.mode === 'stage'
      ? Math.min(100, Math.round((game.score / game.stage.goal) * 100))
      : 0
  const piece = currentPiece()

  const cells = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = idx(r, c)
      const color = game.board[i]
      let ghost = false
      let invalid = false
      if (piece && hover) {
        for (const [dr, dc] of piece.cells) {
          if (hover.r + dr === r && hover.c + dc === c) {
            ghost = true
            if (!canPlace(game.board, piece, hover.r, hover.c)) invalid = true
          }
        }
      }
      cells.push(`
        <div class="cell ${color ? 'filled' : ''} ${flash.has(i) ? 'flash' : ''} ${ghost ? (invalid ? 'ghost bad' : 'ghost') : ''}"
          data-r="${r}" data-c="${c}"
          style="${color ? `--c:${color}` : ghost && piece ? `--c:${piece.color}` : ''}"></div>
      `)
    }
  }

  return `
    <div class="shell play">
      <header class="play-hud">
        <button type="button" class="back tiny" data-go="${game.mode === 'stage' ? 'stages' : 'home'}">←</button>
        <div class="score-block">
          <span class="label">${game.mode === 'stage' ? game.stage.title : 'ENDLESS'}</span>
          <strong>${game.score}</strong>
          ${
            game.mode === 'stage'
              ? `<em>목표 ${game.stage.goal}</em>`
              : `<em>베스트 ${profile.bestEndless}</em>`
          }
        </div>
        <div class="combo-block ${game.combo > 1 ? 'hot' : ''}">
          <span class="label">COMBO</span>
          <strong>${game.combo}</strong>
        </div>
      </header>
      ${
        game.mode === 'stage'
          ? `<div class="goal-bar"><i style="width:${goal}%"></i></div>`
          : ''
      }
      <div class="board" id="board">${cells.join('')}</div>
      <div class="hand">
        ${game.hand
          .map((p, i) =>
            p
              ? piecePreview(p, selectedHand === i, i)
              : `<div class="hand-piece empty-slot"></div>`,
          )
          .join('')}
      </div>
      <p class="hint">블록을 고른 뒤 보드에 놓으세요</p>
      ${game.toast ? `<div class="toast">${game.toast}</div>` : ''}
    </div>
  `
}

function renderResult() {
  if (!result) return ''
  const rp = rankProgress(profile.xp)
  return `
    <div class="shell result ${result.won ? 'won' : 'lost'}">
      <p class="eyebrow">${result.won ? 'STAGE CLEAR' : result.mode === 'endless' ? 'GAME OVER' : 'FAILED'}</p>
      <h2 class="brand result-brand">착</h2>
      <p class="result-score">${result.score}</p>
      <p class="result-sub">${result.title}${result.won ? ` · ${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}` : ''}</p>
      <div class="xp-block">
        <div class="xp-head"><span style="color:${rp.cur.color}">${rp.cur.label}</span><strong>+${result.xp} XP</strong></div>
        <div class="bar tall"><i style="width:${Math.round(rp.pct * 100)}%;background:${rp.cur.color}"></i></div>
      </div>
      ${
        result.medals.length
          ? `<div class="new-medals">${result.medals.map((m) => `<span>${m}</span>`).join('')}</div>`
          : ''
      }
      <div class="cta-row">
        <button type="button" class="btn primary" data-act="${result.mode === 'endless' ? 'endless' : result.won && game && game.stage.id < 40 ? 'next' : 'retry'}">
          ${result.mode === 'endless' ? '다시' : result.won && game && game.stage.id < 40 ? '다음' : '재도전'}
        </button>
        <button type="button" class="btn ghost" data-go="home">홈</button>
      </div>
    </div>
  `
}

function paintGhost() {
  if (screen !== 'play' || !game) return
  const piece = currentPiece()
  const boardEl = app.querySelector('#board')
  if (!boardEl) return
  boardEl.querySelectorAll('.cell').forEach((node) => {
    const el = node as HTMLElement
    el.classList.remove('ghost', 'bad')
    if (!el.classList.contains('filled')) el.style.removeProperty('--c')
  })
  if (!piece || !hover) return
  const ok = canPlace(game.board, piece, hover.r, hover.c)
  for (const [dr, dc] of piece.cells) {
    const r = hover.r + dr
    const c = hover.c + dc
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) continue
    const el = boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`) as HTMLElement | null
    if (!el) continue
    el.classList.add('ghost')
    if (!ok) el.classList.add('bad')
    if (!el.classList.contains('filled')) el.style.setProperty('--c', piece.color)
  }
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
      if (act === 'endless') startEndless()
      else if (act === 'retry' && game) {
        if (game.mode === 'endless') startEndless()
        else startStage(game.stage.id)
      } else if (act === 'next' && game) startStage(game.stage.id + 1)
    })
  })

  app.querySelectorAll<HTMLElement>('[data-stage]').forEach((el) => {
    el.addEventListener('click', () => startStage(Number(el.dataset.stage)))
  })

  app.querySelectorAll<HTMLElement>('[data-hand]').forEach((el) => {
    el.addEventListener('click', () => {
      selectedHand = Number(el.dataset.hand)
      render()
    })
  })

  const board = app.querySelector('#board')
  if (!board || !game) return

  const cellFromPoint = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const cell = el?.closest?.('[data-r]') as HTMLElement | null
    if (!cell) return null
    return { r: Number(cell.dataset.r), c: Number(cell.dataset.c) }
  }

  board.addEventListener('mousemove', (e) => {
    const m = e as MouseEvent
    const pos = cellFromPoint(m.clientX, m.clientY)
    if (!pos) return
    if (!hover || hover.r !== pos.r || hover.c !== pos.c) {
      hover = pos
      paintGhost()
    }
  })

  board.addEventListener('mouseleave', () => {
    if (hover) {
      hover = null
      paintGhost()
    }
  })

  board.addEventListener('click', (e) => {
    const m = e as MouseEvent
    const pos = cellFromPoint(m.clientX, m.clientY)
    if (pos) tryPlaceAt(pos.r, pos.c)
  })

  board.addEventListener(
    'touchstart',
    (e) => {
      dragging = true
      const t = (e as TouchEvent).changedTouches[0]
      if (!t) return
      const pos = cellFromPoint(t.clientX, t.clientY)
      if (pos) {
        hover = pos
        paintGhost()
      }
    },
    { passive: true },
  )

  board.addEventListener(
    'touchmove',
    (e) => {
      if (!dragging) return
      const t = (e as TouchEvent).changedTouches[0]
      if (!t) return
      const pos = cellFromPoint(t.clientX, t.clientY)
      if (pos && (!hover || hover.r !== pos.r || hover.c !== pos.c)) {
        hover = pos
        paintGhost()
      }
    },
    { passive: true },
  )

  board.addEventListener(
    'touchend',
    (e) => {
      dragging = false
      const t = (e as TouchEvent).changedTouches[0]
      if (!t) return
      const pos = cellFromPoint(t.clientX, t.clientY) ?? hover
      hover = null
      if (pos) tryPlaceAt(pos.r, pos.c)
      else paintGhost()
    },
    { passive: true },
  )
}

render()
