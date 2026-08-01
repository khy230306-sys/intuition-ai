import './style.css'
import {
  sfxDeny,
  sfxMerge,
  sfxPrestige,
  sfxSell,
  sfxSpawn,
  unlockAudio,
  vibrate,
} from './audio'
import {
  CELL_COUNT,
  COLS,
  MAX_LEVEL,
  SPECIES,
  boardIncome,
  canMerge,
  createRun,
  firstEmpty,
  occupiedCount,
  spawnPrice,
  speciesAt,
  type RunState,
} from './game'
import {
  MEDALS,
  applyMergeProgress,
  applyPrestige,
  dailyTarget,
  loadProfile,
  rankProgress,
  touchSession,
  type Profile,
  type Screen,
} from './meta'

const app = document.querySelector<HTMLDivElement>('#app')!

let screen: Screen = 'home'
let profile: Profile = touchSession(loadProfile())
let run: RunState = createRun(profile.prestige, profile.unlocked)
let dragFrom: number | null = null
let lastMedals: string[] = []
let tickTimer: number | null = null

function toast(msg: string) {
  run = { ...run, toast: msg, toastAt: Date.now() }
  render()
  window.setTimeout(() => {
    if (run.toast === msg) {
      run = { ...run, toast: null }
      render()
    }
  }, 1400)
}

function setScreen(next: Screen) {
  screen = next
  if (next === 'play') startTick()
  else stopTick()
  render()
}

function startTick() {
  stopTick()
  tickTimer = window.setInterval(() => {
    const now = Date.now()
    const elapsed = (now - run.lastTick) / 1000
    if (elapsed < 0.9) return
    const ticks = Math.floor(elapsed)
    const gain = boardIncome(run.board, run.incomeMult) * ticks
    if (gain > 0) {
      run = {
        ...run,
        coins: run.coins + gain,
        lastTick: run.lastTick + ticks * 1000,
      }
      profile = { ...profile, lifetimeCoins: profile.lifetimeCoins + gain }
      // soft update hud without full board flicker if possible
      const coinEl = app.querySelector('[data-coins]')
      const rateEl = app.querySelector('[data-rate]')
      if (coinEl && rateEl && screen === 'play') {
        coinEl.textContent = String(run.coins)
        rateEl.textContent = `+${boardIncome(run.board, run.incomeMult)}/초`
      } else {
        render()
      }
    } else {
      run = { ...run, lastTick: now }
    }
  }, 1000)
}

function stopTick() {
  if (tickTimer != null) {
    window.clearInterval(tickTimer)
    tickTimer = null
  }
}

function beginPlay() {
  unlockAudio()
  profile = touchSession(loadProfile())
  run = createRun(profile.prestige, profile.unlocked)
  lastMedals = []
  setScreen('play')
}

function trySpawn() {
  const price = spawnPrice(run)
  const slot = firstEmpty(run.board)
  if (slot < 0) {
    sfxDeny()
    toast('자리가 없어요')
    return
  }
  if (run.coins < price) {
    sfxDeny()
    toast('코인이 모자라요')
    return
  }
  const board = [...run.board]
  board[slot] = 1
  run = {
    ...run,
    board,
    coins: run.coins - price,
    selected: null,
  }
  sfxSpawn()
  vibrate(8)
  render()
}

function tryMerge(from: number, to: number) {
  if (from === to) return
  const a = run.board[from] ?? null
  const b = run.board[to] ?? null
  if (canMerge(a, b)) {
    const nextLv = (a as number) + 1
    const board = [...run.board]
    board[from] = null
    board[to] = nextLv
    run = {
      ...run,
      board,
      totalMerges: run.totalMerges + 1,
      highest: Math.max(run.highest, nextLv),
      unlocked: Math.max(run.unlocked, nextLv),
      selected: to,
      coins: run.coins + Math.floor(speciesAt(nextLv).sell * 0.15),
    }
    const res = applyMergeProgress(profile, run, nextLv)
    profile = res.profile
    if (res.newMedals.length) {
      lastMedals = res.newMedals.map((m) => m.title)
      toast(`메달! ${lastMedals[0]}`)
    } else {
      toast(`${speciesAt(nextLv).name} 탄생!`)
    }
    sfxMerge(nextLv)
    vibrate([8, 20, 8])
    render()
    return
  }

  // move into empty
  if (a != null && b == null) {
    const board = [...run.board]
    board[from] = null
    board[to] = a
    run = { ...run, board, selected: to }
    render()
    return
  }

  sfxDeny()
  vibrate(20)
}

