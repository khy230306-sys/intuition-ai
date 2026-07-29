import './style.css'
import { quickActions } from './actions'
import { think } from './brain'
import { fetchQuote, formatMoney, formatQuote } from './finance'
import { formatDescriptive } from './stats'
import {
  INSTALL_DISMISS_KEY,
  clearChat,
  deleteExpense,
  deleteHabit,
  deleteMemory,
  deleteReminder,
  deleteSeries,
  deleteShopping,
  deleteTrade,
  expenseTotals,
  getActiveSeriesName,
  importBackup,
  loadChat,
  loadExpenses,
  loadHabits,
  loadHoldings,
  loadMemory,
  loadReminders,
  loadSeriesList,
  loadSettings,
  loadShopping,
  loadTrades,
  loadWatchlist,
  removeHolding,
  removeWatch,
  saveChat,
  saveSettings,
  toggleReminder,
  toggleShopping,
} from './storage'
import type { ChatMessage, JarvisSettings, QuoteSnapshot, View } from './types'
import { VoiceListener, canListen, probeVoiceSupport, speakAsync, stopSpeaking } from './voice'
import { currentListenLang, loadInterpretMode, clearInterpretMode } from './translateBrain'
import {
  canUseGeolocation,
  queryPermissionState,
  requestLocation,
  wasLocationGranted,
  type GeoFix,
} from './location'

import {
  ARCADE_META,
  loadArcadeBest,
  mountArcade,
  type ArcadeHandle,
  type ArcadeId,
} from './arcadeGames'
import {
  ensureNotificationPermission,
  setAlarmUiHandler,
  startAlarmScheduler,
} from './notify'
import { buildHomeSummary } from './homeSummary'
import {
  appShareMessage,
  appShareUrl,
  buildBackupQrPayload,
  downloadBackupBlob,
  qrSvg,
  registerShareModal,
  shareAppLink,
  shareBackupFile,
} from './shareKit'
import { fetchWeather, type WeatherSnap } from './weather'

const APP_VERSION = '1.5.5'

const SUGGESTIONS = [
  '앱 공유',
  '100달러 환율',
  '장시간',
  '커피 4500',
  '알림 1분 뒤 테스트',
  '도움말',
]

const TRANSLATE_LANGS: Array<{ code: string; label: string; cmd: string }> = [
  { code: 'vi', label: '베트남어', cmd: '지금부터 스톱할 때까지 베트남어로 번역해줘' },
  { code: 'en', label: '영어', cmd: '지금부터 스톱할 때까지 영어로 번역해줘' },
  { code: 'ja', label: '일본어', cmd: '지금부터 스톱할 때까지 일본어로 번역해줘' },
  { code: 'zh-CN', label: '중국어', cmd: '지금부터 스톱할 때까지 중국어로 번역해줘' },
  { code: 'es', label: '스페인어', cmd: '지금부터 스톱할 때까지 스페인어로 번역해줘' },
]

const state = {
  view: 'chat' as View,
  messages: [] as ChatMessage[],
  draft: '',
  busy: false,
  listening: false,
  voiceHint: '',
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  showInstall: false,
  settings: loadSettings(),
  quoteCache: {} as Record<string, QuoteSnapshot | null>,
  listenLang: 'ko-KR',
  /** App stays locked until device location is allowed */
  locationReady: false,
  locationError: '',
  locationBusy: false,
  lastFix: null as GeoFix | null,
  arcadeId: 'snake' as ArcadeId,
  arcadeScore: 0,
  weather: null as WeatherSnap | null,
  shareModal: null as null | 'app' | 'backup',
  shareQrSvg: '',
  shareHint: '',
}

let arcade: ArcadeHandle | null = null

const voice = new VoiceListener()

function stopArcade(): void {
  arcade?.stop()
  arcade = null
}

function uid(): string {
  return crypto.randomUUID()
}

function isStandalone(): boolean {
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const ios = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || ios
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const webkit = /WebKit/.test(ua)
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua)
  return iOS && webkit && notOther
}

function refreshInstallHint(): void {
  const dismissed = localStorage.getItem(INSTALL_DISMISS_KEY) === '1'
  state.showInstall = !dismissed && !isStandalone() && (isIosSafari() || /Android/i.test(navigator.userAgent))
}

function showFlash(msg: string): void {
  const el = document.getElementById('flash')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  window.setTimeout(() => el.classList.remove('show'), 1800)
}

async function openShareModal(kind: 'app' | 'backup'): Promise<void> {
  state.shareModal = kind
  state.shareQrSvg = ''
  state.shareHint = kind === 'app' ? appShareUrl() : 'QR 생성 중…'
  render()
  try {
    if (kind === 'app') {
      const url = appShareUrl()
      state.shareQrSvg = await qrSvg(url)
      state.shareHint = url
    } else {
      const built = buildBackupQrPayload()
      state.shareQrSvg = await qrSvg(built.payload)
      state.shareHint =
        built.kind === 'full'
          ? `전체 백업 QR (${built.bytes}B) — 카메라로 스캔해 저장하세요.`
          : built.reason
    }
  } catch (err) {
    state.shareHint = err instanceof Error ? err.message : 'QR 생성 실패'
  }
  render()
}

async function refreshWeather(): Promise<void> {
  const fix = state.lastFix
  if (!fix) return
  const place = state.settings.city || '현재 위치'
  const w = await fetchWeather(fix.lat, fix.lon, place)
  if (w) {
    state.weather = w
    if (state.locationReady && state.view === 'chat' && !state.busy) {
      const widget = document.querySelector('[data-home-widget] .home-weather')
      if (widget) {
        const s = buildHomeSummary(w)
        widget.textContent = s.weatherLine
      } else {
        render()
      }
    }
  }
}

