import './style.css'
import './campus/ui/campus.css'
import { registerSW } from 'virtual:pwa-register'
import {
  getProviderSlot,
  hasAnyConfiguredProvider,
  updateProviderSlot,
  type HybridProviderId,
} from './ai-providers'
import { executeCampusIntent } from './campus/service'
import { parseCampusIntent } from './campus/nlu/campusIntent'
import { syncCampusNotifications } from './campus/notifications'
import { bindCampus, renderCampusShell } from './campus'
import { rehydrateAlarms } from './notify'

export const APP_VERSION = '1.0.0'
export const FIXED_APP_URL = 'https://aizio-campus.shipstatic.com'

type ChatMsg = { role: 'user' | 'bot'; text: string }

const state = {
  chatOpen: false,
  busy: false,
  draft: '',
  messages: [] as ChatMsg[],
}

function showFlash(msg: string): void {
  const el = document.getElementById('flash')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  window.setTimeout(() => el.classList.remove('show'), 2200)
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderChatSheet(): string {
  if (!state.chatOpen) return ''
  const openai = getProviderSlot('openai')
  const groq = getProviderSlot('groq')
  return `
    <div class="campus-chat-sheet" data-chat-sheet="1">
      <div class="campus-chat-panel" role="dialog" aria-label="Campus 대화">
        <div class="campus-chat-head">
          <strong>Campus 대화</strong>
          <button type="button" class="ghost-btn tiny" data-action="close-chat">닫기</button>
        </div>
        <div class="campus-settings-card">
          <p class="hint">AI 요약/문제생성용 키 (기기에만 저장). 없으면 시간표·과제 등 로컬 기능만 동작.</p>
          <form data-form="ai-keys">
            <label>OpenAI API Key
              <input name="openai" type="password" autocomplete="off" placeholder="${openai.apiKey ? '저장됨 · 변경 시 입력' : 'sk-...'}" />
            </label>
            <label>Groq API Key
              <input name="groq" type="password" autocomplete="off" placeholder="${groq.apiKey ? '저장됨 · 변경 시 입력' : 'gsk-...'}" />
            </label>
            <button class="ghost-btn tiny" type="submit">키 저장</button>
            <p class="hint">${hasAnyConfiguredProvider() ? 'AI 연결됨' : 'AI 미연결 · 로컬 기능만'}</p>
          </form>
        </div>
        <div class="campus-chat-log" id="chat-log">
          ${
            state.messages.length
              ? state.messages
                  .map((m) => `<div class="campus-chat-msg ${m.role}">${esc(m.text)}</div>`)
                  .join('')
              : `<div class="campus-chat-msg bot">예: 「월요일 10시부터 11시 반까지 자료구조 수업 넣어줘」 · 「오늘 수업 뭐야?」 · 「이번 주 과제」</div>`
          }
        </div>
        <form class="campus-chat-form" id="chat-form">
          <input id="chat-draft" enterkeyhint="send" autocomplete="off" placeholder="Campus에게…" value="${esc(state.draft)}" ${state.busy ? 'disabled' : ''} />
          <button class="primary-btn" type="submit" ${state.busy ? 'disabled' : ''}>전송</button>
        </form>
      </div>
    </div>`
}

function render(): void {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = `${renderCampusShell()}${renderChatSheet()}`
  bindCampus({
    onBack: () => {
      state.chatOpen = true
      render()
    },
    onFlash: showFlash,
  })
  bindChat()
  try {
    syncCampusNotifications()
  } catch {
    /* ignore */
  }
}

function bindChat(): void {
  document.querySelector('[data-action="close-chat"]')?.addEventListener('click', () => {
    state.chatOpen = false
    render()
  })
  document.querySelector('[data-chat-sheet]')?.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).getAttribute('data-chat-sheet') === '1') {
      state.chatOpen = false
      render()
    }
  })
  const keyForm = document.querySelector<HTMLFormElement>('[data-form="ai-keys"]')
  keyForm?.addEventListener('submit', (ev) => {
    ev.preventDefault()
    const fd = new FormData(keyForm)
    const openai = String(fd.get('openai') || '').trim()
    const groq = String(fd.get('groq') || '').trim()
    if (openai) updateProviderSlot('openai' as HybridProviderId, { apiKey: openai })
    if (groq) updateProviderSlot('groq' as HybridProviderId, { apiKey: groq })
    showFlash('API 키를 저장했습니다.')
    render()
  })
  const form = document.getElementById('chat-form') as HTMLFormElement | null
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    if (state.busy) return
    const input = document.getElementById('chat-draft') as HTMLInputElement | null
    const text = (input?.value || state.draft || '').trim()
    if (!text) return
    state.draft = ''
    state.messages.push({ role: 'user', text })
    state.busy = true
    render()
    try {
      const intent = parseCampusIntent(text)
      let reply: string
      if (intent) {
        const r = await executeCampusIntent(intent)
        reply = r.message
        if (r.openCampus) state.chatOpen = false
      } else {
        reply =
          'Campus 명령으로 이해하지 못했습니다. 예: 「오늘 수업 뭐야?」 · 「화요일 13시 마케팅 수업 넣어줘」 · 「캠퍼스 열어줘」'
      }
      state.messages.push({ role: 'bot', text: reply })
    } catch (e) {
      state.messages.push({
        role: 'bot',
        text: e instanceof Error ? e.message : '처리 중 오류',
      })
    } finally {
      state.busy = false
      render()
      const log = document.getElementById('chat-log')
      if (log) log.scrollTop = log.scrollHeight
    }
  })
}

function boot(): void {
  rehydrateAlarms()
  registerSW({ immediate: true })
  render()
  console.log(`AIZIO CAMPUS v${APP_VERSION} · ${FIXED_APP_URL}`)
  showFlash(`AIZIO CAMPUS v${APP_VERSION}`)
}

boot()
