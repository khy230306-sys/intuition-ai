import type { View } from '../types'
import { PRIMARY_TABS, primaryTabForView } from './primaryTabs'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 5-tab bottom navigation — icon label text together. */
export function renderPrimaryBottomNav(activeView: View | string, opts?: { hidden?: boolean }): string {
  if (opts?.hidden) return ''
  const active = primaryTabForView(activeView)
  return `
    <nav class="nav nav-5 aizio-primary-nav" data-primary-nav="1" aria-label="주요 메뉴">
      ${PRIMARY_TABS.map((t) => {
        const isOn = t.id === active
        return `<button type="button"
          class="${isOn ? 'active' : ''}"
          data-view="${esc(t.view)}"
          data-primary-tab="${esc(t.id)}"
          aria-current="${isOn ? 'page' : 'false'}">
          <span class="nav-ico" aria-hidden="true">${esc(t.ico)}</span>
          <span class="nav-label">${esc(t.label)}</span>
        </button>`
      }).join('')}
    </nav>
  `
}
