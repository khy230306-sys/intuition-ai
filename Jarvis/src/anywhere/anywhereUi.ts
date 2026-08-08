/** Settings panel: AIZIO Anywhere */

import { listPackStatuses, estimateInstalledMb, isAnywhereOfflineReady, anywhereReadyAt } from './packState'
import { localAiStatusLine } from './localAiRuntime'
import { translatePackSummary } from './localTranslateRuntime'
import { sttStatusLine, localTtsAvailable } from './localSpeech'
import { listTravelPacks } from './travelOfflinePack'
import type { DeviceCapability } from './deviceCapability'
import { engineBadgeLabel, pickAiEngine } from './cloudLocalRouter'
import { getNetStatus } from '../offline/networkStatus'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderAnywhereEngineBadge(): string {
  const net = getNetStatus()
  const eng = pickAiEngine(net)
  const label = engineBadgeLabel(eng, net)
  const cls = label === 'Local' ? 'local' : 'cloud'
  return `<span class="aizio-engine-badge aizio-engine-${cls}" data-engine-badge="1" title="AI 엔진">${esc(label)}</span>`
}

export function renderAnywhereSettingsPanel(opts: {
  appVersion: string
  device: DeviceCapability | null
}): string {
  const packs = listPackStatuses()
  const chat = packs.filter((p) => p.kind === 'chat')
  const mt = packs.filter((p) => p.kind === 'translate')
  const stt = packs.filter((p) => p.kind === 'stt')
  const ready = isAnywhereOfflineReady()
  const readyAt = anywhereReadyAt()
  const travel = listTravelPacks()
  const deviceLine = opts.device
    ? `${opts.device.platform} · tier ${opts.device.tier} · WASM ${opts.device.hasWasm ? '✓' : '✗'} · WebGPU ${opts.device.hasWebGpu ? '✓' : '✗'}`
    : '기기 정보 확인 중…'

  const row = (p: (typeof packs)[0]) => {
    const st = p.state.status
    const label =
      st === 'installed' ? '✓ 설치됨' : st === 'downloading' ? `↓ ${p.state.progress}%` : st === 'corrupt' ? '손상' : '○ 설치 필요'
    return `<li class="aizio-anywhere-row" data-pack-id="${esc(p.id)}">
      <div>
        <strong>${esc(p.label)}</strong>
        <span class="hint"> · ${esc(label)} · ~${p.sizeMb}MB · iOS:${esc(p.iosSupport)}</span>
        <p class="hint">${esc(p.notes)}</p>
        ${p.state.error ? `<p class="loc-error">${esc(p.state.error)}</p>` : ''}
      </div>
      <div class="row-btns">
        ${
          st === 'installed'
            ? `<button type="button" class="ghost-btn tiny" data-action="anywhere-delete-pack" data-pack-id="${esc(p.id)}">삭제</button>`
            : `<button type="button" class="primary-btn tiny" data-action="anywhere-download-pack" data-pack-id="${esc(p.id)}" ${st === 'downloading' ? 'disabled' : ''}>다운로드</button>`
        }
      </div>
    </li>`
  }

  return `
    <details class="aizio-anywhere-panel" data-anywhere-panel="1" open>
      <summary><strong>AIZIO Anywhere</strong> · 오프라인 · Local AI</summary>
      <p class="hint">홈 화면에 추가한 뒤 온라인에서 한 번 열면 App Shell이 저장됩니다. 모델은 별도 다운로드이며 기본 앱 용량을 키우지 않습니다.</p>
      <ul class="aizio-offline-stats hint">
        <li>오프라인 앱 셸: <strong>${ready ? '✓ 준비됨' : '○ 준비 중/미완료'}</strong>${readyAt ? ` · ${esc(readyAt)}` : ''}</li>
        <li>${esc(localAiStatusLine())}</li>
        <li>${esc(translatePackSummary())}</li>
        <li>${esc(sttStatusLine())}</li>
        <li>음성 출력: ${localTtsAvailable() ? '✓ 기기 TTS' : '○'}</li>
        <li>여행 오프라인 팩: ${travel.length ? `✓ ${travel.length}개` : '○'}</li>
        <li>오프라인 저장(모델 대략): ~${estimateInstalledMb()}MB</li>
        <li>기기: ${esc(deviceLine)}</li>
        <li>앱 v${esc(opts.appVersion)}</li>
      </ul>
      <div class="row-btns">
        <button type="button" class="primary-btn" data-action="anywhere-download-recommended">추천 오프라인 AI 받기</button>
        <button type="button" class="ghost-btn" data-action="anywhere-prepare-travel">여행 오프라인 준비</button>
        <button type="button" class="ghost-btn" data-action="anywhere-persist-storage">저장공간 고정 요청</button>
      </div>
      <h3 class="subsection-title">오프라인 AI</h3>
      <ul class="aizio-langpack-list">${chat.map(row).join('')}</ul>
      <h3 class="subsection-title">오프라인 번역</h3>
      <ul class="aizio-langpack-list">${mt.map(row).join('')}</ul>
      <h3 class="subsection-title">음성 인식</h3>
      <ul class="aizio-langpack-list">${stt.map(row).join('')}</ul>
      <p class="hint">모델 삭제와 일정/메모 삭제는 분리되어 있습니다. API 키는 모델 캐시에 저장되지 않습니다.</p>
    </details>`
}
