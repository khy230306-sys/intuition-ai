import './style.css'
import { quickActions } from './actions'
import { think } from './brain'
import {
  INSTALL_DISMISS_KEY,
  clearChat,
  deleteMemory,
  deleteReminder,
  exportBackup,
  importBackup,
  loadChat,
  loadMemory,
  loadReminders,
  loadSettings,
  saveChat,
  saveSettings,
  toggleReminder,
} from './storage'
import type { ChatMessage, JarvisSettings, View } from './types'
import { VoiceListener, canListen, speak, stopSpeaking } from './voice'

const SUGGESTIONS = ['지금 몇 시야', '유튜브 열어', '도움말', '할 일 장보기', '서울 날씨']

const state = {
  view: 'chat' as View,
  messages: [] as ChatMessage[],
  draft: '',
  busy: false,
  listening: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  showInstall: false,
  settings: loadSettings(),
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

function pushMessage(role: ChatMessage['role'], text: string): ChatMessage {
  const msg: ChatMessage = { id: uid(), role, text, createdAt: Date.now() }
  state.messages.push(msg)
  saveChat(state.messages)
  return msg
}

async function handleUserText(raw: string): Promise<void> {
  const text = raw.trim()
  if (!text || state.busy) return
  state.busy = true
  state.draft = ''
  pushMessage('user', text)
  render()
  scrollChat()

  try {
    const history = state.messages.map((m) => ({ role: m.role, text: m.text }))
    const reply = await think(text, history.slice(0, -1))
    if (reply.action) {
      const result = await reply.action()
      if (result && 'message' in result && result.message && result.message !== reply.text) {
        pushMessage('assistant', `${reply.text}\n(${result.message})`)
      } else {
        pushMessage('assistant', reply.text)
      }
    } else {
      pushMessage('assistant', reply.text)
    }
    if (reply.speak !== false && state.settings.speakReplies) {
      speak(reply.text.replace(/\n+/g, '. ').slice(0, 220))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.'
    pushMessage('assistant', msg)
  } finally {
    state.busy = false
    render()
    scrollChat()
  }
}

function scrollChat(): void {
  const el = document.querySelector('.messages')
  if (el) el.scrollTop = el.scrollHeight
}

function renderBrand(): string {
  const status = state.listening ? '듣는 중' : state.busy ? '생각 중' : state.online ? '대기' : '오프라인'
  return `
    <header class="brand-bar">
      <div class="brand">
        <div class="orb" aria-hidden="true"></div>
        <div>
          <h1>JARVIS</h1>
          <p>만능 AI 비서 · ${state.settings.displayName}</p>
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
        Safari 공유 → <strong>홈 화면에 추가</strong>하면 앱처럼 실행됩니다.
      </div>
      <button type="button" data-action="dismiss-install" aria-label="닫기">×</button>
    </div>
  `
}

function renderNav(): string {
  const items: Array<{ id: View; label: string; ico: string }> = [
    { id: 'chat', label: '대화', ico: 'CHAT' },
    { id: 'actions', label: '실행', ico: 'RUN' },
    { id: 'memory', label: '기억', ico: 'MEM' },
    { id: 'settings', label: '설정', ico: 'SET' },
  ]
  return `
    <nav class="nav">
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
          <p>무엇을 도와드릴까요?<br />말하거나 입력해 주세요.</p>
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
      <form class="composer" id="composer">
        <button type="button" class="icon-btn ${state.listening ? 'listening' : ''}" data-action="mic" aria-label="음성 입력">${state.listening ? 'STOP' : 'MIC'}</button>
        <input id="draft" type="text" enterkeyhint="send" autocomplete="off" placeholder="명령 또는 질문..." value="${escapeAttr(state.draft)}" ${state.busy ? 'disabled' : ''} />
        <button class="primary-btn" type="submit" ${state.busy ? 'disabled' : ''}>전송</button>
      </form>
    </section>
  `
}

function renderActions(): string {
  return `
    <section class="panel view-scroll">
      <h2 class="section-title">QUICK RUN</h2>
      <p class="hint">자주 쓰는 앱과 기능을 원터치로 실행합니다.</p>
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

function renderMemory(): string {
  const memories = loadMemory()
  const reminders = loadReminders()
  return `
    <section class="panel view-scroll">
      <h2 class="section-title">REMINDERS</h2>
      ${
        reminders.length === 0
          ? '<div class="empty">할 일이 없습니다. 대화에서 "할 일 장보기"라고 말해 보세요.</div>'
          : reminders
              .map(
                (r) => `
          <div class="list-item">
            <button type="button" data-toggle-reminder="${r.id}" aria-label="완료 토글">${r.done ? '✓' : '○'}</button>
            <div class="body">
              <strong style="${r.done ? 'text-decoration:line-through;opacity:.55' : ''}">${escapeHtml(r.text)}</strong>
              <p>${new Date(r.createdAt).toLocaleString('ko-KR')}</p>
            </div>
            <button type="button" data-del-reminder="${r.id}">삭제</button>
          </div>
        `,
              )
              .join('')
      }
      <h2 class="section-title">MEMORY</h2>
      ${
        memories.length === 0
          ? '<div class="empty">기억이 없습니다. "기억해 와이파이는 1234"처럼 저장하세요.</div>'
          : memories
              .map(
                (m) => `
          <div class="list-item">
            <div class="body">
              <strong>${escapeHtml(m.key)}</strong>
              <p>${escapeHtml(m.value)}</p>
            </div>
            <button type="button" data-del-memory="${m.id}">삭제</button>
          </div>
        `,
              )
              .join('')
      }
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
          <input name="displayName" value="${escapeAttr(s.displayName)}" placeholder="주인님" />
        </label>
        <div class="toggle-row">
          <span>답변 읽어주기</span>
          <input type="checkbox" name="speakReplies" ${s.speakReplies ? 'checked' : ''} />
        </div>
        <label>OpenAI API Key (선택)
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
        <button type="button" class="ghost-btn" data-action="export">백업 내보내기</button>
        <button type="button" class="ghost-btn" data-action="import">백업 가져오기</button>
      </div>
      <button type="button" class="ghost-btn" data-action="clear-chat">대화 기록 삭제</button>
      <p class="hint">API 키 없이도 계산·기억·앱 실행·검색·날씨·번역 등 로컬 비서 기능을 사용할 수 있습니다. 키를 넣으면 자유 대화가 가능합니다.</p>
    </section>
  `
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

function render(): void {
  const app = document.getElementById('app')
  if (!app) return
  const main =
    state.view === 'chat'
      ? renderChat()
      : state.view === 'actions'
        ? renderActions()
        : state.view === 'memory'
          ? renderMemory()
          : renderSettings()

  app.innerHTML = `${renderBrand()}${renderInstall()}${main}${renderNav()}`
  bind()
}

function bind(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view as View
      stopSpeaking()
      voice.stop()
      state.listening = false
      render()
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
      void handleUserText(btn.dataset.suggest || '')
    })
  })

  document.querySelector('[data-action="mic"]')?.addEventListener('click', () => {
    if (!canListen()) {
      showFlash('Safari에서 마이크 권한을 허용해 주세요.')
      return
    }
    if (state.listening) {
      voice.stop()
      state.listening = false
      render()
      return
    }
    stopSpeaking()
    const ok = voice.start(
      (text, final) => {
        state.draft = text
        const input = document.getElementById('draft') as HTMLInputElement | null
        if (input) input.value = text
        if (final) {
          state.listening = false
          void handleUserText(text)
        }
      },
      (err) => {
        state.listening = false
        showFlash(err)
        render()
      },
    )
    state.listening = ok
    render()
  })

  document.querySelectorAll<HTMLButtonElement>('[data-quick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = quickActions.find((a) => a.id === btn.dataset.quick)
      if (!action) return
      const result = action.run()
      showFlash(result.message)
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
      const text = await file.text()
      const result = importBackup(text)
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
