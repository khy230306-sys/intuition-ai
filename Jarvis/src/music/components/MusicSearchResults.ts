import { t } from '../../i18n'
import { sanitizeMusicTitle } from '../musicSearch'
import type { MusicSearchResult } from '../types'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Optional compact list — titles escaped; URLs never injected as raw HTML href from untrusted input without validation upstream. */
export function renderMusicSearchResults(results: MusicSearchResult[]): string {
  if (!results.length) {
    return `<p class="hint">${escapeHtml(t('music.noResults'))}</p>`
  }
  return `<ul class="music-results">
    ${results
      .map(
        (r) => `<li>
      <span>${escapeHtml(sanitizeMusicTitle(r.title))}</span>
      <button type="button" class="ghost-btn tiny" data-music-action="play" data-music-url="${escapeHtml(r.url)}">${escapeHtml(t('music.play'))}</button>
    </li>`,
      )
      .join('')}
  </ul>`
}
