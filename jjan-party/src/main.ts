import './style.css'
import {
  BALANCE,
  CHOSUNG,
  FORBIDDEN_WORDS,
  MISSIONS,
  PENALTIES,
  RPS,
  TRUTHS,
  pick,
  rpsWinner,
  shuffle,
  type RpsChoice,
} from './data'
import {
  GAME_META,
  createInitialState,
  savePlayers,
  uid,
  type AppState,
  type GameId,
  type Player,
  type Screen,
} from './state'

const app = document.querySelector<HTMLDivElement>('#app')!
let state = createInitialState()

// Transient game UI state (not persisted)
let balanceVotes: Record<string, 'a' | 'b'> = {}
let bombTimer: number | null = null
let bombSeconds = 0
let bombHolderId: string | null = null
let chosungRevealed = false
let nunchiNext = 1
let nunchiClaimed: Record<number, string> = {}
let rouletteSpinning = false
let rouletteResult: { player: Player; penalty: (typeof PENALTIES)[number] } | null =
  null
let rpsPick: { a?: RpsChoice; b?: RpsChoice } = {}
let rpsPair: [Player, Player] | null = null
let activeTargetId: string | null = null
let activeBalance = pick(BALANCE)
let activeMission = pick(MISSIONS)
let activeChosung = pick(CHOSUNG)
let activeTruth = pick(TRUTHS)

function retarget() {
  activeTargetId = pick(state.players).id
}

function targetPlayer(): Player {
  const found = state.players.find((p) => p.id === activeTargetId)
  return found ?? pick(state.players)
}

function setState(partial: Partial<AppState>) {
  state = { ...state, ...partial }
  if (partial.players) savePlayers(partial.players)
  render()
}

function go(screen: Screen) {
  // cleanup timers when leaving bomb
  if (state.screen === 'bomb' && screen !== 'bomb') stopBomb()
  setState({ screen })
}

function finishGame(result?: string) {
  if (result) state = { ...state, lastResult: result }
  if (state.chaosQueue.length > 0) {
    go('chaos')
    window.setTimeout(() => launchChaosNext(), 700)
    return
  }
  go('hub')
}

function randomPlayers(n = 1): Player[] {
  return shuffle(state.players).slice(0, n)
}

function addDrink(playerId: string, sips: number) {
  if (sips <= 0) return
  setState({
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, drinks: p.drinks + sips } : p,
    ),
  })
}

function addDrinkMany(ids: string[], sips: number) {
  if (sips <= 0 || ids.length === 0) return
  const set = new Set(ids)
  setState({
    players: state.players.map((p) =>
      set.has(p.id) ? { ...p, drinks: p.drinks + sips } : p,
    ),
  })
}

function ensurePlayers(): boolean {
  if (state.players.length < 2) {
    alert('플레이어를 2명 이상 등록해 주세요!')
    go('setup')
    return false
  }
  return true
}

function startChaos() {
  if (!ensurePlayers()) return
  const queue = shuffle(Object.keys(GAME_META) as GameId[]).slice(0, 6)
  state = { ...state, chaosQueue: queue, round: 0, screen: 'chaos' }
  render()
  // auto-launch first after short beat
  window.setTimeout(() => launchChaosNext(), 600)
}

function launchChaosNext() {
  if (state.chaosQueue.length === 0) {
    setState({ screen: 'hub', lastResult: '혼돈 라운드 종료! 다들 수고했어 🥂' })
    return
  }
  const [next, ...rest] = state.chaosQueue
  state = {
    ...state,
    chaosQueue: rest,
    round: state.round + 1,
  }
  openGame(next!)
}

function openGame(id: GameId) {
  if (!ensurePlayers()) return
  // reset per-game transients
  balanceVotes = {}
  chosungRevealed = false
  nunchiNext = 1
  nunchiClaimed = {}
  rouletteSpinning = false
  rouletteResult = null
  rpsPick = {}
  rpsPair = null
  activeBalance = pick(BALANCE)
  activeMission = pick(MISSIONS)
  activeChosung = pick(CHOSUNG)
  activeTruth = pick(TRUTHS)
  retarget()
  stopBomb()

  if (id === 'forbidden') assignForbidden()
  if (id === 'rps') {
    const pair = randomPlayers(2)
    if (pair.length < 2) return
    rpsPair = [pair[0]!, pair[1]!]
  }
  if (id === 'bomb') startBomb()

  setState({ screen: id })
}

