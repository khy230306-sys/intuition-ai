import { t } from '../../i18n'
import type { MusicSession } from '../types'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function statusLabel(status: MusicSession['status']): string {
  switch (status) {
    case 'ready':
      return t('music.readyToPlay')
    case 'searching':
      return t('music.searching')
    case 'opened_external':
      return t('music.openedExternal')
    case 'paused':
      return t('music.paused')
    case 'stopped':
      return t('music.stopped')
    case 'playing':
      return t('music.playing')
    case 'error':
      return t('music.error')
    case 'unknown':
      return t('music.unknownStatus')
    default:
      return status
  }
}

function providerLabel(provider: string): string {
  const p = String(provider || '').toLowerCase()
  if (p.includes('youtube')) return 'YouTube'
  if (p.includes('spotify')) return 'Spotify'
  if (p.includes('apple')) return 'Apple Music'
  return provider || 'Music'
}

/** Compact foldable mini player above the composer (does not cover MIC/send). */
export function renderMusicMiniPlayer(session: MusicSession | null, visible: boolean): string {
  if (!visible || !session || session.status === 'idle') return ''
  const title = session.title || session.query || '—'
  const canOpen = Boolean(session.url)
  const sub =
    session.status === 'opened_external'
      ? `${providerLabel(session.provider)} ${statusLabel(session.status)}`
      : `${providerLabel(session.provider)} · ${statusLabel(session.status)}`
  return `
    <div class="music-mini" data-music-mini="1" role="region" aria-label="AIZIO Music">
      <div class="music-mini-main">
        <div class="music-mini-meta">
          <strong class="music-mini-title">${escapeHtml(title)}</strong>
          <span class="music-mini-sub">${escapeHtml(sub)}</span>
        </div>
        <button type="button" class="ghost-btn tiny music-mini-close" data-music-action="close" aria-label="${escapeHtml(t('music.close'))}">×</button>
      </div>
      <div class="music-mini-actions">
        ${
          canOpen
            ? `<button type="button" class="primary-btn tiny" data-music-action="play">${escapeHtml(t('music.play'))}</button>
               <button type="button" class="ghost-btn tiny" data-music-action="open">${escapeHtml(t('music.openInYoutube'))}</button>`
            : ''
        }
        <button type="button" class="ghost-btn tiny" data-music-action="pause">${escapeHtml(t('music.pause'))}</button>
        <button type="button" class="ghost-btn tiny" data-music-action="stop">${escapeHtml(t('music.stop'))}</button>
        <button type="button" class="ghost-btn tiny" data-music-action="next">${escapeHtml(t('music.next'))}</button>
      </div>
    </div>
  `
}

export function renderMusicPlayChip(playUrl: string | null | undefined, needsGesture?: boolean): string {
  if (!needsGesture || !playUrl) return ''
  return `<div class="music-play-chip">
    <button type="button" class="primary-btn tiny" data-music-action="play">${escapeHtml(t('music.play'))}</button>
    <button type="button" class="ghost-btn tiny" data-music-action="open">${escapeHtml(t('music.openInYoutube'))}</button>
  </div>`
}