function sellSelected() {
  const i = run.selected
  if (i == null) {
    toast('팔 몽을 고르세요')
    return
  }
  const lv = run.board[i]
  if (lv == null) return
  const gain = speciesAt(lv).sell
  const board = [...run.board]
  board[i] = null
  run = { ...run, board, coins: run.coins + gain, selected: null }
  profile = { ...profile, lifetimeCoins: profile.lifetimeCoins + gain }
  sfxSell()
  toast(`+${gain} 코인`)
  render()
}

function doPrestige() {
  if (run.highest < 6) {
    sfxDeny()
    toast('레벨 6 이상에서 이사 가능')
    return
  }
  if (!confirm(`이사할까요?\n보드를 비우고 성장 보너스를 받습니다.\n(최고 ${run.highest} · 수입 ×${(run.incomeMult + 0.25).toFixed(2)})`)) {
    return
  }
  profile = applyPrestige(profile, run)
  sfxPrestige()
  vibrate([15, 30, 15])
  run = createRun(profile.prestige, profile.unlocked)
  toast(`이사 완료! 성장 ${profile.prestige}`)
  render()
}

function blobHtml(level: number, idx: number, selected: boolean) {
  const s = speciesAt(level)
  return `
    <button type="button" class="blob lv-${level} ${selected ? 'selected' : ''}"
      data-cell="${idx}" draggable="true"
      style="--c:${s.color}"
      aria-label="${s.name}">
      <span class="face">${s.face}</span>
      <span class="lv">${level}</span>
    </button>
  `
}

function renderHome() {
  const rp = rankProgress(profile.xp)
  const target = dailyTarget(profile.prestige)
  const dailyPct = Math.min(1, profile.dailyMerges / target)
  return `
    <div class="shell home">
      <div class="nest" aria-hidden="true">
        <div class="orb o1"></div>
        <div class="orb o2"></div>
        <div class="orb o3"></div>
      </div>
      <div class="rank-chip" style="--rank:${rp.cur.color}">
        <span>${rp.cur.label}</span>
        <span class="bar"><i style="width:${Math.round(rp.pct * 100)}%"></i></span>
        <span>${rp.next ? `다음 ${rp.next.label} ${rp.need}` : 'MAX'}</span>
      </div>
      <header class="hero">
        <p class="eyebrow">MERGE & RAISE</p>
        <h1 class="brand">몽글</h1>
        <p class="tagline">같은 몽을 합쳐 키우고, 도감을 채워보세요.</p>
        <div class="cta-row">
          <button type="button" class="btn primary" data-go="play">키우기</button>
          <button type="button" class="btn ghost" data-go="book">도감</button>
        </div>
        <div class="stats">
          <div><span>최고 레벨</span><strong>${profile.bestHighest}</strong></div>
          <div><span>누적 합치기</span><strong>${profile.lifetimeMerges}</strong></div>
          <div><span>성장</span><strong>${profile.prestige}</strong></div>
        </div>
        <div class="daily">
          <div class="daily-head"><span>오늘의 합치기</span><strong>${profile.dailyMerges}/${target}</strong></div>
          <div class="daily-bar"><i style="width:${Math.round(dailyPct * 100)}%"></i></div>
          <p>${profile.dailyCleared ? '오늘 도전 클리어!' : '합칠수록 랭크와 메달이 쌓여요.'}</p>
        </div>
        <p class="medal-line">메달 ${profile.medals.length}/${MEDALS.length} · 연속 ${profile.dayStreak}일</p>
      </header>
    </div>
  `
}

function renderBook() {
  const unlocked = profile.unlocked
  return `
    <div class="shell book">
      <button type="button" class="back" data-go="home">←</button>
      <h2 class="section-title">도감</h2>
      <p class="section-lead">${unlocked}/${MAX_LEVEL} 해금 · 합쳐서 다음 몽을 만나세요</p>
      <ul class="book-list">
        ${SPECIES.map((s) => {
          const on = s.level <= unlocked
          return `<li class="${on ? 'on' : 'off'}">
            <div class="book-blob" style="--c:${on ? s.color : '#9bb0b6'}">${on ? s.face : '?'}</div>
            <div>
              <strong>${on ? s.name : '???'}</strong>
              <span>Lv.${s.level}${on ? ` · 수입 ${s.income}/초` : ' · 아직 미발견'}</span>
            </div>
          </li>`
        }).join('')}
      </ul>
    </div>
  `
}

