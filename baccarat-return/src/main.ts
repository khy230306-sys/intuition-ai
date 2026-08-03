import './style.css'
import {
  countableLength,
  judgeGuess,
  parsePattern,
  patternToText,
  revealedPattern,
  skipTies,
  summarizeMarks,
  toBigRoad,
} from './pattern'
import {
  addSession,
  clearSessions,
  loadLastPattern,
  loadSessions,
  saveLastPattern,
} from './storage'
import type { Mark, Outcome, SessionRecord, SessionStatus, View } from './types'
import { extractPatternFromImage } from './vision'

const INSTALL_DISMISS_KEY = 'baccarat_return_install_dismissed'

const state = {
  view: 'setup' as View,
  patternText: loadLastPattern(),
  pattern: parsePattern(loadLastPattern()) as Outcome[],
  previewUrl: '' as string,
  source: 'manual' as 'photo' | 'manual',
  scanning: false,
  // play
  status: 'idle' as SessionStatus,
  cursor: 0,
  revealed: 0,
  marks: [] as Mark[],
  banner: '' as string,
  bannerKind: '' as '' | 'tie' | 'ok' | 'fail',
  sessions: loadSessions() as SessionRecord[],
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  showInstall: false,
}

function isStandalone(): boolean {
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const ios =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || ios
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const webkit = /WebKit/.test(ua)
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua)
  return iOS && webkit && notOther
}

function refreshInstallHint(): void {
  const dismissed = localStorage.getItem(INSTALL_DISMISS_KEY) === '1'
  state.showInstall =
    !dismissed && !isStandalone() && (isIosSafari() || /Android/i.test(navigator.userAgent))
}

function pct(n: number | null, digits = 1): string {
  if (n === null || Number.isNaN(n)) return '—'
  return `${(n * 100).toFixed(digits)}%`
}

function showFlash(msg: string): void {
  const el = document.getElementById('flash')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  window.setTimeout(() => el.classList.remove('show'), 1600)
}

function syncPatternFromText(text: string): void {
  state.patternText = text
  state.pattern = parsePattern(text)
  saveLastPattern(patternToText(state.pattern))
}

function resetPlay(keepPattern = true): void {
  if (!keepPattern) {
    state.pattern = []
    state.patternText = ''
    saveLastPattern('')
  }
  state.status = 'idle'
  state.cursor = 0
  state.revealed = 0
  state.marks = []
  state.banner = ''
  state.bannerKind = ''
}

function startPlay(): void {
  syncPatternFromText(state.patternText)
  if (countableLength(state.pattern) === 0) {
    showFlash('B/P 패턴을 먼저 입력하세요')
    return
  }
  resetPlay(true)
  state.status = 'playing'
  state.view = 'play'
  // Auto-announce leading ties
  const skipped = skipTies(state.pattern, 0)
  state.cursor = skipped.index
  if (skipped.ties > 0) {
    state.banner = skipped.ties === 1 ? '타이' : `타이 ×${skipped.ties}`
    state.bannerKind = 'tie'
    showFlash(state.banner)
  } else {
    state.banner = '처음부터 맞춰보세요'
    state.bannerKind = ''
  }
  render()
}

function finishSession(status: 'cleared' | 'failed'): void {
  state.status = status
  const { hits, misses } = summarizeMarks(state.marks)
  const record: SessionRecord = {
    id: `${Date.now()}`,
    createdAt: Date.now(),
    pattern: [...state.pattern],
    marks: [...state.marks],
    status,
    hitCount: hits,
    missCount: misses,
    source: state.source,
  }
  state.sessions = addSession(record)
  state.banner = status === 'cleared' ? '클리어 · 전체 적중' : '실패'
  state.bannerKind = status === 'cleared' ? 'ok' : 'fail'
  showFlash(state.banner)
}