function assignForbidden() {
  const words = shuffle(FORBIDDEN_WORDS)
  setState({
    players: state.players.map((p, i) => ({
      ...p,
      forbidden: words[i % words.length],
    })),
  })
}

function startBomb() {
  stopBomb()
  const holder = pick(state.players)
  bombHolderId = holder.id
  bombSeconds = 8 + Math.floor(Math.random() * 18) // 8–25s mystery
  const tick = () => {
    bombSeconds -= 1
    if (bombSeconds <= 0) {
      stopBomb()
      const victim = state.players.find((p) => p.id === bombHolderId)
      if (victim) {
        addDrink(victim.id, 1)
        setState({
          lastResult: `💣 폭탄 터짐! ${victim.name} 한 잔!`,
        })
      }
      render()
      return
    }
    // don't re-render every second for whole app — update badge only
    const el = document.querySelector('[data-bomb-sec]')
    if (el) el.textContent = '…'
    // keep suspense: hide exact seconds
  }
  bombTimer = window.setInterval(tick, 1000)
}

function stopBomb() {
  if (bombTimer != null) {
    clearInterval(bombTimer)
    bombTimer = null
  }
}

function passBomb() {
  if (bombSeconds <= 0) return
  const others = state.players.filter((p) => p.id !== bombHolderId)
  bombHolderId = pick(others.length ? others : state.players).id
  render()
}

/* -------------------- RENDER -------------------- */

function render() {
  app.innerHTML = shell()
  bindEvents()
}

function shell() {
  const showNav = state.screen !== 'landing'
  return `
    <div class="atmosphere" aria-hidden="true">
      <div class="blob blob-a"></div>
      <div class="blob blob-b"></div>
      <div class="grain"></div>
    </div>
    ${showNav ? nav() : ''}
    <main class="stage stage-${state.screen}">
      ${view()}
    </main>
  `
}

function nav() {
  return `
    <header class="topnav">
      <button class="brand-mini" data-action="home" type="button" aria-label="홈">짠!</button>
      <div class="topnav-right">
        <button class="ghost" data-action="setup" type="button">멤버 ${state.players.length}</button>
        <button class="ghost" data-action="hub" type="button">게임</button>
      </div>
    </header>
  `
}

function view(): string {
  switch (state.screen) {
    case 'landing':
      return landing()
    case 'setup':
      return setup()
    case 'hub':
      return hub()
    case 'chaos':
      return chaos()
    case 'roulette':
      return roulette()
    case 'balance':
      return balance()
    case 'bomb':
      return bomb()
    case 'mission':
      return mission()
    case 'chosung':
      return chosung()
    case 'nunchi':
      return nunchi()
    case 'truth':
      return truth()
    case 'rps':
      return rps()
    case 'forbidden':
      return forbidden()
    default:
      return landing()
  }
}

function landing() {
  return `
    <section class="hero">
      <p class="hero-kicker">술자리 올인원 벌칙팩</p>
      <h1 class="hero-brand">짠!</h1>
      <p class="hero-lead">룰렛 · 폭탄 · 밸런스 · 초성 · 금지어까지.<br/>여러 게임을 섞어 한 판에 끝내자.</p>
      <div class="hero-cta">
        <button class="btn primary pulse" data-action="setup" type="button">멤버 모으기</button>
        <button class="btn secondary" data-action="hub" type="button">바로 시작</button>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="glass glass-1"></div>
        <div class="glass glass-2"></div>
        <div class="glass glass-3"></div>
        <div class="splash"></div>
      </div>
    </section>
  `
}

function setup() {
  const list =
    state.players.length === 0
      ? `<p class="muted">아직 아무도 없어. 이름을 넣고 입장시켜!</p>`
      : `<ul class="player-list">${state.players
          .map(
            (p) => `
          <li>
            <span class="pname">${escapeHtml(p.name)}</span>
            <span class="pdrinks">${p.drinks}잔</span>
            <button class="icon-btn" data-remove="${p.id}" type="button" aria-label="삭제">×</button>
          </li>`,
          )
          .join('')}</ul>`

  return `
    <section class="panel setup">
      <h2 class="title">오늘 멤버</h2>
      <p class="sub">2명 이상이면 바로 게임 가능. 잔 수는 자동으로 쌓여.</p>
      <form class="add-form" data-form="add-player">
        <input name="name" maxlength="12" placeholder="이름 입력" autocomplete="off" required />
        <button class="btn primary" type="submit">추가</button>
      </form>
      ${list}
      <div class="row-actions">
        <button class="btn secondary" data-action="reset-drinks" type="button">잔 수 초기화</button>
        <button class="btn primary" data-action="hub" type="button">게임 고르기</button>
      </div>
    </section>
  `
}

