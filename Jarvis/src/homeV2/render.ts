/**
 * Pure HTML renderers for HOME v2 (no DOM side effects).
 */

import type { HomeV2Model } from './model'
import type { HomeVariant } from './prefs'
import { getHomeSpaceInbox } from '../spaceInbox'

export type HomeV2Pane = 'home' | 'thread'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escAttr(s: string): string {
  return esc(s).replace(/'/g, '&#39;')
}

export function renderHomeV2Chrome(active: HomeVariant): string {
  return `
    <div class="home-v2-chrome" data-home-v2-chrome="1">
      <span class="home-v2-badge">HOME v2 미리보기</span>
      <div class="home-v2-chrome-btns">
        <button type="button" class="ghost-btn tiny ${active === 'legacy' ? 'active' : ''}" data-action="home-v2-set" data-home-variant="legacy">기존 홈으로</button>
        <button type="button" class="ghost-btn tiny ${active === 'v2' ? 'active' : ''}" data-action="home-v2-set" data-home-variant="v2">HOME v2</button>
        <button type="button" class="ghost-btn tiny" data-action="home-v2-feedback" title="검토 메모">의견</button>
      </div>
    </div>
  `
}

export function renderHomeV2Shell(model: HomeV2Model, opts: {
  draft: string
  busy: boolean
  listening: boolean
  appVersion: string
  /** Optional HTML above composer (e.g. music mini player) */
  composerExtraHtml?: string
}): string {
  const vs = model.voiceState
  const weather = model.header.weatherLine
    ? `<span class="home-v2-weather">${esc(model.header.weatherLine)}</span>`
    : ''
  const cardItems =
    model.smartCard.items.length > 0
      ? `<ul class="home-v2-card-list">${model.smartCard.items
          .map((it) => `<li>${esc(it.label)}</li>`)
          .join('')}</ul>`
      : `<p class="home-v2-card-empty">여유로운 하루예요</p>`

  return `
    <section class="panel home-v2-panel" data-home-v2="1">
      ${renderHomeV2Chrome('v2')}
      <header class="home-v2-header">
        <div class="home-v2-header-text">
          <h1 class="home-v2-greet">${esc(model.header.greeting)}</h1>
          <p class="home-v2-meta">
            <span>${esc(model.header.dateLine)}</span>
            ${weather}
          </p>
          ${
            model.header.greeting === '안녕하세요'
              ? '<p class="home-v2-sub">오늘도 무엇을 도와드릴까요?</p>'
              : ''
          }
        </div>
        <button type="button" class="ghost-btn tiny home-v2-settings" data-view="settings" aria-label="설정">설정</button>
      </header>

      <div class="home-v2-summary" role="group" aria-label="오늘 요약">
        <button type="button" class="home-v2-sum-item" data-action="home-v2-go" data-home-go="todos">
          <span class="home-v2-sum-label">오늘 할 일</span>
          <strong>${model.summary.todoCount}</strong>
        </button>
        <button type="button" class="home-v2-sum-item" data-action="home-v2-go" data-home-go="alarms">
          <span class="home-v2-sum-label">다음 알림</span>
          <strong class="home-v2-sum-sm">${esc(model.summary.nextAlarmLabel.replace(/^다음 알림\s*/, '') || '없음')}</strong>
        </button>
        <button type="button" class="home-v2-sum-item" data-action="home-v2-go" data-home-go="messages">
          <span class="home-v2-sum-label">새 메시지</span>
          <strong>${model.summary.unreadMessages}</strong>
        </button>
      </div>

      <div class="home-v2-voice" data-voice-state="${escAttr(vs)}">
        <button type="button"
          class="home-v2-orb ${opts.listening ? 'listening' : ''} ${opts.busy ? 'busy' : ''}"
          data-action="mic"
          data-home-v2-orb="1"
          aria-label="AIZIO 음성 입력"
          aria-pressed="${opts.listening ? 'true' : 'false'}">
          <span class="home-v2-orb-ring" aria-hidden="true"></span>
          <span class="home-v2-orb-core">A</span>
        </button>
        <p class="home-v2-brand">AIZIO</p>
        <p class="home-v2-prompt" id="voice-caption" data-home-v2-prompt="1">${esc(model.prompt)}</p>
      </div>

      <div class="home-v2-composer-wrap composer-dock">
        <button type="button" class="home-v2-translate-badge ${model.translate.active ? 'on' : ''}" data-action="home-v2-translate" aria-label="번역 잠금">
          ${esc(model.translate.label)} <span class="ver">v${esc(opts.appVersion)}</span>
        </button>
        ${opts.composerExtraHtml || ''}
        <form class="composer chat-composer home-v2-composer" id="composer">
          <button type="button" class="icon-btn ${opts.listening ? 'listening' : ''}" data-action="mic" aria-label="음성 입력" aria-pressed="${opts.listening ? 'true' : 'false'}">${opts.listening ? 'STOP' : 'MIC'}</button>
          <input id="draft" class="home-v2-draft" type="text" enterkeyhint="send" autocomplete="off" placeholder="${
            model.translate.active ? '한국말로 입력 → 번역' : opts.listening ? '음성 인식 중…' : 'AIZIO에게 메시지…'
          }" value="${escAttr(opts.draft)}" ${opts.busy ? 'disabled' : ''} />
          <button class="primary-btn send-btn" type="submit" ${opts.busy ? 'disabled' : ''}>전송</button>
        </form>
      </div>

      <div class="home-v2-quick" aria-label="빠른 실행">
        <button type="button" class="home-v2-quick-btn" data-action="home-v2-quick" data-quick-id="briefing">
          <span class="home-v2-q-ico" aria-hidden="true">◎</span>
          <span>브리핑</span>
        </button>
        <button type="button" class="home-v2-quick-btn" data-action="home-v2-quick" data-quick-id="schedule">
          <span class="home-v2-q-ico" aria-hidden="true">＋</span>
          <span>일정 추가</span>
        </button>
        <button type="button" class="home-v2-quick-btn" data-action="home-v2-quick" data-quick-id="weather">
          <span class="home-v2-q-ico" aria-hidden="true">☁</span>
          <span>날씨</span>
        </button>
        <button type="button" class="home-v2-quick-btn" data-action="home-v2-quick" data-quick-id="music">
          <span class="home-v2-q-ico" aria-hidden="true">♪</span>
          <span>음악</span>
        </button>
      </div>

      <button type="button" class="home-v2-smart-card" data-action="home-v2-smart" data-smart-view="${escAttr(model.smartCard.targetView)}">
        <div class="home-v2-card-head">
          <strong>${esc(model.smartCard.title)}</strong>
          <span class="home-v2-card-go">열기</span>
        </div>
        ${cardItems}
      </button>
    </section>
  `
}

export function renderHomeV2NavWithPane(
  activeView: string,
  pane: 'home' | 'thread',
  moreOpen: boolean,
): string {
  const inbox = getHomeSpaceInbox()
  const famBadge = inbox.family.unread || 0
  const rows: Array<{ key: string; label: string; ico: string; badge?: number; attrs: string; active: boolean }> = [
    {
      key: 'home',
      label: '홈',
      ico: '홈',
      attrs: 'data-action="home-v2-nav-home"',
      active: activeView === 'chat' && pane === 'home' && !moreOpen,
    },
    {
      key: 'thread',
      label: '대화',
      ico: '대화',
      attrs: 'data-action="home-v2-nav-thread"',
      active: activeView === 'chat' && pane === 'thread' && !moreOpen,
    },
    {
      key: 'life',
      label: '생활',
      ico: '생활',
      attrs: 'data-view="life"',
      active: activeView === 'life' && !moreOpen,
    },
    {
      key: 'family',
      label: '가족',
      ico: '가족',
      badge: famBadge || undefined,
      attrs: 'data-view="family"',
      active: activeView === 'family' && !moreOpen,
    },
    {
      key: 'more',
      label: '전체',
      ico: '전체',
      attrs: 'data-action="home-v2-nav-more"',
      active: moreOpen,
    },
  ]
  return `
    <nav class="nav home-v2-nav" data-home-v2-nav="1">
      ${rows
        .map((i) => {
          const badge =
            i.badge && i.badge > 0
              ? `<span class="nav-badge">${i.badge > 99 ? '99+' : i.badge}</span>`
              : ''
          return `
          <button type="button" ${i.attrs} class="${i.active ? 'active' : ''}">
            <span class="nav-ico">${i.ico}${badge}</span>
            <span>${i.label}</span>
          </button>`
        })
        .join('')}
    </nav>
  `
}

export function renderHomeV2MoreSheet(): string {
  const links: Array<{ label: string; view?: string; action?: string; hint?: string }> = [
    { label: '투자', view: 'invest' },
    { label: '친구', view: 'friends' },
    { label: '번역', view: 'global' },
    { label: '게임', view: 'games' },
    { label: '실행(액션)', view: 'actions' },
    { label: 'API 키 · 설정', view: 'settings', hint: '하이브리드 AI / OpenAI' },
    { label: '사용설명서', action: 'home-v2-guide' },
    { label: '푸시 실기기 테스트', view: 'settings', action: 'home-v2-goto-push' },
    { label: '진단', view: 'settings', action: 'home-v2-goto-diag' },
    { label: '기존 홈으로', action: 'home-v2-set', hint: 'legacy' },
  ]
  return `
    <div class="home-v2-more" data-home-v2-more="1" role="dialog" aria-label="전체 메뉴">
      <div class="home-v2-more-sheet">
        <div class="home-v2-more-head">
          <strong>전체</strong>
          <button type="button" class="ghost-btn tiny" data-action="home-v2-more-close">닫기</button>
        </div>
        <ul class="home-v2-more-list">
          ${links
            .map((l) => {
              if (l.action === 'home-v2-set') {
                return `<li><button type="button" data-action="home-v2-set" data-home-variant="legacy">${esc(l.label)}</button></li>`
              }
              if (l.action === 'home-v2-guide') {
                return `<li><button type="button" data-action="home-v2-guide">${esc(l.label)}</button></li>`
              }
              if (l.action === 'home-v2-goto-push' || l.action === 'home-v2-goto-diag') {
                return `<li><button type="button" data-action="${l.action}">${esc(l.label)}</button></li>`
              }
              return `<li><button type="button" data-view="${l.view}">${esc(l.label)}${
                l.hint ? ` <span class="hint">${esc(l.hint)}</span>` : ''
              }</button></li>`
            })
            .join('')}
        </ul>
      </div>
    </div>
  `
}

export function renderDesignLabSection(opts: {
  active: HomeVariant
  bootDefault: HomeVariant
  visible: boolean
}): string {
  if (!opts.visible) return ''
  return `
    <details class="device-test-panel home-v2-lab" open data-home-v2-lab="1">
      <summary><strong>디자인 테스트 · HOME v2</strong></summary>
      <p class="hint">Preview 전용. 프로덕션 기본 홈은 변경되지 않습니다. 쿼리: <code>?home=v2</code> / <code>?home=legacy</code></p>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="home-v2-set" data-home-variant="legacy">기존 홈 보기</button>
        <button type="button" class="primary-btn" data-action="home-v2-set" data-home-variant="v2">HOME v2 보기</button>
      </div>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="home-v2-boot-default" data-home-variant="legacy">실행 시 기본: 기존</button>
        <button type="button" class="ghost-btn" data-action="home-v2-boot-default" data-home-variant="v2">실행 시 기본: v2</button>
        <button type="button" class="ghost-btn danger-btn" data-action="home-v2-reset-prefs">HOME v2 설정 초기화</button>
      </div>
      <p class="hint">현재 화면: <strong>${opts.active === 'v2' ? 'HOME v2' : '기존 홈'}</strong> · 부트 기본: <strong>${
        opts.bootDefault === 'v2' ? 'HOME v2' : '기존 홈'
      }</strong></p>
    </details>
  `
}