function onGuess(guess: 'B' | 'P'): void {
  if (state.status !== 'playing') return

  const before = skipTies(state.pattern, state.cursor)
  if (before.ties > 0) {
    state.cursor = before.index
    state.banner = before.ties === 1 ? '타이' : `타이 ×${before.ties}`
    state.bannerKind = 'tie'
    showFlash(state.banner)
  }

  if (state.cursor >= state.pattern.length) {
    finishSession('cleared')
    render()
    return
  }

  const result = judgeGuess(state.pattern, state.cursor, guess)
  if (!result.expected || result.expected === 'T') {
    render()
    return
  }

  if (result.ok) {
    state.marks.push('O')
    state.revealed += 1
    state.cursor = result.nextIndex
    state.banner = '적중'
    state.bannerKind = 'ok'
    showFlash('적중')

    // Skip following ties automatically
    const after = skipTies(state.pattern, state.cursor)
    if (after.ties > 0) {
      state.cursor = after.index
      state.banner = after.ties === 1 ? '타이' : `타이 ×${after.ties}`
      state.bannerKind = 'tie'
      showFlash(state.banner)
    }

    if (state.cursor >= state.pattern.length) {
      finishSession('cleared')
    }
  } else {
    state.marks.push('X')
    finishSession('failed')
  }
  render()
}

async function onPhotoSelected(file: File): Promise<void> {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl)
  state.previewUrl = URL.createObjectURL(file)
  state.scanning = true
  state.source = 'photo'
  render()
  try {
    const pattern = await extractPatternFromImage(file)
    if (pattern.length === 0) {
      showFlash('패턴을 찾지 못했습니다 · 직접 입력하세요')
    } else {
      state.pattern = pattern
      state.patternText = patternToText(pattern)
      saveLastPattern(state.patternText)
      showFlash(`패턴 ${countableLength(pattern)}칸 인식 · 확인 후 시작`)
    }
  } catch (e) {
    showFlash(e instanceof Error ? e.message : '인식 실패')
  } finally {
    state.scanning = false
    render()
  }
}

function renderHeader(root: HTMLElement): void {
  const recent = state.sessions.slice(0, 20)
  const marks = recent.flatMap((s) => s.marks)
  const sum = summarizeMarks(marks)
  const clears = recent.filter((s) => s.status === 'cleared').length
  const offline = state.online
    ? ''
    : `<div class="offline-badge">오프라인 · 저장된 패턴으로 복귀 가능</div>`
  const install = state.showInstall
    ? `<div class="install-banner" id="install-banner">
        <div><strong>홈 화면에 추가</strong><br/>Safari 공유(□↑) → 「홈 화면에 추가」하면 앱처럼 실행됩니다.</div>
        <button type="button" id="dismiss-install" aria-label="닫기">×</button>
      </div>`
    : ''

  root.innerHTML = `
    <header class="header">
      <h1 class="brand">Baccarat<span>RETURN · 복귀</span></h1>
      ${offline}
      ${install}
      <div class="stats-row">
        <div class="stat-chip"><span class="label">패턴</span><span class="value">${countableLength(state.pattern)}</span></div>
        <div class="stat-chip"><span class="label">세션</span><span class="value">${state.sessions.length}</span></div>
        <div class="stat-chip"><span class="label">적중률</span><span class="value">${pct(sum.rate, 0)}</span></div>
        <div class="stat-chip"><span class="label">클리어</span><span class="value">${clears}</span></div>
      </div>
    </header>
  `
  root.querySelector('#dismiss-install')?.addEventListener('click', () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, '1')
    state.showInstall = false
    render()
  })
}

function renderRoadHtml(pattern: Outcome[]): string {
  const road = toBigRoad(pattern)
  if (road.length === 0) {
    return `<div class="road-wrap"><div class="big-road"></div></div>`
  }
  const cols = road
    .map((col) => {
      const cells = Array.from({ length: 6 }, (_, row) => {
        const cell = col[row]
        if (!cell) return `<div class="bead" style="visibility:hidden"></div>`
        const tie =
          cell.tiesAfter > 0
            ? `<span class="tie-mark">${cell.tiesAfter > 1 ? cell.tiesAfter : '/'}</span>`
            : ''
        return `<div class="bead ${cell.outcome}">${tie}</div>`
      }).join('')
      return `<div class="road-col">${cells}</div>`
    })
    .join('')
  return `<div class="road-wrap"><div class="big-road">${cols}</div></div>`
}

function renderOxHtml(marks: Mark[]): string {
  if (marks.length === 0) return `<div class="ox-board"><span class="ox-empty">아직 없음</span></div>`
  return `<div class="ox-board">${marks
    .map((m) => `<span class="ox-cell ${m}">${m}</span>`)
    .join('')}</div>`
}