function hub() {
  const games = (Object.keys(GAME_META) as GameId[])
    .map((id) => {
      const g = GAME_META[id]
      return `
        <button class="game-tile" data-game="${id}" type="button">
          <span class="tag">${g.tag}</span>
          <span class="gtitle">${g.title}</span>
          <span class="gblurb">${g.blurb}</span>
        </button>`
    })
    .join('')

  const toast = state.lastResult
    ? `<p class="toast" role="status">${escapeHtml(state.lastResult)}</p>`
    : ''

  return `
    <section class="panel hub">
      <h2 class="title">어떤 판 할까?</h2>
      <p class="sub">하나만 골라도 되고, 혼돈 모드로 전부 섞어도 된다.</p>
      ${toast}
      <button class="btn chaos-btn" data-action="chaos" type="button">
        <span>혼돈 모드</span>
        <small>랜덤으로 6게임 연쇄</small>
      </button>
      <div class="game-grid">${games}</div>
      <div class="leaderboard">
        <h3>오늘의 주량왕</h3>
        ${leaderboard()}
      </div>
    </section>
  `
}

function leaderboard() {
  if (!state.players.length) return `<p class="muted">멤버를 먼저 등록해줘</p>`
  const sorted = [...state.players].sort((a, b) => b.drinks - a.drinks)
  return `<ol>${sorted
    .map(
      (p, i) =>
        `<li><span>${i + 1}. ${escapeHtml(p.name)}</span><strong>${p.drinks}</strong></li>`,
    )
    .join('')}</ol>`
}

function chaos() {
  return `
    <section class="panel chaos-wait">
      <p class="kicker">혼돈 모드</p>
      <h2 class="title smash">다음 게임 준비 중…</h2>
      <p class="sub">남은 게임 ${state.chaosQueue.length + 1}개</p>
    </section>
  `
}

function backBar(extra = '') {
  const chaosLeft = state.chaosQueue.length
  const chaosBit =
    chaosLeft > 0 || state.round > 0
      ? `<button class="btn secondary" data-action="chaos-next" type="button">다음 혼돈 (${chaosLeft})</button>`
      : `<button class="btn secondary" data-action="hub" type="button">허브로</button>`
  return `<div class="backbar">${chaosBit}${extra}</div>`
}

function roulette() {
  const angle = rouletteSpinning ? 1440 + Math.random() * 720 : 0
  const result = rouletteResult
    ? `<div class="result-banner pop">
        <strong>${escapeHtml(rouletteResult.player.name)}</strong>
        <span>${escapeHtml(rouletteResult.penalty.text)}</span>
        ${
          rouletteResult.penalty.sips
            ? `<em>${rouletteResult.penalty.sips}모금</em>`
            : `<em>통과</em>`
        }
      </div>`
    : `<p class="sub">버튼을 누르면 벌칙 대상과 미션이 정해진다</p>`

  return `
    <section class="panel game">
      <p class="kicker">${GAME_META.roulette.tag}</p>
      <h2 class="title">${GAME_META.roulette.title}</h2>
      <div class="wheel-wrap">
        <div class="wheel ${rouletteSpinning ? 'spin' : ''}" style="--spin:${angle}deg"></div>
        <div class="wheel-pointer"></div>
      </div>
      ${result}
      <button class="btn primary wide" data-action="spin" type="button" ${rouletteSpinning ? 'disabled' : ''}>
        ${rouletteSpinning ? '도는 중…' : '돌리기'}
      </button>
      ${backBar()}
    </section>
  `
}