function renderPlay() {
  const price = spawnPrice(run)
  const rate = boardIncome(run.board, run.incomeMult)
  const full = occupiedCount(run.board) >= CELL_COUNT
  const sel = run.selected
  const selLv = sel != null ? run.board[sel] : null

  return `
    <div class="shell play ${full ? 'full' : ''}">
      <header class="play-hud">
        <button type="button" class="back tiny" data-go="home">←</button>
        <div class="coin-block">
          <span class="label">COIN</span>
          <strong data-coins>${run.coins}</strong>
          <em data-rate>+${rate}/초</em>
        </div>
        <div class="hi-block">
          <span class="label">BEST</span>
          <strong>Lv.${run.highest}</strong>
        </div>
      </header>

      <div class="board" style="--cols:${COLS}">
        ${run.board
          .map((cell, i) => {
            if (cell == null) {
              return `<div class="slot empty" data-cell="${i}"></div>`
            }
            return `<div class="slot">${blobHtml(cell, i, sel === i)}</div>`
          })
          .join('')}
      </div>

      <p class="hint">${selLv != null ? `${speciesAt(selLv).name} 선택됨 · 같은 레벨에 드롭하여 합치기` : '몽을 끌어 같은 레벨에 놓아 합치세요'}</p>

      <div class="actions">
        <button type="button" class="btn primary" data-act="spawn">꺼내기 ${price}</button>
        <button type="button" class="btn ghost" data-act="sell" ${selLv == null ? 'disabled' : ''}>팔기</button>
        <button type="button" class="btn ghost" data-act="prestige">이사</button>
        <button type="button" class="btn ghost" data-go="book">도감</button>
      </div>

      ${run.toast ? `<div class="toast">${run.toast}</div>` : ''}
    </div>
  `
}

function render() {
  let body = ''
  if (screen === 'home') body = renderHome()
  else if (screen === 'book') body = renderBook()
  else body = renderPlay()

  app.innerHTML = `
    <div class="atmosphere" aria-hidden="true"><div class="wash"></div><div class="grain"></div></div>
    ${body}
  `
  bind()
}

function bind() {
  app.querySelectorAll<HTMLElement>('[data-go]').forEach((el) => {
    el.addEventListener('click', () => {
      const go = el.dataset.go as Screen
      if (go === 'play') beginPlay()
      else setScreen(go)
    })
  })

  app.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const act = el.dataset.act
      if (act === 'spawn') trySpawn()
      else if (act === 'sell') sellSelected()
      else if (act === 'prestige') doPrestige()
    })
  })

  // tap select + merge
  app.querySelectorAll<HTMLElement>('[data-cell]').forEach((el) => {
    const idx = Number(el.dataset.cell)
    el.addEventListener('click', () => {
      if (screen !== 'play') return
      if (run.selected == null) {
        if (run.board[idx] != null) {
          run = { ...run, selected: idx }
          render()
        }
        return
      }
      if (run.selected === idx) {
        run = { ...run, selected: null }
        render()
        return
      }
      tryMerge(run.selected, idx)
    })

    // drag (desktop + some mobile)
    el.addEventListener('dragstart', (e) => {
      if (run.board[idx] == null) {
        e.preventDefault()
        return
      }
      dragFrom = idx
      run = { ...run, selected: idx }
      e.dataTransfer?.setData('text/plain', String(idx))
    })
    el.addEventListener('dragover', (e) => e.preventDefault())
    el.addEventListener('drop', (e) => {
      e.preventDefault()
      const from = dragFrom ?? Number(e.dataTransfer?.getData('text/plain'))
      dragFrom = null
      if (Number.isFinite(from)) tryMerge(from, idx)
    })
  })

  // touch drag
  let touchFrom: number | null = null
  const board = app.querySelector('.board')
  board?.addEventListener(
    'touchstart',
    (e: Event) => {
      const te = e as TouchEvent
      const t = te.changedTouches[0]
      if (!t) return
      const target = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null
      const cell = target?.closest?.('[data-cell]') as HTMLElement | null
      if (!cell) return
      const idx = Number(cell.dataset.cell)
      if (run.board[idx] != null) touchFrom = idx
    },
    { passive: true },
  )
  board?.addEventListener(
    'touchend',
    (e: Event) => {
      if (touchFrom == null) return
      const te = e as TouchEvent
      const t = te.changedTouches[0]
      if (!t) return
      const target = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null
      const cell = target?.closest?.('[data-cell]') as HTMLElement | null
      const to = cell ? Number(cell.dataset.cell) : -1
      const from = touchFrom
      touchFrom = null
      if (to >= 0 && from !== to) tryMerge(from, to)
    },
    { passive: true },
  )
}

render()