function renderSetup(root: HTMLElement): void {
  const chips = state.pattern
    .slice(0, 48)
    .map((o) => `<span class="seq-chip ${o}">${o}</span>`)
    .join('')
  const more = state.pattern.length > 48 ? `<span class="ox-empty">+${state.pattern.length - 48}</span>` : ''

  root.innerHTML = `
    <section class="panel">
      <h2>1. 사진으로 패턴 기억</h2>
      <p class="hint">로비/테이블 대로표를 찍어서 올리면 빨간(B)·파란(P) 패턴을 읽습니다. 화면 사진도 가능하지만, 시작 전 한 번 확인해 주세요.</p>
      ${state.previewUrl ? `<img class="preview" src="${state.previewUrl}" alt="업로드 미리보기" />` : ''}
      <label class="btn btn-gold file-btn" style="margin-bottom:10px;text-align:center;">
        ${state.scanning ? '인식 중…' : '사진 업로드'}
        <input id="photo" type="file" accept="image/*" capture="environment" ${state.scanning ? 'disabled' : ''} />
      </label>
      <div class="legend">
        <span><i class="b"></i>B 뱅커</span>
        <span><i class="p"></i>P 플레이어</span>
        <span><i class="t"></i>T 타이(안내만)</span>
      </div>
    </section>

    <section class="panel">
      <h2>2. 패턴 확인 · 수정</h2>
      <p class="hint">B / P / T 또는 뱅커·플레이어·타이 텍스트로 수정할 수 있습니다. 타이는 복귀 중 「타이」안내만 하고 성공/실패에 넣지 않습니다.</p>
      <textarea id="pattern" class="pattern-input" placeholder="예: BBP T PBBP">${state.patternText}</textarea>
      <div class="chip-row">${chips || '<span class="ox-empty">패턴 없음</span>'}${more}</div>
      <div class="actions">
        <button type="button" class="btn" id="btn-clear-pattern">패턴 지우기</button>
        <button type="button" class="btn btn-gold" id="btn-start">복귀 시작</button>
      </div>
    </section>
  `

  root.querySelector('#photo')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) void onPhotoSelected(file)
  })
  root.querySelector('#pattern')?.addEventListener('input', (e) => {
    const v = (e.target as HTMLTextAreaElement).value
    state.source = 'manual'
    syncPatternFromText(v)
    // light re-render of chips only would be nicer; full render keeps cursor jump — update chips manually
    const row = root.querySelector('.chip-row')
    if (row) {
      const p = state.pattern
      const chips = p
        .slice(0, 48)
        .map((o) => `<span class="seq-chip ${o}">${o}</span>`)
        .join('')
      const more = p.length > 48 ? `<span class="ox-empty">+${p.length - 48}</span>` : ''
      row.innerHTML = chips ? chips + more : '<span class="ox-empty">패턴 없음</span>'
    }
    const chip = document.querySelector('.stats-row .stat-chip .value')
    if (chip) chip.textContent = String(countableLength(state.pattern))
  })
  root.querySelector('#btn-clear-pattern')?.addEventListener('click', () => {
    syncPatternFromText('')
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl)
      state.previewUrl = ''
    }
    state.source = 'manual'
    render()
  })
  root.querySelector('#btn-start')?.addEventListener('click', () => startPlay())
}