function balance() {
  const q = activeBalance
  const aCount = Object.values(balanceVotes).filter((v) => v === 'a').length
  const bCount = Object.values(balanceVotes).filter((v) => v === 'b').length
  const voted = Object.keys(balanceVotes).length
  const allVoted = voted >= state.players.length && state.players.length > 0

  let result = ''
  if (allVoted) {
    if (aCount === bCount) {
      result = `<div class="result-banner">동점! 전원 한 모금 🥂</div>`
    } else {
      const minority = aCount < bCount ? 'a' : 'b'
      const losers = state.players.filter((p) => balanceVotes[p.id] === minority)
      result = `<div class="result-banner">소수파 패배!<br/>${losers.map((p) => escapeHtml(p.name)).join(', ')} 마셔!</div>`
    }
  }

  const voterList = state.players
    .map((p) => {
      const v = balanceVotes[p.id]
      return `<button class="vote-chip ${v ? 'done' : ''}" data-voter="${p.id}" type="button" ${v ? 'disabled' : ''}>
        ${escapeHtml(p.name)}${v ? (v === 'a' ? ' · A' : ' · B') : ''}
      </button>`
    })
    .join('')

  return `
    <section class="panel game">
      <p class="kicker">${GAME_META.balance.tag}</p>
      <h2 class="title">${GAME_META.balance.title}</h2>
      <p class="sub">한 명씩 골라. 소수파가 마신다.</p>
      <div class="balance-pair">
        <button class="side a" data-pick="a" type="button"><span>A</span>${escapeHtml(q.a)}</button>
        <div class="vs">VS</div>
        <button class="side b" data-pick="b" type="button"><span>B</span>${escapeHtml(q.b)}</button>
      </div>
      <div class="vote-row">${voterList}</div>
      <p class="muted">선택 후 자기 이름을 눌러 투표 · ${voted}/${state.players.length}</p>
      ${result}
      <div class="row-actions">
        <button class="btn secondary" data-action="balance-reset" type="button">새 주제</button>
        ${
          allVoted
            ? `<button class="btn primary" data-action="balance-apply" type="button">벌칙 적용</button>`
            : ''
        }
      </div>
      ${backBar()}
    </section>
  `
}

function bomb() {
  const holder = state.players.find((p) => p.id === bombHolderId)
  const exploded = bombSeconds <= 0
  return `
    <section class="panel game bomb-screen">
      <p class="kicker">${GAME_META.bomb.tag}</p>
      <h2 class="title">${GAME_META.bomb.title}</h2>
      <div class="bomb ${exploded ? 'boom' : 'tick'}" data-bomb-sec>
        ${exploded ? '💥' : '💣'}
      </div>
      <p class="bomb-holder">
        ${
          exploded
            ? state.lastResult
              ? escapeHtml(state.lastResult)
              : '터졌다!'
            : `지금 폭탄: <strong>${holder ? escapeHtml(holder.name) : '?'}</strong>`
        }
      </p>
      <p class="sub">시간이 비밀이다. 재빨리 넘겨!</p>
      ${
        exploded
          ? `<button class="btn primary wide" data-action="bomb-restart" type="button">다시 돌리기</button>`
          : `<button class="btn primary wide" data-action="bomb-pass" type="button">넘기기!</button>`
      }
      ${backBar()}
    </section>
  `
}

function mission() {
  const m = activeMission
  const target = targetPlayer()

  return `
    <section class="panel game">
      <p class="kicker">${GAME_META.mission.tag}</p>
      <h2 class="title">${GAME_META.mission.title}</h2>
      <p class="target-pill">대상 · ${escapeHtml(target.name)}</p>
      <div class="mission-card">
        <h3>${escapeHtml(m.title)}</h3>
        <p>${escapeHtml(m.detail)}</p>
      </div>
      <div class="row-actions">
        <button class="btn secondary" data-success="${target.id}" data-sips="0" type="button">성공</button>
        <button class="btn primary" data-fail="${target.id}" data-sips="${m.sips}" type="button">실패 · ${m.sips}모금</button>
      </div>
      <button class="btn ghost-wide" data-action="mission-redraw" type="button">다른 미션</button>
      ${backBar()}
    </section>
  `
}