function pushMsg(role: ChatMessage['role'], text: string): ChatMessage {
  const msg: ChatMessage = { id: uid(), role, text, createdAt: Date.now() }
  state.messages.push(msg)
  saveChat(state.messages)
  return msg
}

async function handleUserText(raw: string): Promise<void> {
  const text = raw.trim()
  if (!text || state.busy) return
  state.busy = true
  state.listening = false
  state.voiceHint = ''
  state.draft = ''
  stopSpeaking()
  pushMsg('user', text)
  render()
  scrollChat()

  try {
    const history = state.messages.map((m) => ({ role: m.role, text: m.text }))
    const thinkPromise = think(text, history.slice(0, -1))
    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('응답 시간이 초과되었습니다. 다시 시도해 주세요.')), 12_000)
    })
    const reply = await Promise.race([thinkPromise, timeoutPromise])
    if (reply.action) {
      const result = await Promise.race([
        Promise.resolve(reply.action()),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('실행 시간이 초과되었습니다.')), 8_000)
        }),
      ])
      if (result && 'message' in result && result.message && result.message !== reply.text) {
        pushMsg('assistant', `${reply.text}\n(${result.message})`)
      } else {
        pushMsg('assistant', reply.text)
      }
    } else {
      pushMsg('assistant', reply.text)
    }
    if (reply.view) state.view = reply.view
    if (reply.arcadeId) state.arcadeId = reply.arcadeId
    if (reply.listenLang) state.listenLang = reply.listenLang
    if (reply.speak !== false && state.settings.speakReplies) {
      const lang = reply.speakLang || 'ko-KR'
      const speakText = reply.text.includes('번역:')
        ? reply.text.split('번역:').pop()?.split('\n')[0]?.trim() || reply.text
        : reply.text
      void speakAsync(speakText.replace(/\n+/g, '. ').slice(0, 220), lang)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.'
    pushMsg('assistant', msg)
  } finally {
    state.busy = false
    render()
    scrollChat()
  }
}

/** Update mic/caption/draft without destroying the recognition session via full remount. */
function patchVoiceUi(): void {
  const mic = document.querySelector<HTMLButtonElement>('[data-action="mic"]')
  if (mic) {
    mic.classList.toggle('listening', state.listening)
    mic.textContent = state.listening ? 'STOP' : 'MIC'
    mic.setAttribute('aria-pressed', state.listening ? 'true' : 'false')
  }
  const status = document.querySelector('.status-pill')
  if (status) {
    status.textContent = state.listening
      ? '듣는 중'
      : state.busy
        ? '분석 중'
        : state.online
          ? '대기'
          : '오프라인'
  }
  const caption = document.getElementById('voice-caption')
  if (caption) {
    caption.hidden = !state.listening && !state.voiceHint
    caption.textContent = state.listening
      ? state.voiceHint || '듣고 있습니다… 말씀해 주세요'
      : state.voiceHint
    caption.classList.toggle('live', state.listening)
  }
  const input = document.getElementById('draft') as HTMLInputElement | null
  if (input && state.listening) {
    input.value = state.draft
    input.placeholder = '음성 인식 중…'
  }
}

function scrollChat(): void {
  const el = document.querySelector('.messages')
  if (el) el.scrollTop = el.scrollHeight
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;')
}

function renderBrand(): string {
  const status = state.listening
    ? '듣는 중'
    : state.busy
      ? '분석 중'
      : loadInterpretMode().active
        ? '통역'
        : state.online
          ? '대기'
          : '오프라인'
  return `
    <header class="brand-bar">
      <div class="brand">
        <div class="orb" aria-hidden="true"></div>
        <div>
          <h1>JARVIS</h1>
          <p>${loadInterpretMode().active ? `실시간 통역 · MIC ${escapeHtml(state.listenLang)}` : `만능·투자 AI 비서 · ${escapeHtml(state.settings.displayName)}`}</p>
        </div>
      </div>
      <div class="status-pill">${status}</div>
    </header>
  `
}

function renderInstall(): string {
  if (!state.showInstall) return ''
  return `
    <div class="install-banner">
      <div>
        <strong>홈 화면에 추가</strong><br />
        Safari 공유 → <strong>홈 화면에 추가</strong><br />
        <span style="opacity:.85">앱을 열면 위치 허용이 필요합니다.</span>
      </div>
      <button type="button" data-action="dismiss-install" aria-label="닫기">×</button>
    </div>
  `
}

function renderLocationGate(): string {
  const err = state.locationError
    ? `<p class="loc-error">${escapeHtml(state.locationError)}</p>`
    : ''
  return `
    <section class="location-gate">
      <div class="loc-card">
        <div class="big-orb"></div>
        <h1>JARVIS</h1>
        <p class="loc-lead">위치 권한이 <strong>필수</strong>입니다.</p>
        <p class="loc-body">
          홈 화면에 추가한 뒤 앱을 실행하면,<br/>
          이 기기 위치를 허용해야 JARVIS를 사용할 수 있습니다.<br/>
          <span class="muted">위치는 이 아이폰의 JARVIS 안에서만 쓰입니다.</span>
        </p>
        ${err}
        <button type="button" class="primary-btn loc-allow" data-action="allow-location" ${
          state.locationBusy ? 'disabled' : ''
        }>
          ${state.locationBusy ? '확인 중…' : '위치 허용하고 시작'}
        </button>
        <p class="loc-help">거부했다면: 설정 → 개인정보 보호 → 위치 서비스 → Safari/JARVIS → 허용</p>
        <p class="translate-hint">v${APP_VERSION}</p>
      </div>
    </section>
  `
}

