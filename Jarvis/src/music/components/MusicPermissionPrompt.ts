import { t } from '../../i18n'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Reminder that mobile browsers block autoplay without a tap. */
export function renderMusicPermissionPrompt(): string {
  return `<p class="music-permission-hint hint">${escapeHtml(t('music.autoplayBlocked'))}</p>`
}