function chosung() {
  const q = activeChosung
  const target = targetPlayer()

  return `
    <section class="panel game">
      <p class="kicker">${GAME_META.chosung.tag}</p>
      <h2 class="title">${GAME_META.chosung.title}</h2>
      <p class="target-pill">도전자 · ${escapeHtml(target.name)}</p>
      <div class="chosung-board">
        <p class="hint">${escapeHtml(q.hint)}</p>
        <p class="letters">${escapeHtml(q.chosung)}</p>
        ${
          chosungRevealed
            ? `<p class="answer pop">정답: ${escapeHtml(q.answer)}</p>`
            : ''
        }
      </div>
      <div class="row-actions">
        <button class="btn secondary" data-action="cho-reveal" type="button">정답 공개</button>
        <button class="btn primary" data-fail="${target.id}" data-sips="1" type="button">틀림 · 마시기</button>
        <button class="btn secondary" data-success="${target.id}" data-sips="0" type="button">맞춤!</button>
      </div>
      <button class="btn ghost-wide" data-action="cho-redraw" type="button">다음 문제</button>
      ${backBar()}
    </section>
  `
}

function nunchi() {
  const buttons = state.players
    .map(
      (p) =>
        `<button class="btn secondary nunchi-btn" data-nunchi="${p.id}" type="button">${escapeHtml(p.name)}</button>`,
    )
    .join('')

  const log = Object.entries(nunchiClaimed)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([n, id]) => {
      const p = state.players.find((x) => x.id === id)
      return `<li><strong>${n}</strong> · ${p ? escapeHtml(p.name) : '?'}</li>`
    })
    .join('')

  return `
    <section class="panel game">
      <p class="kicker">${GAME_META.nunchi.tag}</p>
      <h2 class="title">${GAME_META.nunchi.title}</h2>
      <p class="sub">다음 숫자: <strong class="big-num">${nunchiNext}</strong> — 외칠 사람 버튼을 눌러!</p>
      <div class="nunchi-grid">${buttons}</div>
      <ul class="nunchi-log">${log || '<li class="muted">아직 아무도 안 외쳤다</li>'}</ul>
      ${state.lastResult ? `<div class="result-banner">${escapeHtml(state.lastResult)}</div>` : ''}
      <button class="btn ghost-wide" data-action="nunchi-reset" type="button">처음부터</button>
      ${backBar()}
    </section>
  `
}

function truth() {
  const q = activeTruth
  const target = targetPlayer()

  return `
    <section class="panel game">
      <p class="kicker">${GAME_META.truth.tag}</p>
      <h2 class="title">${GAME_META.truth.title}</h2>
      <p class="target-pill">답변자 · ${escapeHtml(target.name)}</p>
      <div class="truth-card">
        <p>${escapeHtml(q.text)}</p>
      </div>
      <div class="row-actions">
        <button class="btn secondary" data-success="${target.id}" data-sips="0" type="button">솔직히 답함</button>
        <button class="btn primary" data-fail="${target.id}" data-sips="${q.sips}" type="button">패스 · ${q.sips}모금</button>
      </div>
      <button class="btn ghost-wide" data-action="truth-redraw" type="button">다른 질문</button>
      ${backBar()}
    </section>
  `
}

function rps() {
  if (!rpsPair) return `<section class="panel"><p>플레이어가 부족해</p>${backBar()}</section>`
  const [a, b] = rpsPair
  const choices = RPS.map(
    (c) =>
      `<button class="rps-btn" data-rps="${c}" type="button">${c}</button>`,
  ).join('')

  let status = `<p class="sub">${escapeHtml(a.name)} 먼저 선택 (타인에게 가려!)</p>`
  if (rpsPick.a && !rpsPick.b) {
    status = `<p class="sub">${escapeHtml(b.name)} 차례! 화면을 돌려받아 골라</p>`
  }

  let result = ''
  if (rpsPick.a && rpsPick.b) {
    const w = rpsWinner(rpsPick.a, rpsPick.b)
    if (w === 'draw') {
      result = `<div class="result-banner">무승부! 다시!</div>`
    } else {
      const loser = w === 'a' ? b : a
      result = `<div class="result-banner pop">${escapeHtml(a.name)} ${rpsPick.a} vs ${escapeHtml(b.name)} ${rpsPick.b}<br/>패자 <strong>${escapeHtml(loser.name)}</strong> 마셔!</div>`
    }
  }

  return `
    <section class="panel game">
      <p class="kicker">${GAME_META.rps.tag}</p>
      <h2 class="title">${GAME_META.rps.title}</h2>
      <p class="versus-line">${escapeHtml(a.name)} <span>VS</span> ${escapeHtml(b.name)}</p>
      ${status}
      ${!rpsPick.a || !rpsPick.b ? `<div class="rps-row">${choices}</div>` : ''}
      ${result}
      <div class="row-actions">
        ${
          rpsPick.a && rpsPick.b && rpsWinner(rpsPick.a, rpsPick.b) !== 'draw'
            ? `<button class="btn primary" data-action="rps-apply" type="button">벌칙 적용</button>`
            : ''
        }
        <button class="btn secondary" data-action="rps-reset" type="button">다시 / 새 매칭</button>
      </div>
      ${backBar()}
    </section>
  `
}

