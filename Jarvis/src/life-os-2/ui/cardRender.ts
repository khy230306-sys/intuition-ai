import type { LifeOs2UiCard } from './cardTypes'
import { isAllowedLos2CardAction } from './uiActions'

/** Remaining focus minutes from plannedEndAt (resume-safe). */
export function focusRemainingMinutes(plannedEndAt: string, now = Date.now()): number {
  const end = Date.parse(plannedEndAt)
  if (!Number.isFinite(end)) return 0
  return Math.max(0, Math.round((end - now) / 60_000))
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escAttr(s: string): string {
  return esc(s).replace(/\n/g, ' ')
}

function statusLabel(status: LifeOs2UiCard['status']): string {
  switch (status) {
    case 'active':
      return '진행'
    case 'completed':
      return '완료'
    case 'partial':
      return '부분'
    case 'failed':
      return '실패'
    case 'cancelled':
      return '취소'
    case 'ready':
      return '준비'
    default:
      return '안내'
  }
}

/** Live remaining line for focus cards (timestamp-based). */
function focusLiveSummary(card: LifeOs2UiCard): string {
  if (card.type !== 'focus_session' || card.metadata.status !== 'active') return card.summary
  const end = String(card.metadata.plannedEndAt || '')
  if (!end) return card.summary
  const left = focusRemainingMinutes(end)
  const title = card.items[0]?.label || '집중'
  return `${title} · 약 ${left}분 남음`
}

export function renderLifeOs2CardsHtml(cards: LifeOs2UiCard[] | undefined | null): string {
  if (!cards?.length) return ''
  return `<div class="los2-cards" data-los2-cards="1" role="list">${cards.map(renderOneCard).join('')}</div>`
}

function renderOneCard(card: LifeOs2UiCard): string {
  const collapsed = card.collapsedByDefault !== false && Boolean(card.moreItems?.length)
  const summary = focusLiveSummary(card)
  const itemsHtml = card.items
    .map(
      (it) =>
        `<li class="los2-card-item"><span class="los2-card-item-label">${esc(it.label)}</span>${
          it.meta ? `<span class="los2-card-item-meta">${esc(it.meta)}</span>` : ''
        }${it.detail ? `<span class="los2-card-item-detail">${esc(it.detail)}</span>` : ''}</li>`,
    )
    .join('')
  const moreHtml = card.moreItems?.length
    ? `<ul class="los2-card-more" data-los2-more="${escAttr(card.id)}">${card.moreItems
        .map(
          (it) =>
            `<li class="los2-card-item"><span class="los2-card-item-label">${esc(it.label)}</span>${
              it.meta ? `<span class="los2-card-item-meta">${esc(it.meta)}</span>` : ''
            }${it.detail ? `<span class="los2-card-item-detail">${esc(it.detail)}</span>` : ''}</li>`,
        )
        .join('')}</ul>`
    : ''

  const actionsHtml = card.actions
    .filter((a) => isAllowedLos2CardAction(a.type))
    .map((a) => {
      const payload = a.payload ? encodeURIComponent(JSON.stringify(a.payload)) : ''
      return `<button type="button" class="los2-card-btn" data-los2-action="${escAttr(a.type)}" data-los2-card="${escAttr(
        card.id,
      )}" data-los2-payload="${escAttr(payload)}" aria-label="${escAttr(a.label)}">${esc(a.label)}</button>`
    })
    .join('')

  return `
    <article class="los2-card los2-card--${escAttr(card.type)} ${collapsed ? 'is-collapsed' : ''}" data-los2-card-root="${escAttr(
      card.id,
    )}" data-los2-type="${escAttr(card.type)}" role="listitem" aria-label="${escAttr(card.title)}">
      <header class="los2-card-head">
        <div class="los2-card-titles">
          <strong class="los2-card-title">${esc(card.title)}</strong>
          <span class="los2-card-status" data-status="${escAttr(card.status)}">${esc(statusLabel(card.status))}</span>
        </div>
        <p class="los2-card-summary">${esc(summary)}</p>
      </header>
      ${itemsHtml ? `<ul class="los2-card-items">${itemsHtml}</ul>` : ''}
      ${moreHtml}
      ${actionsHtml ? `<div class="los2-card-actions">${actionsHtml}</div>` : ''}
    </article>`
}