function renderNav(): string {
  const items: Array<{ id: View; label: string; ico: string }> = [
    { id: 'chat', label: '대화', ico: 'CHAT' },
    { id: 'invest', label: '투자', ico: 'INV' },
    { id: 'life', label: '생활', ico: 'LIFE' },
    { id: 'games', label: '게임', ico: 'PLAY' },
    { id: 'actions', label: '실행', ico: 'RUN' },
    { id: 'settings', label: '설정', ico: 'SET' },
  ]
  return `
    <nav class="nav nav-6">
      ${items
        .map(
          (i) => `
        <button type="button" data-view="${i.id}" class="${state.view === i.id ? 'active' : ''}">
          <span class="nav-ico">${i.ico}</span>
          <span>${i.label}</span>
        </button>
      `,
        )
        .join('')}
    </nav>
  `
}

function renderGames(): string {
  const best = loadArcadeBest()
  const meta = ARCADE_META[state.arcadeId]
  const tabs = (Object.keys(ARCADE_META) as ArcadeId[])
    .map(
      (id) =>
        `<button type="button" class="game-tab ${state.arcadeId === id ? 'active' : ''}" data-arcade="${id}">${ARCADE_META[id].title}</button>`,
    )
    .join('')
  const hi = best[state.arcadeId]
  const controls =
    state.arcadeId === 'snake'
      ? `
      <div class="arcade-pad">
        <button type="button" data-dir="0,-1">▲</button>
        <div class="arcade-pad-mid">
          <button type="button" data-dir="-1,0">◀</button>
          <button type="button" data-dir="1,0">▶</button>
        </div>
        <button type="button" data-dir="0,1">▼</button>
      </div>
      <p class="game-meta">방향 버튼 · 게임오버 시 화면 탭</p>`
      : state.arcadeId === 'breakout'
        ? `<p class="game-meta">드래그로 패들 · 게임오버 시 화면 탭</p>`
        : `<p class="game-meta">좌우 드래그 · 자동발사 · 게임오버 시 화면 탭</p>`

  return `
    <section class="panel view-scroll games-panel">
      <h2 class="section-title">ARCADE</h2>
      <p class="hint">오프라인 아케이드 · 점수 기기 저장</p>
      <div class="game-tabs">${tabs}</div>
      <div class="arcade-toolbar">
        <div class="arcade-hud">SCORE ${state.arcadeScore} · BEST ${hi ?? '—'}</div>
        <button type="button" class="arcade-restart-btn" data-arcade-restart="1">다시 시작</button>
      </div>
      <p class="hint">${escapeHtml(meta.blurb)}</p>
      <div class="arcade-stage">
        <canvas id="arcade-canvas" width="360" height="440"></canvas>
      </div>
      ${controls}
    </section>
  `
}

function mountActiveArcade(): void {
  stopArcade()
  const canvas = document.getElementById('arcade-canvas') as HTMLCanvasElement | null
  if (!canvas || state.view !== 'games') return
  state.arcadeScore = 0
  arcade = mountArcade(state.arcadeId, canvas, (n) => {
    state.arcadeScore = n
    const hud = document.querySelector('.arcade-hud')
    if (hud) {
      const best = loadArcadeBest()[state.arcadeId]
      hud.textContent = `SCORE ${n} · BEST ${best ?? '—'}`
    }
  })

  const toLocal = (ev: TouchEvent | MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in ev) {
      const t = ev.touches[0] || ev.changedTouches[0]
      if (!t) return null
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
  }

  const onDown = (ev: TouchEvent | MouseEvent) => {
    const p = toLocal(ev)
    if (!p) return
    ev.preventDefault()
    if (arcade?.isOver()) {
      arcade.restart()
      state.arcadeScore = 0
      const hud = document.querySelector('.arcade-hud')
      const best = loadArcadeBest()[state.arcadeId]
      if (hud) hud.textContent = `SCORE 0 · BEST ${best ?? '—'}`
      return
    }
    arcade?.pointer(p.x, p.y, 'down')
  }
  const onMove = (ev: TouchEvent | MouseEvent) => {
    const p = toLocal(ev)
    if (!p) return
    ev.preventDefault()
    arcade?.pointer(p.x, p.y, 'move')
  }
  const onUp = (ev: TouchEvent | MouseEvent) => {
    const p = toLocal(ev)
    if (!p) return
    arcade?.pointer(p.x, p.y, 'up')
  }
  canvas.addEventListener('touchstart', onDown, { passive: false })
  canvas.addEventListener('touchmove', onMove, { passive: false })
  canvas.addEventListener('touchend', onUp)
  canvas.addEventListener('mousedown', onDown)
  canvas.addEventListener('mousemove', onMove)
  canvas.addEventListener('mouseup', onUp)
}

function renderHomeWidget(): string {
  const s = buildHomeSummary(state.weather)
  const todos =
    s.todos.length > 0
      ? s.todos.map((t) => `<li>${escapeHtml(t)}</li>`).join('')
      : '<li class="muted">할 일 없음</li>'
  return `
    <div class="home-widget" data-home-widget="1">
      <div class="home-widget-top">
        <div>
          <p class="home-kicker">TODAY</p>
          <strong class="home-weather">${escapeHtml(s.weatherLine)}</strong>
        </div>
        <button type="button" class="ghost-btn tiny" data-action="open-share-app" aria-label="앱 공유">QR</button>
      </div>
      <div class="home-grid">
        <div>
          <span class="home-label">할 일</span>
          <ul class="home-todos">${todos}</ul>
        </div>
        <div>
          <span class="home-label">오늘 지출</span>
          <p class="home-value">${escapeHtml(s.spendLabel)}</p>
          <span class="home-label">다음 알림</span>
          <p class="home-value small">${escapeHtml(s.nextAlarm || '없음')}</p>
        </div>
      </div>
    </div>
  `
}