function forbidden() {
  const cards = state.players
    .map(
      (p) => `
      <button class="forbid-card" data-forbid-caught="${p.id}" type="button">
        <span class="fname">${escapeHtml(p.name)}</span>
        <span class="fword">${escapeHtml(p.forbidden ?? '???')}</span>
        <span class="fcatch">말하면 탭!</span>
      </button>`,
    )
    .join('')

  return `
    <section class="panel game">
      <p class="kicker">${GAME_META.forbidden.tag}</p>
      <h2 class="title">${GAME_META.forbidden.title}</h2>
      <p class="sub">각자 금지어가 생겼다. 말하는 순간 탭해서 벌칙!</p>
      <div class="forbid-grid">${cards}</div>
      ${state.lastResult ? `<div class="result-banner">${escapeHtml(state.lastResult)}</div>` : ''}
      <button class="btn secondary wide" data-action="forbid-reshuffle" type="button">금지어 다시 배정</button>
      ${backBar()}
    </section>
  `
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/* -------------------- EVENTS -------------------- */

function bindEvents() {
  app.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
    el.addEventListener('click', () => onAction(el.dataset.action!))
  })

  app.querySelectorAll<HTMLElement>('[data-game]').forEach((el) => {
    el.addEventListener('click', () => openGame(el.dataset.game as GameId))
  })

  app.querySelectorAll<HTMLElement>('[data-remove]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.remove!
      setState({ players: state.players.filter((p) => p.id !== id) })
    })
  })

  const form = app.querySelector<HTMLFormElement>('[data-form="add-player"]')
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(form)
    const name = String(fd.get('name') ?? '').trim()
    if (!name) return
    if (state.players.some((p) => p.name === name)) {
      alert('이미 있는 이름이야!')
      return
    }
    setState({
      players: [...state.players, { id: uid(), name, drinks: 0 }],
    })
  })

  // balance
  let pendingPick: 'a' | 'b' | null = null
  app.querySelectorAll<HTMLElement>('[data-pick]').forEach((el) => {
    el.addEventListener('click', () => {
      pendingPick = el.dataset.pick as 'a' | 'b'
      app.querySelectorAll('.side').forEach((s) => s.classList.remove('hot'))
      el.classList.add('hot')
    })
  })
  app.querySelectorAll<HTMLElement>('[data-voter]').forEach((el) => {
    el.addEventListener('click', () => {
      if (!pendingPick) {
        alert('먼저 A 또는 B를 골라!')
        return
      }
      balanceVotes[el.dataset.voter!] = pendingPick
      pendingPick = null
      render()
    })
  })

  // success / fail generic
  app.querySelectorAll<HTMLElement>('[data-fail]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.fail!
      const sips = Number(el.dataset.sips ?? 1)
      const p = state.players.find((x) => x.id === id)
      addDrink(id, sips)
      finishGame(`${p?.name ?? ''} 벌칙 ${sips}모금!`)
    })
  })
  app.querySelectorAll<HTMLElement>('[data-success]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.success!
      const p = state.players.find((x) => x.id === id)
      finishGame(`${p?.name ?? ''} 성공! 통과 ✨`)
    })
  })

  app.querySelectorAll<HTMLElement>('[data-nunchi]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.nunchi!
      // collision: if somehow double — treat as drink (simple sequential UI so rare)
      if (nunchiClaimed[nunchiNext]) {
        const a = nunchiClaimed[nunchiNext]
        addDrinkMany([a, id], 1)
        const pa = state.players.find((p) => p.id === a)
        const pb = state.players.find((p) => p.id === id)
        setState({
          lastResult: `겹침! ${pa?.name}, ${pb?.name} 마셔!`,
        })
        nunchiNext = 1
        nunchiClaimed = {}
        render()
        return
      }
      nunchiClaimed[nunchiNext] = id
      nunchiNext += 1
      if (nunchiNext > state.players.length) {
        // last person drinks (classic nunchi)
        const lastId = id
        addDrink(lastId, 1)
        const p = state.players.find((x) => x.id === lastId)
        setState({ lastResult: `눈치 마지막! ${p?.name} 한 잔!` })
        nunchiNext = 1
        nunchiClaimed = {}
      }
      render()
    })
  })

  app.querySelectorAll<HTMLElement>('[data-rps]').forEach((el) => {
    el.addEventListener('click', () => {
      const c = el.dataset.rps as RpsChoice
      if (!rpsPick.a) rpsPick.a = c
      else if (!rpsPick.b) rpsPick.b = c
      render()
    })
  })

  app.querySelectorAll<HTMLElement>('[data-forbid-caught]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.forbidCaught!
      addDrink(id, 1)
      const p = state.players.find((x) => x.id === id)
      setState({
        lastResult: `금지어 발동! ${p?.name} 「${p?.forbidden}」 → 원샷`,
      })
    })
  })
}

