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
  exportBackup,
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

const SUGGESTIONS = [
  '주식 종목 추천',
  '프랑스 정보',
  '도쿄 시차',
  '브리핑',
  '도움말',
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
}

const voice = new VoiceListener()

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
    const reply = await think(text, history.slice(0, -1))
    if (reply.action) {
      const result = await reply.action()
      if (result && 'message' in result && result.message && result.message !== reply.text) {
        pushMsg('assistant', `${reply.text}\n(${result.message})`)
      } else {
        pushMsg('assistant', reply.text)
      }
    } else {
      pushMsg('assistant', reply.text)
    }
    // Release busy BEFORE TTS so MIC is usable immediately
    state.busy = false
    render()
    scrollChat()
    if (reply.speak !== false && state.settings.speakReplies) {
      void speakAsync(reply.text.replace(/\n+/g, '. ').slice(0, 180))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.'
    pushMsg('assistant', msg)
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
  const status = state.listening ? '듣는 중' : state.busy ? '분석 중' : state.online ? '대기' : '오프라인'
  return `
    <header class="brand-bar">
      <div class="brand">
        <div class="orb" aria-hidden="true"></div>
        <div>
          <h1>JARVIS</h1>
          <p>만능·투자 AI 비서 · ${escapeHtml(state.settings.displayName)}</p>
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
        Safari 공유 → <strong>홈 화면에 추가</strong>
      </div>
      <button type="button" data-action="dismiss-install" aria-label="닫기">×</button>
    </div>
  `
}

function renderNav(): string {
  const items: Array<{ id: View; label: string; ico: string }> = [
    { id: 'chat', label: '대화', ico: 'CHAT' },
    { id: 'invest', label: '투자', ico: 'INV' },
    { id: 'life', label: '생활', ico: 'LIFE' },
    { id: 'actions', label: '실행', ico: 'RUN' },
    { id: 'settings', label: '설정', ico: 'SET' },
  ]
  return `
    <nav class="nav nav-5">
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

function renderChat(): string {
  const body =
    state.messages.length === 0
      ? `
        <div class="hero-empty">
          <div class="big-orb"></div>
          <h2>JARVIS</h2>
          <p>실생활 + 주식 투자까지.<br />브리핑부터 시세·포트폴리오를 물어보세요.</p>
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

  return `
    <section class="panel chat-panel">
      <div class="messages">${body}</div>
      <div id="voice-caption" class="voice-caption ${state.listening ? 'live' : ''}" ${state.listening || state.voiceHint ? '' : 'hidden'}>${escapeHtml(
        state.listening ? state.voiceHint || '듣고 있습니다… 말씀해 주세요' : state.voiceHint,
      )}</div>
      <form class="composer" id="composer">
        <button type="button" class="icon-btn ${state.listening ? 'listening' : ''}" data-action="mic" aria-label="음성 입력" aria-pressed="${state.listening ? 'true' : 'false'}">${state.listening ? 'STOP' : 'MIC'}</button>
        <input id="draft" type="text" enterkeyhint="send" autocomplete="off" placeholder="${state.listening ? '음성 인식 중…' : '시세, 브리핑, 명령...'}" value="${escapeAttr(state.draft)}" ${state.busy ? 'disabled' : ''} />
        <button class="primary-btn" type="submit" ${state.busy ? 'disabled' : ''}>전송</button>
      </form>
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
        <button type="button" data-suggest="장바구니 목록">장바구니</button>
        <button type="button" data-suggest="지출 현황">지출 현황</button>
      </div>

      <h2 class="section-title">TODO</h2>
      ${
        reminders.length === 0
          ? '<div class="empty">"할 일 운동하기"</div>'
          : reminders
              .map(
                (r) => `
          <div class="list-item">
            <button type="button" data-toggle-reminder="${r.id}">${r.done ? '✓' : '○'}</button>
            <div class="body"><strong style="${r.done ? 'opacity:.5;text-decoration:line-through' : ''}">${escapeHtml(r.text)}</strong></div>
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
          ? '<div class="empty">"지출 커피 4500원"</div>'
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
        <button type="button" class="ghost-btn" data-action="export">백업</button>
        <button type="button" class="ghost-btn" data-action="import">복원</button>
      </div>
      <button type="button" class="ghost-btn" data-action="voice-test">음성 시스템 테스트</button>
      <button type="button" class="ghost-btn" data-action="clear-chat">대화 삭제</button>
      <p class="hint">시세는 Yahoo Finance 공개 차트 API를 사용합니다. 음성은 iPhone Safari + HTTPS에서 가장 안정적입니다. MIC를 누른 뒤 말씀하면 잠시 침묵 후 자동 전송됩니다.</p>
    </section>
  `
}

function render(): void {
  const app = document.getElementById('app')
  if (!app) return
  const main =
    state.view === 'chat'
      ? renderChat()
      : state.view === 'invest'
        ? renderInvest()
        : state.view === 'life'
          ? renderLife()
          : state.view === 'actions'
            ? renderActions()
            : renderSettings()
  app.innerHTML = `${renderBrand()}${renderInstall()}${main}${renderNav()}`
  bind()
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
    state.voiceHint = '듣고 있습니다… 바로 말씀해 주세요'
    // Ensure chat shell exists without heavy remount when already on chat
    if (state.view !== 'chat' || !document.getElementById('voice-caption')) {
      state.view = 'chat'
      state.listening = true
      render()
    } else {
      state.listening = true
      patchVoiceUi()
    }
    const ok = voice.start({
      onInterim: (text) => {
        state.draft = text
        state.voiceHint = text || '듣고 있습니다…'
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
        if (s === 'listening' && !state.voiceHint) state.voiceHint = '듣고 있습니다… 바로 말씀해 주세요'
        if (s === 'idle' && !state.busy) state.listening = false
        patchVoiceUi()
      },
      onError: (err) => {
        state.listening = false
        state.voiceHint = ''
        showFlash(err)
        patchVoiceUi()
      },
    })
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
    const blob = new Blob([exportBackup()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jarvis-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showFlash('백업을 내보냈습니다.')
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
  window.addEventListener('online', () => {
    state.online = true
    render()
  })
  window.addEventListener('offline', () => {
    state.online = false
    render()
  })
  render()
}

boot()