function renderShareModal(): string {
  if (!state.shareModal) return ''
  const title = state.shareModal === 'app' ? '앱 공유 QR' : '백업 QR / 공유'
  return `
    <div class="share-modal" role="dialog" aria-modal="true" aria-label="${title}" data-action="close-share-backdrop">
      <div class="share-sheet" data-share-sheet="1">
        <div class="share-sheet-head">
          <strong>${title}</strong>
          <button type="button" class="ghost-btn tiny" data-action="close-share">닫기</button>
        </div>
        <div class="share-qr">${state.shareQrSvg || '<p class="hint">QR 생성 중…</p>'}</div>
        <p class="hint share-hint">${escapeHtml(state.shareHint || appShareUrl())}</p>
        <div class="row-btns">
          ${
            state.shareModal === 'app'
              ? `
            <button type="button" class="primary-btn" data-action="share-app-native">공유하기</button>
            <button type="button" class="ghost-btn" data-action="copy-app-link">링크 복사</button>
          `
              : `
            <button type="button" class="primary-btn" data-action="share-backup-native">백업 공유</button>
            <button type="button" class="ghost-btn" data-action="export">파일 저장</button>
          `
          }
        </div>
      </div>
    </div>
  `
}

function renderChat(): string {
  const mode = loadInterpretMode()
  const body =
    state.messages.length === 0
      ? `
        <div class="hero-empty">
          <div class="big-orb"></div>
          <h2>JARVIS</h2>
          <p>아래 <strong>번역</strong> 버튼을 누르면<br/>스톱할 때까지 한국말만 그 언어로 번역합니다.</p>
          <div class="chips">
            ${SUGGESTIONS.map((s) => `<button type="button" data-suggest="${escapeAttr(s)}">${escapeHtml(s)}</button>`).join('')}
          </div>
        </div>
      `
      : state.messages
          .map(
            (m) => `
          <div class="msg ${m.role}">
            <span class="meta">${m.role === 'user' ? 'YOU' : 'JARVIS'}</span>
            ${escapeHtml(m.text)}
          </div>
        `,
          )
          .join('')

  const lockBar = `
    <div class="translate-bar ${mode.active ? 'on' : ''}">
      <div class="translate-bar-head">
        <strong>${mode.active ? `번역 중 → ${escapeHtml(mode.langB.toUpperCase())}` : '번역 잠금'}</strong>
        <span class="ver">v${APP_VERSION}</span>
      </div>
      <div class="translate-chips">
        ${TRANSLATE_LANGS.map(
          (l) =>
            `<button type="button" class="${mode.active && mode.langB === l.code ? 'active' : ''}" data-translate-cmd="${escapeAttr(l.cmd)}">${escapeHtml(l.label)}</button>`,
        ).join('')}
        <button type="button" class="stop-btn" data-translate-stop="1">스톱</button>
      </div>
      <p class="translate-hint">${
        mode.active
          ? 'MIC로 한국말만 하세요. 끝내려면 스톱을 누르세요.'
          : '언어 버튼 → 말한 뒤 스톱 · 홈요약·QR · v' + APP_VERSION
      }</p>
    </div>
  `

  return `
    <section class="panel chat-panel">
      ${renderHomeWidget()}
      <div class="messages">${body}</div>
      <div id="voice-caption" class="voice-caption ${state.listening ? 'live' : ''}" ${state.listening || state.voiceHint ? '' : 'hidden'}>${escapeHtml(
        state.listening ? state.voiceHint || '듣고 있습니다… 말씀해 주세요' : state.voiceHint,
      )}</div>
      ${lockBar}
      <form class="composer" id="composer">
        <button type="button" class="icon-btn ${state.listening ? 'listening' : ''}" data-action="mic" aria-label="음성 입력" aria-pressed="${state.listening ? 'true' : 'false'}">${state.listening ? 'STOP' : 'MIC'}</button>
        <input id="draft" type="text" enterkeyhint="send" autocomplete="off" placeholder="${
          mode.active ? '한국말로 입력 → 번역' : state.listening ? '음성 인식 중…' : '시세, 브리핑, 공유…'
        }" value="${escapeAttr(state.draft)}" ${state.busy ? 'disabled' : ''} />
        <button class="primary-btn" type="submit" ${state.busy ? 'disabled' : ''}>전송</button>
      </form>
      ${renderShareModal()}
    </section>
  `
}

