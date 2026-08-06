/**
 * Conversation-focused shell — weather briefing on top, thread in the card zone,
 * composer docked below (matches Home hierarchy: weather → chat).
 */

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

export function renderChatShell(opts: {
  threadHtml: string
  draft: string
  busy: boolean
  listening: boolean
  translateActive: boolean
  translateLabel: string
  appVersion: string
  aboveThreadHtml?: string
  voiceHintHtml?: string
  composerExtraHtml?: string
  plusOpen?: boolean
  activeModeHtml?: string
}): string {
  const plus = opts.plusOpen
    ? `<div class="nav-chat-plus" data-chat-plus="1" role="menu">
        <button type="button" role="menuitem" data-action="home-v2-quick" data-quick-id="translate">번역하기</button>
        <button type="button" role="menuitem" data-view="schedule">일정</button>
        <button type="button" role="menuitem" data-view="family-helper">가족</button>
        <button type="button" role="menuitem" data-action="life-brief-open">브리핑</button>
        <button type="button" role="menuitem" data-action="clear-chat">대화 초기화</button>
      </div>`
    : ''

  return `
    <section class="panel home-v2-panel nav-chat-shell" data-nav-chat="1">
      <header class="nav-hub-head nav-chat-head">
        <h1 class="section-title">대화</h1>
        <p class="hint">생활비서 · 음성 · 번역 · 일정 명령을 여기에 말하세요 · v${esc(opts.appVersion)}</p>
      </header>
      ${opts.activeModeHtml || ''}
      <div class="nav-chat-top-stack">
        ${opts.aboveThreadHtml || ''}
      </div>
      <section class="nav-chat-thread-card" aria-label="대화창">
        <div class="messages chat-thread home-v2-thread" id="chat-thread">${opts.threadHtml}</div>
        ${opts.voiceHintHtml || ''}
      </section>
      <div class="home-v2-composer-wrap composer-dock nav-chat-composer">
        <button type="button" class="home-v2-translate-badge ${opts.translateActive ? 'on' : ''}" data-action="home-v2-translate" aria-label="번역 잠금">
          ${esc(opts.translateLabel)}
        </button>
        ${opts.composerExtraHtml || ''}
        ${plus}
        <form class="composer chat-composer home-v2-composer" id="composer">
          <button type="button" class="icon-btn ${opts.listening ? 'listening' : ''}" data-action="mic" aria-label="음성 입력" aria-pressed="${opts.listening ? 'true' : 'false'}">${opts.listening ? 'STOP' : '음성'}</button>
          <button type="button" class="icon-btn" data-view="ai-camera" data-action="open-ai-camera" aria-label="AI 카메라">카메라</button>
          <button type="button" class="icon-btn ${opts.plusOpen ? 'active' : ''}" data-action="chat-plus-toggle" aria-label="추가 메뉴" aria-expanded="${opts.plusOpen ? 'true' : 'false'}">+</button>
          <input id="draft" class="home-v2-draft" type="text" enterkeyhint="send" autocomplete="off" placeholder="${
            opts.translateActive ? '한국말로 입력 → 번역' : opts.listening ? '음성 인식 중…' : 'AIZIO에게 메시지…'
          }" value="${escAttr(opts.draft)}" ${opts.busy ? 'disabled' : ''} />
          <button class="primary-btn send-btn" type="submit" ${opts.busy ? 'disabled' : ''}>전송</button>
        </form>
      </div>
    </section>
  `
}
