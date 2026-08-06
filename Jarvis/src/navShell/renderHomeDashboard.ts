/**
 * Simplified Home — briefing, schedule peek, alerts, quick (≤6), recent (≤4).
 * Full chat lives on the 대화 tab.
 */

import type { HomeV2Model } from '../homeV2/model'
import { listVisibleQuickActions } from './quickActions'
import { listRecentFeatures } from './recentFeatures'

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

export function renderHomeDashboard(opts: {
  model: HomeV2Model
  briefingHtml?: string
  scheduleLines: Array<{ label: string; sub?: string }>
  alertLines: Array<{ label: string }>
  updateBanner?: string
  appVersion: string
}): string {
  const { model } = opts
  const weather = model.header.weatherLine
    ? `<span class="home-v2-weather">${esc(model.header.weatherLine)}</span>`
    : ''

  const quick = listVisibleQuickActions()
  const recent = listRecentFeatures()

  const hasSchedule = opts.scheduleLines.length > 0
  const hasAlerts = opts.alertLines.length > 0
  const emptyStart = !hasSchedule && !hasAlerts && model.summary.todoCount === 0

  const scheduleHtml = hasSchedule
    ? `<ul class="nav-home-list">${opts.scheduleLines
        .slice(0, 4)
        .map((l) => `<li><strong>${esc(l.label)}</strong>${l.sub ? ` <span class="hint">${esc(l.sub)}</span>` : ''}</li>`)
        .join('')}</ul>`
    : ''

  const alertsHtml = hasAlerts
    ? `<ul class="nav-home-list">${opts.alertLines
        .slice(0, 3)
        .map((l) => `<li>${esc(l.label)}</li>`)
        .join('')}</ul>`
    : ''

  const recentHtml =
    recent.length > 0
      ? `<div class="nav-home-recent" aria-label="최근 사용">
          <div class="nav-home-sec-head">
            <h2>최근 사용</h2>
            <button type="button" class="ghost-btn tiny" data-action="clear-recent-features">지우기</button>
          </div>
          <div class="nav-home-recent-row">
            ${recent
              .map(
                (f) =>
                  `<button type="button" class="ghost-btn tiny" data-feature-id="${escAttr(f.id)}" ${
                    f.action
                      ? `data-action="${escAttr(f.action)}" ${f.id === 'translate' ? 'data-quick-id="translate"' : ''}`
                      : `data-view="${escAttr(f.view)}"`
                  }>${esc(f.title)}</button>`,
              )
              .join('')}
          </div>
        </div>`
      : ''

  return `
    <section class="panel home-v2-panel nav-home-dash view-scroll" data-nav-home="1">
      <header class="home-v2-header">
        <div class="home-v2-header-text">
          <p class="home-v2-brand-mark">AIZIO</p>
          <h1 class="home-v2-greet">${esc(model.header.greeting)}</h1>
          <p class="home-v2-meta">
            <span>${esc(model.header.dateLine)}</span>
            ${weather}
            <span class="ver">v${esc(opts.appVersion)}</span>
          </p>
        </div>
      </header>

      ${opts.updateBanner ? `<div class="nav-home-banner" role="status">${esc(opts.updateBanner)}</div>` : ''}

      <form class="nav-home-ask" data-action-form="home-ask" id="home-ask-form">
        <label class="sr-only" for="home-ask-input">AIZIO에게 말하기</label>
        <input id="home-ask-input" name="q" type="text" enterkeyhint="send" autocomplete="off"
          placeholder="AIZIO에게 말하기…" />
        <button type="submit" class="primary-btn">대화</button>
        <button type="button" class="icon-btn" data-view="chat" data-action="mic-from-home" aria-label="음성">MIC</button>
      </form>

      ${opts.briefingHtml || ''}

      ${
        emptyStart
          ? `<div class="nav-home-empty">
              <p><strong>시작하기</strong></p>
              <p class="hint">아래 빠른 실행으로 일정·카메라·번역을 바로 쓰거나, 위 입력창에 말해 보세요.</p>
            </div>`
          : ''
      }

      ${
        hasSchedule
          ? `<section class="nav-home-card" data-home-card="schedule">
              <div class="nav-home-sec-head">
                <h2>가까운 일정</h2>
                <button type="button" class="ghost-btn tiny" data-view="schedule">전체</button>
              </div>
              ${scheduleHtml}
            </section>`
          : ''
      }

      ${
        hasAlerts
          ? `<section class="nav-home-card" data-home-card="alerts">
              <div class="nav-home-sec-head"><h2>중요한 알림</h2></div>
              ${alertsHtml}
            </section>`
          : ''
      }

      <section class="nav-home-card" data-home-card="quick">
        <div class="nav-home-sec-head">
          <h2>빠른 실행</h2>
          <button type="button" class="ghost-btn tiny" data-action="edit-quick-actions">편집</button>
        </div>
        <div class="home-v2-quick nav-home-quick" aria-label="빠른 실행">
          ${quick
            .map(
              (q) => `<button type="button" class="home-v2-quick-btn" data-nav-quick="${escAttr(q.id)}"
                data-quick-kind="${escAttr(q.kind)}" data-quick-payload="${escAttr(q.payload)}">
                <span class="home-v2-q-ico" aria-hidden="true">${esc(q.ico)}</span>
                <span class="home-v2-q-copy">
                  <span class="home-v2-q-title">${esc(q.title)}</span>
                  <span class="home-v2-q-sub">${esc(q.sub)}</span>
                </span>
              </button>`,
            )
            .join('')}
        </div>
      </section>

      ${recentHtml}
    </section>
  `
}