function renderInvest(): string {
  const holdings = loadHoldings()
  const watch = loadWatchlist()
  const trades = loadTrades().slice(0, 8)

  return `
    <section class="panel view-scroll">
      <h2 class="section-title">INVEST</h2>
      <p class="hint">실시간 시세(Yahoo) · 포트폴리오 · 관심종목 · 매매노트. 투자 조언이 아닌 참고 도구입니다.</p>
      <div class="chips left">
        <button type="button" data-suggest="주식 종목 추천">냉정 추천</button>
        <button type="button" data-suggest="포트폴리오">포트폴리오 새로고침</button>
        <button type="button" data-suggest="관심종목 목록">관심 시세</button>
        <button type="button" data-suggest="장시간">장 시간</button>
        <button type="button" data-suggest="환율">환율</button>
      </div>

      <h2 class="section-title">HOLDINGS</h2>
      ${
        holdings.length === 0
          ? '<div class="empty">예: 대화에서 "보유 삼성전자 10주 평단 70000"</div>'
          : holdings
              .map((h) => {
                const q = state.quoteCache[h.symbol]
                const price = q?.price ?? h.avgPrice
                const pnl = (price - h.avgPrice) * h.shares
                const pnlPct = h.avgPrice ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0
                return `
                <div class="list-item">
                  <div class="body">
                    <strong>${escapeHtml(h.name)} <span class="tag">${escapeHtml(h.symbol)}</span></strong>
                    <p>${h.shares}주 · 평단 ${formatMoney(h.avgPrice, h.currency)}
                    ${q ? ` · 현재 ${formatMoney(q.price, q.currency)}` : ''}
                    <br/><span class="${pnl >= 0 ? 'up' : 'down'}">${pnl >= 0 ? '+' : ''}${formatMoney(pnl, h.currency)} (${pnlPct.toFixed(1)}%)</span></p>
                  </div>
                  <button type="button" data-del-holding="${escapeAttr(h.symbol)}">삭제</button>
                </div>`
              })
              .join('')
      }

      <h2 class="section-title">WATCHLIST</h2>
      ${
        watch.length === 0
          ? '<div class="empty">예: "관심종목 엔비디아 추가"</div>'
          : watch
              .map((w) => {
                const q = state.quoteCache[w.symbol]
                return `
                <div class="list-item">
                  <div class="body">
                    <strong>${escapeHtml(w.name)}</strong>
                    <p>${q ? escapeHtml(formatQuote(q).split('\n').slice(0, 2).join(' · ')) : escapeHtml(w.symbol)}
                    ${w.targetPrice ? `<br/>목표가 ${w.targetPrice}` : ''}</p>
                  </div>
                  <button type="button" data-quote="${escapeAttr(w.symbol)}">시세</button>
                  <button type="button" data-del-watch="${escapeAttr(w.symbol)}">삭제</button>
                </div>`
              })
              .join('')
      }

      <h2 class="section-title">TRADE NOTES</h2>
      ${
        trades.length === 0
          ? '<div class="empty">예: "삼성전자 매수아이디어 반도체 회복"</div>'
          : trades
              .map(
                (t) => `
          <div class="list-item">
            <div class="body">
              <strong>[${t.side}] ${escapeHtml(t.symbol)}</strong>
              <p>${escapeHtml(t.thesis)}</p>
            </div>
            <button type="button" data-del-trade="${t.id}">삭제</button>
          </div>`,
              )
              .join('')
      }
      <button type="button" class="ghost-btn" data-action="refresh-quotes">시세 새로고침</button>
    </section>
  `
}

function renderLife(): string {
  const shopping = loadShopping()
  const expenses = loadExpenses().slice(0, 8)
  const habits = loadHabits()
  const reminders = loadReminders().slice(0, 8)
  const memories = loadMemory().slice(0, 6)
  const totals = expenseTotals()
  const seriesList = loadSeriesList()
  const activeName = getActiveSeriesName()
  const active = seriesList.find((s) => s.name.toLowerCase() === activeName.toLowerCase())
  const activeStats = active && active.values.length ? formatDescriptive(active.name, active.values) : ''

  return `
    <section class="panel view-scroll">
      <h2 class="section-title">STATS</h2>
      <p class="hint">실시간으로 숫자를 넣으면 평균·분산·확률 등 통계 해답을 줍니다. 활성: <strong>${escapeHtml(activeName)}</strong> (n=${active?.values.length ?? 0})</p>
      <div class="chips left">
        <button type="button" data-suggest="통계">통계 분석</button>
        <button type="button" data-suggest="데이터셋 목록">데이터셋</button>
        <button type="button" data-suggest="통계 도움말">사용법</button>
        <button type="button" data-suggest="시세기록 삼성전자">시세 기록</button>
      </div>
      ${
        seriesList.length === 0
          ? '<div class="empty">예: 대화에서 "데이터 수익률 1.2 -0.5 3.1"</div>'
          : seriesList
              .slice(0, 8)
              .map((s) => {
                const preview = s.values.slice(-4).join(', ')
                return `
                <div class="list-item">
                  <div class="body">
                    <strong>${s.name === activeName ? '▶ ' : ''}${escapeHtml(s.name)} <span class="tag">n=${s.values.length}</span></strong>
                    <p>${preview ? escapeHtml(preview) : '비어 있음'}</p>
                  </div>
                  <button type="button" data-stats-use="${escapeAttr(s.name)}">분석</button>
                  <button type="button" data-del-series="${escapeAttr(s.name)}">삭제</button>
                </div>`
              })
              .join('')
      }
      ${activeStats ? `<pre class="stats-report">${escapeHtml(activeStats)}</pre>` : ''}

      <h2 class="section-title">LIFE</h2>
      <p class="hint">오늘 ${formatMoney(totals.today, 'KRW')} · 이번달 ${formatMoney(totals.month, 'KRW')}</p>
      <div class="chips left">
        <button type="button" data-suggest="브리핑">브리핑</button>
        <button type="button" data-suggest="환율">환율</button>
        <button type="button" data-suggest="커피 4500">커피 4500</button>
        <button type="button" data-suggest="알림 30분 뒤 약">30분 알림</button>
        <button type="button" data-suggest="장바구니 목록">장바구니</button>
        <button type="button" data-suggest="지출 현황">지출 현황</button>
      </div>

      <h2 class="section-title">TODO</h2>
      ${
        reminders.length === 0
          ? '<div class="empty">"할 일 운동하기" · "알림 30분 뒤 약"</div>'
          : reminders
              .map(
                (r) => `
          <div class="list-item">
            <button type="button" data-toggle-reminder="${r.id}">${r.done ? '✓' : '○'}</button>
            <div class="body"><strong style="${r.done ? 'opacity:.5;text-decoration:line-through' : ''}">${escapeHtml(r.text)}</strong>${
              r.when ? `<p class="hint">${escapeHtml(r.when)}</p>` : ''
            }</div>
            <button type="button" data-del-reminder="${r.id}">삭제</button>
          </div>`,
              )
              .join('')
      }

      <h2 class="section-title">SHOPPING</h2>
      ${
        shopping.length === 0
          ? '<div class="empty">"장바구니 우유 계란"</div>'
          : shopping
              .map(
                (s) => `
          <div class="list-item">
            <button type="button" data-toggle-shop="${s.id}">${s.done ? '✓' : '○'}</button>
            <div class="body"><strong style="${s.done ? 'opacity:.5;text-decoration:line-through' : ''}">${escapeHtml(s.name)}</strong></div>
            <button type="button" data-del-shop="${s.id}">삭제</button>
          </div>`,
              )
              .join('')
      }

      <h2 class="section-title">HABITS</h2>
      ${
        habits.length === 0
          ? '<div class="empty">"습관 추가 운동" → "습관 완료 운동"</div>'
          : habits
              .map(
                (h) => `
          <div class="list-item">
            <div class="body"><strong>${escapeHtml(h.name)}</strong><p>연속 ${h.streak}일 ${h.lastDone ? `· 최근 ${h.lastDone}` : ''}</p></div>
            <button type="button" data-del-habit="${h.id}">삭제</button>
          </div>`,
              )
              .join('')
      }

      <h2 class="section-title">EXPENSES</h2>
      ${
        expenses.length === 0
          ? '<div class="empty">"커피 4500" / "지출 택시 12000"</div>'
          : expenses
              .map(
                (e) => `
          <div class="list-item">
            <div class="body"><strong>${escapeHtml(e.category)} ${formatMoney(e.amount, 'KRW')}</strong><p>${escapeHtml(e.note || '')}</p></div>
            <button type="button" data-del-expense="${e.id}">삭제</button>
          </div>`,
              )
              .join('')
      }

      <h2 class="section-title">MEMORY</h2>
      ${
        memories.length === 0
          ? '<div class="empty">"기억해 와이파이는 cafe123"</div>'
          : memories
              .map(
                (m) => `
          <div class="list-item">
            <div class="body"><strong>${escapeHtml(m.key)}</strong><p>${escapeHtml(m.value)}</p></div>
            <button type="button" data-del-memory="${m.id}">삭제</button>
          </div>`,
              )
              .join('')
      }
    </section>
  `
}

