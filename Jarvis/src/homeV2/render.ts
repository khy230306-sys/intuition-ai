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
        <button type="button" class="home-v2-quick-btn" data-action="home-v2-quick" data-quick-id="navigate">
          <span class="home-v2-q-ico" aria-hidden="true">↗</span>
          <span>길안내</span>
        </button>
        <button type="button" class="home-v2-quick-btn" data-action="home-v2-quick" data-quick-id="schedule">
          <span class="home-v2-q-ico" aria-hidden="true">＋</span>
          <span>일정 추가</span>
        </button>
        <button type="button" class="home-v2-quick-btn" data-action="home-v2-quick" data-quick-id="weather">
          <span class="home-v2-q-ico" aria-hidden="true">☁</span>
          <span>날씨</span>
        </button>
      </div>

      <button type="button" class="home-v2-smart-card ${model.smartCard.kind === 'empty' ? 'is-empty' : ''}" data-action="home-v2-smart" data-smart-view="${escAttr(model.smartCard.targetView)}">
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

function moreItem(label: string, attrs: string): string {
  return `<li><button type="button" ${attrs}>${esc(label)}</button></li>`
}

export function renderHomeV2MoreSheet(): string {
  return `
    <div class="home-v2-more" data-home-v2-more="1" role="dialog" aria-label="전체 메뉴">
      <div class="home-v2-more-sheet">
        <div class="home-v2-more-head">
          <strong>전체</strong>
          <button type="button" class="ghost-btn tiny" data-action="home-v2-more-close">닫기</button>
        </div>
        <div class="home-v2-more-group">
          <h4>생활</h4>
          <ul class="home-v2-more-list">
            ${moreItem('길안내', 'data-action="home-v2-open-nav"')}
            ${moreItem('날씨', 'data-action="home-v2-quick" data-quick-id="weather"')}
            ${moreItem('음악', 'data-action="home-v2-music"')}
            ${moreItem('일정 · 할 일', 'data-view="life"')}
            ${moreItem('알림', 'data-view="life"')}
          </ul>
        </div>
        <div class="home-v2-more-group">
          <h4>소통</h4>
          <ul class="home-v2-more-list">
            ${moreItem('친구', 'data-view="friends"')}
            ${moreItem('가족', 'data-view="family"')}
            ${moreItem('번역', 'data-view="global"')}
          </ul>
        </div>
        <div class="home-v2-more-group">
          <h4>도구</h4>
          <ul class="home-v2-more-list">
            ${moreItem('투자', 'data-view="invest"')}
            ${moreItem('게임', 'data-view="games"')}
            ${moreItem('실행(액션)', 'data-view="actions"')}
            ${moreItem('설정', 'data-view="settings"')}
          </ul>
        </div>
        <div class="home-v2-more-group">
          <h4>지원</h4>
          <ul class="home-v2-more-list">
            ${moreItem('사용설명서', 'data-action="home-v2-guide"')}
            ${moreItem('API 키', 'data-view="settings"')}
            ${moreItem('진단', 'data-action="home-v2-goto-diag"')}
            ${moreItem('푸시 실기기 테스트', 'data-action="home-v2-goto-push"')}
            ${moreItem('디자인 전환 · 기존 홈', 'data-action="home-v2-set" data-home-variant="legacy"')}
          </ul>
        </div>
      </div>
    </div>
  `
}

export function renderNavigationSheet(opts?: {
  defaultMap?: string
  defaultTravel?: string
}): string {
  const map = opts?.defaultMap || 'system'
  const travel = opts?.defaultTravel || 'driving'
  const chips = [
    ['집', 'home'],
    ['회사', 'work'],
    ['가까운 주차장', 'parking'],
    ['가까운 주유소', 'gas'],
    ['가까운 병원', 'hospital'],
    ['가까운 약국', 'pharmacy'],
  ]
  return `
    <div class="home-v2-nav-sheet" data-nav-sheet="1" role="dialog" aria-label="길안내">
      <div class="home-v2-nav-sheet-panel">
        <div class="home-v2-more-head">
          <strong>길안내</strong>
          <button type="button" class="ghost-btn tiny" data-action="nav-sheet-close">닫기</button>
        </div>
        <p class="hint">어디로 안내할까요? 외부 지도 앱·웹으로 안전하게 연결합니다.</p>
        <label class="home-v2-nav-label">목적지
          <input type="text" id="nav-dest-input" class="home-v2-nav-input" placeholder="예: 울산역, 집, 가까운 약국" autocomplete="off" />
        </label>
        <div class="home-v2-nav-chips" aria-label="빠른 선택">
          ${chips
            .map(
              ([label, key]) =>
                `<button type="button" class="ghost-btn tiny" data-action="nav-chip" data-nav-chip="${key}">${esc(label)}</button>`,
            )
            .join('')}
        </div>
        <label class="home-v2-nav-label">이동수단
          <select id="nav-travel-select">
            <option value="driving" ${travel === 'driving' ? 'selected' : ''}>자동차</option>
            <option value="walking" ${travel === 'walking' ? 'selected' : ''}>도보</option>
            <option value="transit" ${travel === 'transit' ? 'selected' : ''}>대중교통</option>
            <option value="bicycling" ${travel === 'bicycling' ? 'selected' : ''}>자전거</option>
            <option value="unspecified" ${travel === 'unspecified' ? 'selected' : ''}>지정 없음</option>
          </select>
        </label>
        <label class="home-v2-nav-label">지도 앱
          <select id="nav-map-select">
            <option value="system" ${map === 'system' ? 'selected' : ''}>자동</option>
            <option value="apple" ${map === 'apple' ? 'selected' : ''}>Apple 지도</option>
            <option value="google" ${map === 'google' ? 'selected' : ''}>Google 지도</option>
            <option value="kakao" ${map === 'kakao' ? 'selected' : ''}>카카오맵</option>
            <option value="naver" ${map === 'naver' ? 'selected' : ''}>네이버지도</option>
          </select>
        </label>
        <button type="button" class="primary-btn" data-action="nav-sheet-start">길찾기 시작</button>
        <p class="hint">운전 중에는 화면을 조작하지 마세요. 경로 정확도는 지도 앱을 따릅니다.</p>
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
      <summary><strong>홈 화면 · 디자인 전환</strong></summary>
      <p class="hint">기본 홈은 HOME v2입니다. 기존 홈은 복구용으로 유지됩니다. 쿼리: <code>?home=v2</code> / <code>?home=legacy</code></p>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="home-v2-set" data-home-variant="legacy">기존 홈 보기</button>
        <button type="button" class="primary-btn" data-action="home-v2-set" data-home-variant="v2">HOME v2 보기</button>
      </div>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="home-v2-boot-default" data-home-variant="legacy">실행 시 기본: 기존</button>
        <button type="button" class="ghost-btn" data-action="home-v2-boot-default" data-home-variant="v2">실행 시 기본: v2</button>
        <button type="button" class="ghost-btn danger-btn" data-action="home-v2-reset-prefs">홈 화면 설정 초기화</button>
      </div>
      <p class="hint">현재 화면: <strong>${opts.active === 'v2' ? 'HOME v2' : '기존 홈'}</strong> · 부트 기본: <strong>${
        opts.bootDefault === 'v2' ? 'HOME v2' : '기존 홈'
      }</strong></p>
    </details>
  `
}