function renderPlay(root: HTMLElement): void {
  const playing = state.status === 'playing'
  const done = state.status === 'cleared' || state.status === 'failed'
  const visible = revealedPattern(state.pattern, state.revealed)
  const sum = summarizeMarks(state.marks)
  const total = countableLength(state.pattern)
  const bannerClass = state.bannerKind ? ` status-banner ${state.bannerKind}` : ' status-banner'

  root.innerHTML = `
    <section class="panel">
      <div class="${bannerClass.trim()}">${state.banner || (playing ? 'B / P 를 입력하세요' : '패턴을 준비하고 시작하세요')}</div>
      <div class="board-label">
        <h2>대로표</h2>
        <span class="meta">${state.revealed} / ${total}</span>
      </div>
      ${renderRoadHtml(visible)}
      <p class="hint">맞출 때마다 정답이 대로표에 하나씩 표시됩니다.</p>
    </section>

    <section class="panel">
      <div class="board-label">
        <h2>성공 · 실패 표</h2>
        <span class="meta">O ${sum.hits} · X ${sum.misses}</span>
      </div>
      ${renderOxHtml(state.marks)}
      <p class="hint">성공 O / 실패 X · 타이는 표에 넣지 않습니다.</p>
    </section>

    <section class="panel">
      <h2>입력</h2>
      <div class="guess-pad">
        <button type="button" class="banker" data-guess="B" ${playing ? '' : 'disabled'}>B 뱅커</button>
        <button type="button" class="player" data-guess="P" ${playing ? '' : 'disabled'}>P 플레이어</button>
      </div>
      <div class="actions" style="margin-top:10px;">
        <button type="button" class="btn" id="btn-retry" ${done || state.status === 'idle' ? '' : 'disabled'}>다시 복귀</button>
        <button type="button" class="btn btn-danger" id="btn-to-setup">패턴 수정</button>
      </div>
    </section>
  `

  root.querySelectorAll('[data-guess]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const g = (btn as HTMLElement).dataset.guess
      if (g === 'B' || g === 'P') onGuess(g)
    })
  })
  root.querySelector('#btn-retry')?.addEventListener('click', () => startPlay())
  root.querySelector('#btn-to-setup')?.addEventListener('click', () => {
    state.view = 'setup'
    render()
  })
}

function renderHistory(root: HTMLElement): void {
  if (state.sessions.length === 0) {
    root.innerHTML = `<section class="panel"><div class="empty">아직 복귀 기록이 없습니다.</div></section>`
    return
  }

  const rows = state.sessions
    .map((s) => {
      const t = new Date(s.createdAt)
      const time = `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
      const rate = summarizeMarks(s.marks).rate
      return `<tr>
        <td>${time}</td>
        <td>${s.status === 'cleared' ? '클리어' : '실패'}</td>
        <td>${s.hitCount}/${s.hitCount + s.missCount}</td>
        <td>${pct(rate, 0)}</td>
        <td>${s.source === 'photo' ? '사진' : '수동'}</td>
      </tr>`
    })
    .join('')

  root.innerHTML = `
    <section class="panel">
      <h2>복귀 기록</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>시간</th><th>결과</th><th>적중</th><th>비율</th><th>출처</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button type="button" class="btn btn-danger" id="btn-clear-history">기록 삭제</button>
        <button type="button" class="btn" id="btn-export">요약 복사</button>
      </div>
    </section>
  `

  root.querySelector('#btn-clear-history')?.addEventListener('click', () => {
    if (!confirm('모든 복귀 기록을 삭제할까요?')) return
    clearSessions()
    state.sessions = []
    showFlash('기록 삭제됨')
    render()
  })
  root.querySelector('#btn-export')?.addEventListener('click', async () => {
    const text = state.sessions
      .map(
        (s) =>
          `${new Date(s.createdAt).toISOString()}\t${s.status}\t${s.hitCount}/${s.hitCount + s.missCount}\t${patternToText(s.pattern)}`,
      )
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      showFlash('기록을 복사했습니다')
    } catch {
      showFlash('복사 실패')
    }
  })
}

function renderNav(root: HTMLElement): void {
  const items: { id: View; label: string }[] = [
    { id: 'setup', label: '패턴' },
    { id: 'play', label: '복귀' },
    { id: 'history', label: '기록' },
  ]
  root.innerHTML = items
    .map(
      (it) =>
        `<button type="button" data-view="${it.id}" class="${state.view === it.id ? 'active' : ''}">${it.label}</button>`,
    )
    .join('')
  root.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = (btn as HTMLElement).dataset.view as View
      render()
    })
  })
}

function render(): void {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = `<div id="header"></div><div id="main"></div><nav class="nav" id="nav"></nav>`
  renderHeader(app.querySelector('#header')!)
  const main = app.querySelector('#main') as HTMLElement
  if (state.view === 'setup') renderSetup(main)
  else if (state.view === 'play') renderPlay(main)
  else renderHistory(main)
  renderNav(app.querySelector('#nav')!)
}

function boot(): void {
  refreshInstallHint()
  window.addEventListener('online', () => {
    state.online = true
    render()
  })
  window.addEventListener('offline', () => {
    state.online = false
    render()
  })
  // If pattern already saved, ready for play
  if (state.pattern.length > 0) state.status = 'idle'
  render()
}

boot()