function renderActions(): string {
  return `
    <section class="panel view-scroll">
      <h2 class="section-title">QUICK RUN</h2>
      <div class="action-grid">
        <button type="button" class="action-card" data-action="open-share-app">
          <span>QR</span>
          <span>앱 공유</span>
        </button>
        <button type="button" class="action-card" data-action="share-backup-native">
          <span>BK</span>
          <span>백업 공유</span>
        </button>
        ${quickActions
          .map(
            (a) => `
          <button type="button" class="action-card" data-quick="${a.id}">
            <span>${a.icon}</span>
            <span>${a.label}</span>
          </button>
        `,
          )
          .join('')}
      </div>
      ${renderShareModal()}
    </section>
  `
}

function renderSettings(): string {
  const s = state.settings
  return `
    <section class="panel view-scroll">
      <h2 class="section-title">SETTINGS</h2>
      <form class="settings-form" id="settings-form">
        <label>호칭
          <input name="displayName" value="${escapeAttr(s.displayName)}" />
        </label>
        <label>기본 도시
          <input name="city" value="${escapeAttr(s.city)}" placeholder="서울" />
        </label>
        <div class="toggle-row">
          <span>답변 읽어주기</span>
          <input type="checkbox" name="speakReplies" ${s.speakReplies ? 'checked' : ''} />
        </div>
        <label>OpenAI API Key (심화 분석용)
          <input name="apiKey" type="password" value="${escapeAttr(s.apiKey)}" placeholder="sk-..." autocomplete="off" />
        </label>
        <label>API Base
          <input name="apiBase" value="${escapeAttr(s.apiBase)}" />
        </label>
        <label>Model
          <input name="model" value="${escapeAttr(s.model)}" />
        </label>
        <button class="primary-btn" type="submit">설정 저장</button>
      </form>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="open-share-app">앱 QR 공유</button>
        <button type="button" class="ghost-btn" data-action="open-share-backup">백업 QR</button>
      </div>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="share-backup-native">백업 공유보내기</button>
        <button type="button" class="ghost-btn" data-action="export">파일 저장</button>
        <button type="button" class="ghost-btn" data-action="import">복원</button>
      </div>
      <p class="hint">백업 공유보내기: iPhone 공유 시트로 파일·iCloud·Drive·메일·메모에 저장할 수 있습니다. 전체 JSON이 크면 QR은 앱 링크·요약으로 대체됩니다.</p>
      <button type="button" class="ghost-btn" data-action="voice-test">음성 시스템 테스트</button>
      <button type="button" class="ghost-btn" data-action="clear-chat">대화 삭제</button>
      <p class="hint">시세는 Yahoo Finance 공개 차트 API를 사용합니다. 음성은 iPhone Safari + HTTPS에서 가장 안정적입니다. MIC를 누른 뒤 말씀하면 잠시 침묵 후 자동 전송됩니다.</p>
      ${renderShareModal()}
    </section>
  `
}

function render(): void {
  const app = document.getElementById('app')
  if (!app) return
  if (!state.locationReady) {
    app.innerHTML = renderLocationGate()
    bindLocationGate()
    return
  }
  const main =
    state.view === 'chat'
      ? renderChat()
      : state.view === 'invest'
        ? renderInvest()
        : state.view === 'life'
          ? renderLife()
          : state.view === 'games'
            ? renderGames()
            : state.view === 'actions'
              ? renderActions()
              : renderSettings()
  app.innerHTML = `${renderBrand()}${renderInstall()}${main}${renderNav()}`
  bind()
  if (state.view === 'games') {
    // remount after DOM ready
    requestAnimationFrame(() => mountActiveArcade())
  } else {
    stopArcade()
  }
}