function onAction(action: string) {
  switch (action) {
    case 'home':
      go('landing')
      break
    case 'setup':
      go('setup')
      break
    case 'hub':
      go('hub')
      break
    case 'chaos':
      startChaos()
      break
    case 'chaos-next':
      launchChaosNext()
      break
    case 'reset-drinks':
      setState({
        players: state.players.map((p) => ({ ...p, drinks: 0 })),
      })
      break
    case 'spin':
      doSpin()
      break
    case 'balance-reset': {
      balanceVotes = {}
      activeBalance = pick(BALANCE)
      render()
      break
    }
    case 'balance-apply': {
      const aCount = Object.values(balanceVotes).filter((v) => v === 'a').length
      const bCount = Object.values(balanceVotes).filter((v) => v === 'b').length
      if (aCount === bCount) {
        addDrinkMany(
          state.players.map((p) => p.id),
          1,
        )
      } else {
        const minority = aCount < bCount ? 'a' : 'b'
        const losers = state.players
          .filter((p) => balanceVotes[p.id] === minority)
          .map((p) => p.id)
        addDrinkMany(losers, 1)
      }
      finishGame('밸런스 벌칙 적용 완료!')
      break
    }
    case 'bomb-pass':
      passBomb()
      break
    case 'bomb-restart':
      startBomb()
      setState({ lastResult: null })
      break
    case 'mission-redraw':
      activeMission = pick(MISSIONS)
      retarget()
      render()
      break
    case 'cho-reveal':
      chosungRevealed = true
      render()
      break
    case 'cho-redraw':
      chosungRevealed = false
      activeChosung = pick(CHOSUNG)
      retarget()
      render()
      break
    case 'nunchi-reset':
      nunchiNext = 1
      nunchiClaimed = {}
      setState({ lastResult: null })
      break
    case 'truth-redraw':
      activeTruth = pick(TRUTHS)
      retarget()
      render()
      break
    case 'rps-reset': {
      rpsPick = {}
      const pair = randomPlayers(2)
      if (pair.length >= 2) rpsPair = [pair[0]!, pair[1]!]
      render()
      break
    }
    case 'rps-apply': {
      if (!rpsPair || !rpsPick.a || !rpsPick.b) break
      const w = rpsWinner(rpsPick.a, rpsPick.b)
      if (w !== 'draw') {
        const loser = w === 'a' ? rpsPair[1] : rpsPair[0]
        addDrink(loser.id, 1)
        finishGame(`${loser.name} 가위바위보 패배!`)
      } else {
        finishGame('가위바위보 무승부!')
      }
      break
    }
    case 'forbid-reshuffle':
      assignForbidden()
      setState({ lastResult: '금지어 재배정!' })
      break
  }
}

function doSpin() {
  if (rouletteSpinning) return
  rouletteSpinning = true
  rouletteResult = null
  render()
  window.setTimeout(() => {
    const player = pick(state.players)
    const penalty = pick(PENALTIES)
    rouletteResult = { player, penalty }
    rouletteSpinning = false
    if (penalty.sips > 0) addDrink(player.id, penalty.sips)
    else render()
    setState({
      lastResult: `${player.name} — ${penalty.text}`,
    })
  }, 2200)
}

render()
