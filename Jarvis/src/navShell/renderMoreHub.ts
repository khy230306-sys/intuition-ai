/**
 * More hub — searchable feature catalog. Settings/diagnostics live here.
 */

import {
  GROUP_LABELS,
  searchFeatures,
  userVisibleFeatures,
  type FeatureEntry,
  type FeatureGroup,
} from './featureCatalog'
import { shouldShowInstallButton } from '../pwaInstall'

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

function renderFeatureBtn(f: FeatureEntry): string {
  let attrs = `data-feature-id="${escAttr(f.id)}"`
  if (f.id === 'translate') {
    attrs += ` data-action="home-v2-quick" data-quick-id="translate"`
  } else if (f.action) {
    attrs += ` data-action="${escAttr(f.action)}"`
  } else {
    attrs += ` data-view="${escAttr(f.view)}"`
  }
  return `<li><button type="button" class="nav-more-item" ${attrs}>
    <strong>${esc(f.title)}</strong>
    <span class="hint">${esc(f.description)}</span>
  </button></li>`
}

const GROUP_ORDER: FeatureGroup[] = ['ai', 'schedule', 'family', 'lifeos', 'space', 'tools', 'leisure', 'settings']

export function renderMoreHub(opts: {
  query: string
  appVersion: string
}): string {
  const q = opts.query.trim()
  const results = q ? searchFeatures(q) : null
  let showInstall = false
  try {
    showInstall = typeof window !== 'undefined' && shouldShowInstallButton()
  } catch {
    showInstall = false
  }

  let body = ''
  if (results) {
    body =
      results.length > 0
        ? `<ul class="nav-more-list">${results.map(renderFeatureBtn).join('')}</ul>`
        : `<p class="hint">「${esc(q)}」에 맞는 앱 기능이 없어요. 다른 단어로 검색해 보세요.</p>`
  } else {
    body = GROUP_ORDER.map((g) => {
      const items = userVisibleFeatures().filter((f) => f.group === g)
      if (!items.length) return ''
      return `<div class="nav-more-group">
        <h3 class="subsection-title">${esc(GROUP_LABELS[g])}</h3>
        <ul class="nav-more-list">${items.map(renderFeatureBtn).join('')}</ul>
      </div>`
    }).join('')
  }

  return `
    <section class="panel view-scroll nav-more-hub" data-nav-more="1">
      <header class="nav-hub-head">
        <h1 class="section-title">더보기</h1>
        <p class="hint">앱 안 기능만 검색합니다 · v${esc(opts.appVersion)}</p>
      </header>
      <label class="nav-more-search">
        <span class="sr-only">기능 검색</span>
        <input type="search" id="nav-more-q" data-nav-more-q="1" placeholder="알림, 번역, 카메라, 백업…" value="${escAttr(q)}" autocomplete="off" />
      </label>
      ${body}
      <div class="nav-more-group">
        <h3 class="subsection-title">바로가기</h3>
        <ul class="nav-more-list">
          <li><button type="button" class="nav-more-item" data-view="settings"><strong>설정 · AI · 업데이트</strong><span class="hint">Provider · API 키 · 알림 · 진단</span></button></li>
          ${showInstall ? `<li><button type="button" class="nav-more-item" data-action="install-show-guide"><strong>홈 화면 설치</strong><span class="hint">아이폰·안드로이드</span></button></li>` : ''}
          <li><button type="button" class="nav-more-item" data-action="export-menu-json"><strong>메뉴 구조 JSON 내보내기</strong><span class="hint">진단용</span></button></li>
          <li><button type="button" class="nav-more-item" data-action="run-menu-audit"><strong>메뉴 접근성 검사</strong><span class="hint">깨진 링크 · 중복</span></button></li>
        </ul>
      </div>
    </section>
  `
}