function bindLocationGate(): void {
  document.querySelector('[data-action="allow-location"]')?.addEventListener('click', () => {
    void ensureLocation(true)
  })
}

async function ensureLocation(interactive: boolean): Promise<boolean> {
  if (!canUseGeolocation()) {
    state.locationError = '이 브라우저는 위치를 지원하지 않습니다. iPhone Safari를 사용해 주세요.'
    state.locationReady = false
    render()
    return false
  }
  state.locationBusy = true
  state.locationError = ''
  render()
  try {
    const perm = await queryPermissionState()
    if (perm === 'denied') {
      throw new Error('위치가 차단되어 있습니다. 설정 → 위치 서비스에서 JARVIS/Safari를 허용해 주세요.')
    }
    const fix = await requestLocation()
    state.lastFix = fix
    state.locationReady = true
    state.locationError = ''
    if (interactive) showFlash('위치 허용 완료')
    render()
    void refreshWeather()
    return true
  } catch (err) {
    state.locationReady = false
    state.locationError = err instanceof Error ? err.message : '위치 권한이 필요합니다.'
    render()
    return false
  } finally {
    state.locationBusy = false
    if (!state.locationReady) render()
  }
}

async function refreshQuotes(): Promise<void> {
  const symbols = [
    ...loadHoldings().map((h) => h.symbol),
    ...loadWatchlist().map((w) => w.symbol),
  ]
  await Promise.all(
    [...new Set(symbols)].map(async (sym) => {
      try {
        state.quoteCache[sym] = await fetchQuote(sym)
      } catch {
        state.quoteCache[sym] = null
      }
    }),
  )
  if (state.view === 'invest') render()
}

