import { netStatusLabelKo, type NetStatus, onlineOnlyMessage } from './networkStatus'
import { pendingOutboxCount } from './outbox'
import {
  formatBytes,
  readShellReadyFlag,
  type ShellReadyReport,
} from './shellReady'
import { langPackStatusLabel, listLanguagePacks } from './langPacks'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Compact non-blocking status badge for brand / HOME. */
export function renderOfflineBadge(status: NetStatus): string {
  const label = netStatusLabelKo(status)
  const cls =
    status === 'online'
      ? 'ok'
      : status === 'degraded' || status === 'captive'
        ? 'warn'
        : status === 'checking'
          ? 'check'
          : 'off'
  return `<span class="aizio-net-badge aizio-net-${cls}" data-net-badge="1" title="네트워크 상태">${esc(label)}</span>`
}

/** Compact strip — never a full-screen error. */
export function renderOfflineStrip(status: NetStatus): string {
  if (status === 'online') return ''
  const title =
    status === 'checking'
      ? '연결 확인 중'
      : status === 'degraded'
        ? '제한된 연결'
        : status === 'captive'
          ? '로그인 필요 네트워크'
          : '오프라인 모드'
  return `
    <div class="aizio-offline-strip aizio-offline-strip-compact" data-offline-strip="1" role="status">
      <div class="aizio-offline-strip-copy">
        <strong>${esc(title)}</strong>
      </div>
      <div class="aizio-offline-strip-actions">
        <button type="button" class="ghost-btn tiny" data-action="offline-recheck">다시 확인</button>
      </div>
    </div>`
}

export function renderOfflineSettingsPanel(opts: {
  appVersion: string
  netStatus: NetStatus
  shell: ShellReadyReport | null
  storageBytes: number
}): string {
  const flag = readShellReadyFlag()
  const shell = opts.shell
  const ready = shell?.ready ?? flag.ready
  const pending = pendingOutboxCount()
  const packs = listLanguagePacks()
  const packRows = packs
    .map(
      (p) => `
      <li class="aizio-langpack-row">
        <div>
          <strong>${esc(p.label)}</strong>
          <span class="hint"> · ${esc(langPackStatusLabel(p.status))} · ${esc(p.sizeLabel)}</span>
          <p class="hint">${esc(p.note)}</p>
        </div>
      </li>`,
    )
    .join('')
  return `
    <details class="aizio-offline-panel" data-offline-panel="1" open>
      <summary><strong>오프라인 사용</strong></summary>
      <p class="hint">홈 화면에 추가한 뒤 온라인에서 한 번 완전히 열면, 비행기 모드에서도 앱 셸이 열리도록 준비합니다.</p>
      <ul class="aizio-offline-stats hint">
        <li>앱 셸 저장: <strong>${ready ? '완료' : '미완료'}</strong>${shell ? ` · ${esc(shell.detail)}` : ''}</li>
        <li>마지막 캐시 확인: ${esc(shell?.lastCheckedAt || flag.at || '—')}</li>
        <li>현재 앱 버전: v${esc(opts.appVersion)}</li>
        <li>오프라인 실행 가능: <strong>${ready ? '예' : '아니오'}</strong></li>
        <li>네트워크: ${esc(netStatusLabelKo(opts.netStatus))}</li>
        <li>로컬 저장소(대략): ${esc(formatBytes(opts.storageBytes))}</li>
        <li>대기 중 작업: ${pending}</li>
        <li>저장된 지도 지역: 없음 (자동 타일 저장 안 함)</li>
        <li>SW 제어: ${shell?.controlled ? '예' : '아니오'} · ready ${shell?.swReady ? '예' : '아니오'}</li>
      </ul>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="offline-verify-shell">오프라인 준비 확인</button>
        <button type="button" class="ghost-btn" data-action="offline-warm-shell">앱 셸 다시 다운로드</button>
      </div>
      <div class="row-btns">
        <button type="button" class="ghost-btn" data-action="offline-outbox">저장된 작업 보기</button>
        <button type="button" class="ghost-btn" data-action="offline-test-start">오프라인 테스트 시작</button>
      </div>
      <div class="row-btns">
        <button type="button" class="ghost-btn danger-btn" data-action="offline-clear-caches">오프라인 캐시 삭제</button>
        <button type="button" class="ghost-btn danger-btn" data-action="offline-clear-outbox">대기 작업 삭제</button>
      </div>
      <h3 class="subsection-title">오프라인 번역</h3>
      <p class="hint">Wi-Fi에서만 대용량 다운로드(향후). 지금은 내장 표현 사전만 제공하며, 고품질 엔진이 없으면 <strong>언어팩 엔진 준비 필요</strong>로 표시합니다.</p>
      <div class="toggle-row"><span>Wi-Fi에서만 언어팩 다운로드</span>
        <input type="checkbox" name="offlinePacksWifiOnly" checked disabled /></div>
      <ul class="aizio-langpack-list">${packRows}</ul>
      <p class="hint">${esc(onlineOnlyMessage('ai'))}</p>
    </details>`
}

export function renderOutboxModal(itemsHtml: string): string {
  return `
    <div class="share-modal" data-outbox-modal="1" role="dialog" aria-modal="true" aria-label="저장된 작업">
      <div class="share-sheet">
        <div class="share-sheet-head">
          <strong>저장된 오프라인 작업</strong>
          <button type="button" class="ghost-btn tiny" data-action="offline-outbox-close">닫기</button>
        </div>
        <div class="aizio-outbox-list hint">${itemsHtml || '<p>대기 중인 작업이 없습니다.</p>'}</div>
        <div class="row-btns">
          <button type="button" class="primary-btn" data-action="offline-flush-outbox">지금 동기화 시도</button>
          <button type="button" class="ghost-btn" data-action="offline-outbox-close">닫기</button>
        </div>
      </div>
    </div>`
}