function bind(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      stopArcade()
      state.view = btn.dataset.view as View
      stopSpeaking()
      voice.stop()
      state.listening = false
      render()
      if (state.view === 'invest') void refreshQuotes()
    })
  })

  document.querySelector('[data-action="dismiss-install"]')?.addEventListener('click', () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, '1')
    state.showInstall = false
    render()
  })

  const composer = document.getElementById('composer') as HTMLFormElement | null
  const draft = document.getElementById('draft') as HTMLInputElement | null
  draft?.addEventListener('input', () => {
    state.draft = draft.value
  })
  composer?.addEventListener('submit', (e) => {
    e.preventDefault()
    void handleUserText(state.draft)
  })

  document.querySelectorAll<HTMLButtonElement>('[data-suggest]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = 'chat'
      void handleUserText(btn.dataset.suggest || '')
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-translate-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = 'chat'
      void handleUserText(btn.dataset.translateCmd || '')
    })
  })

  document.querySelector('[data-translate-stop]')?.addEventListener('click', () => {
    state.view = 'chat'
    if (loadInterpretMode().active) {
      void handleUserText('스톱')
    } else {
      clearInterpretMode()
      pushMsg('assistant', '번역이 꺼져 있습니다. 위에서 언어 버튼을 먼저 눌러 주세요.')
      render()
      scrollChat()
    }
  })

  // —— Arcade ——
  document.querySelectorAll<HTMLButtonElement>('[data-arcade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      stopArcade()
      state.arcadeId = btn.dataset.arcade as ArcadeId
      state.arcadeScore = 0
      render()
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.dir || '0,0'
      const [dx, dy] = raw.split(',').map(Number)
      arcade?.setDir?.(dx, dy)
    })
  })

  document.querySelector('[data-arcade-restart]')?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!arcade) {
      mountActiveArcade()
      return
    }
    arcade.restart()
    state.arcadeScore = 0
    const hud = document.querySelector('.arcade-hud')
    const best = loadArcadeBest()[state.arcadeId]
    if (hud) hud.textContent = `SCORE 0 · BEST ${best ?? '—'}`
  })

  document.querySelector('[data-action="mic"]')?.addEventListener('click', () => {
    // Never block MIC on TTS; only soft-block while thinking
    if (state.busy) {
      stopSpeaking()
      showFlash('답변 준비 중… 곧 MIC를 쓸 수 있습니다')
      return
    }
    if (!canListen()) {
      showFlash('이 브라우저는 음성 인식을 지원하지 않습니다. iPhone Safari를 사용해 주세요.')
      return
    }
    if (state.listening) {
      const partial = voice.transcript.trim()
      voice.stop()
      state.listening = false
      state.voiceHint = ''
      patchVoiceUi()
      if (partial) void handleUserText(partial)
      else render()
      return
    }
    stopSpeaking()
    state.draft = ''
    const listenLang = currentListenLang() || state.listenLang || 'ko-KR'
    state.listenLang = listenLang
    state.voiceHint = loadInterpretMode().active
      ? `통역 듣는 중 (${listenLang}) · 말씀 끝나면 잠시 기다려 주세요`
      : '듣고 있습니다… 천천히 말씀하세요 (끝나면 잠깐 대기)'
    // Ensure chat shell exists without heavy remount when already on chat
    if (state.view !== 'chat' || !document.getElementById('voice-caption')) {
      state.view = 'chat'
      state.listening = true
      render()
    } else {
      state.listening = true
      patchVoiceUi()
    }
    const ok = voice.start(
      {
        onInterim: (text) => {
          state.draft = text
          state.voiceHint = text || state.voiceHint
          patchVoiceUi()
        },
        onFinal: (text) => {
          state.listening = false
          state.voiceHint = '인식 완료'
          state.draft = text
          patchVoiceUi()
          void handleUserText(text)
        },
        onState: (s) => {
          state.listening = s === 'listening' || s === 'processing'
          if (s === 'idle' && !state.busy) state.listening = false
          patchVoiceUi()
        },
        onError: (err) => {
          state.listening = false
          state.voiceHint = ''
          showFlash(err)
          patchVoiceUi()
        },
      },
      listenLang,
    )
    if (!ok) {
      state.listening = false
      state.voiceHint = ''
      patchVoiceUi()
    }
  })

  document.querySelector('[data-action="voice-test"]')?.addEventListener('click', () => {
    const probe = probeVoiceSupport()
    const lines = [
      '【음성 시스템 점검】',
      probe.details,
      canListen() ? 'MIC 버튼을 눌러 실제 인식도 확인해 주세요.' : 'Safari(iPhone)에서 다시 열어 주세요.',
    ]
    showFlash(probe.recognition && probe.secureContext ? '음성 준비 완료' : '음성 환경 확인 필요')
    state.view = 'chat'
    pushMsg('assistant', lines.join('\n'))
    render()
  })

  document.querySelectorAll<HTMLButtonElement>('[data-quick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = quickActions.find((a) => a.id === btn.dataset.quick)
      if (!action) return
      showFlash(action.run().message)
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-del-memory]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteMemory(btn.dataset.delMemory || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-reminder]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteReminder(btn.dataset.delReminder || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-toggle-reminder]').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleReminder(btn.dataset.toggleReminder || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-shop]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteShopping(btn.dataset.delShop || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-toggle-shop]').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleShopping(btn.dataset.toggleShop || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-habit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteHabit(btn.dataset.delHabit || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-expense]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteExpense(btn.dataset.delExpense || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-holding]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeHolding(btn.dataset.delHolding || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-watch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeWatch(btn.dataset.delWatch || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-trade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteTrade(btn.dataset.delTrade || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-del-series]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteSeries(btn.dataset.delSeries || '')
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-stats-use]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = 'chat'
      void handleUserText(`통계 ${btn.dataset.statsUse || ''}`)
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-quote]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = 'chat'
      void handleUserText(`${btn.dataset.quote} 시세`)
    })
  })
  document.querySelector('[data-action="refresh-quotes"]')?.addEventListener('click', () => {
    void refreshQuotes().then(() => showFlash('시세를 갱신했습니다.'))
  })

  const settingsForm = document.getElementById('settings-form') as HTMLFormElement | null
  settingsForm?.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(settingsForm)
    const next: JarvisSettings = {
      displayName: String(fd.get('displayName') || '주인님').trim() || '주인님',
      speakReplies: Boolean(fd.get('speakReplies')),
      apiKey: String(fd.get('apiKey') || '').trim(),
      apiBase: String(fd.get('apiBase') || 'https://api.openai.com/v1').trim(),
      model: String(fd.get('model') || 'gpt-4o-mini').trim(),
      city: String(fd.get('city') || '서울').trim() || '서울',
    }
    state.settings = next
    saveSettings(next)
    showFlash('설정을 저장했습니다.')
    render()
  })

  document.querySelector('[data-action="export"]')?.addEventListener('click', () => {
    downloadBackupBlob()
    showFlash('백업을 내보냈습니다.')
  })

  document.querySelector('[data-action="share-backup-native"]')?.addEventListener('click', () => {
    void shareBackupFile().then((r) => showFlash(r.message))
  })

  document.querySelector('[data-action="share-app-native"]')?.addEventListener('click', () => {
    void shareAppLink().then((r) => showFlash(r.message))
  })

  document.querySelector('[data-action="copy-app-link"]')?.addEventListener('click', () => {
    void navigator.clipboard.writeText(appShareMessage()).then(
      () => showFlash('앱 링크를 복사했습니다.'),
      () => showFlash('복사에 실패했습니다.'),
    )
  })

  document.querySelector('[data-action="close-share"]')?.addEventListener('click', () => {
    state.shareModal = null
    state.shareQrSvg = ''
    render()
  })

  document.querySelector('[data-action="close-share-backdrop"]')?.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).dataset.action === 'close-share-backdrop') {
      state.shareModal = null
      state.shareQrSvg = ''
      render()
    }
  })

  document.querySelector('[data-action="open-share-app"]')?.addEventListener('click', () => {
    void openShareModal('app')
  })

  document.querySelector('[data-action="open-share-backup"]')?.addEventListener('click', () => {
    void openShareModal('backup')
  })

  document.querySelector('[data-action="import"]')?.addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return
      const result = importBackup(await file.text())
      state.settings = loadSettings()
      state.messages = loadChat()
      showFlash(result.message)
      render()
    })
    input.click()
  })

  document.querySelector('[data-action="clear-chat"]')?.addEventListener('click', () => {
    clearChat()
    state.messages = []
    showFlash('대화 기록을 삭제했습니다.')
    render()
  })
}

function boot(): void {
  state.messages = loadChat()
  state.settings = loadSettings()
  refreshInstallHint()
  registerShareModal(openShareModal)
  startAlarmScheduler()
  setAlarmUiHandler((alarm) => {
    pushMsg('assistant', `⏰ 알림: ${alarm.body}`)
    if (state.settings.speakReplies) {
      void speakAsync(`알림. ${alarm.body}`.slice(0, 160), 'ko-KR')
    }
    showFlash(`알림: ${alarm.body}`)
    if (state.locationReady) render()
  })
  void ensureNotificationPermission()
  window.addEventListener('online', () => {
    state.online = true
    if (state.locationReady) render()
  })
  window.addEventListener('offline', () => {
    state.online = false
    if (state.locationReady) render()
  })

  // Always require a fresh location grant on launch (standalone / Safari)
  void (async () => {
    const perm = await queryPermissionState()
    if (perm === 'granted' || wasLocationGranted()) {
      const ok = await ensureLocation(false)
      if (ok) void refreshWeather()
      if (!ok) render()
      return
    }
    state.locationReady = false
    render()
  })()
  render()
}

boot()
