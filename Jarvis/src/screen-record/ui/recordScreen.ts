import {
  cancelRecording,
  clearElapsedTicker,
  formatBytes,
  formatElapsed,
  isLikelyIos,
  isRecordingActive,
  revokeUrl,
  autoSaveClipToAlbum,
  shareOrDownloadClip,
  startElapsedTicker,
  startRecording,
  stopRecording,
  supportsDisplayCapture,
  supportsMediaRecorder,
} from '../recorder'
import type { RecordedClip, ScreenRecordState } from '../types'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function defaultScreenRecordState(): ScreenRecordState {
  const displaySupported = supportsDisplayCapture()
  const recorderSupported = supportsMediaRecorder()
  const isIosHint = isLikelyIos()
  return {
    // Always lead with "what you see on the phone" — not the camera.
    mode: 'display',
    facing: 'environment',
    includeMic: true,
    phase: 'idle',
    status: displaySupported
      ? '시작을 누르면 지금 휴대폰에 보이는 화면을 골라 녹화합니다. 원하는 앱·화면으로 이동해도 됩니다.'
      : isIosHint
        ? 'iPhone에서는 앱이 다른 화면을 직접 캡처할 수 없습니다. 시작 → 제어 센터 화면 녹화로 지금 보이는 화면을 그대로 녹화하세요. 중지하면 사진첩에 저장됩니다.'
        : '이 브라우저에서는 전체 화면 캡처가 제한됩니다. 가능하면 Chrome에서 다시 열어 주세요.',
    elapsedMs: 0,
    previewUrl: '',
    resultUrl: '',
    resultMime: '',
    resultBytes: 0,
    resultName: '',
    error: '',
    displaySupported,
    recorderSupported,
    isIosHint,
    systemGuideOpen: false,
  }
}

let lastClip: RecordedClip | null = null
let liveStream: MediaStream | null = null
let patchRef: ((next: Partial<ScreenRecordState>) => void) | null = null
let stateRef: ScreenRecordState | null = null
let floatBound = false
let starting = false

const FLOAT_ID = 'screc-float-dock'

function liveVideo(): HTMLVideoElement | null {
  return document.querySelector('[data-screc-video="1"]') as HTMLVideoElement | null
}

function syncFloatDock(st: ScreenRecordState): void {
  const dock = document.getElementById(FLOAT_ID)
  if (!dock) return
  const recording = st.phase === 'recording' || starting
  const busy = st.phase === 'stopping' || starting
  const done = st.phase === 'done' && Boolean(st.resultUrl)
  const startBtn = dock.querySelector('[data-screc-float="start"]') as HTMLButtonElement | null
  const stopBtn = dock.querySelector('[data-screc-float="stop"]') as HTMLButtonElement | null
  const shareBtn = dock.querySelector('[data-screc-float="share"]') as HTMLButtonElement | null
  const clearBtn = dock.querySelector('[data-screc-float="clear"]') as HTMLButtonElement | null
  const timer = dock.querySelector('[data-screc-float-timer]') as HTMLElement | null
  const label = dock.querySelector('[data-screc-float-label]') as HTMLElement | null
  if (startBtn) {
    const canStartDisplay = st.mode === 'display' && (!st.displaySupported || st.recorderSupported)
    const canStartCamera = st.mode === 'camera' && st.recorderSupported
    startBtn.disabled = Boolean(recording || busy || st.phase === 'stopping' || !(canStartDisplay || canStartCamera))
    startBtn.setAttribute('aria-pressed', recording ? 'true' : 'false')
  }
  if (stopBtn) {
    stopBtn.disabled = !recording || st.phase === 'stopping'
  }
  if (shareBtn) {
    shareBtn.hidden = !done
    shareBtn.disabled = !done
  }
  if (clearBtn) {
    clearBtn.hidden = !done
    clearBtn.disabled = !done
  }
  if (timer) timer.textContent = formatElapsed(st.elapsedMs)
  if (label) {
    label.textContent = recording
      ? '녹화 중'
      : st.phase === 'done'
        ? '완료'
        : st.phase === 'error'
          ? '오류'
          : st.phase === 'stopping'
            ? '저장 중'
            : '대기'
  }
  dock.classList.toggle('is-recording', recording)
  dock.classList.toggle('is-done', done)
}

function ensureFloatDock(): HTMLElement {
  let dock = document.getElementById(FLOAT_ID)
  if (!dock) {
    dock = document.createElement('div')
    dock.id = FLOAT_ID
    dock.className = 'screc-float-dock'
    dock.setAttribute('role', 'toolbar')
    dock.setAttribute('aria-label', '화면 녹화 외부 컨트롤')
    dock.innerHTML = `
      <div class="screc-float-meta">
        <span class="screc-float-dot" aria-hidden="true"></span>
        <span data-screc-float-label>대기</span>
        <span class="screc-float-timer" data-screc-float-timer>00:00</span>
      </div>
      <div class="screc-float-btns">
        <button type="button" class="screc-float-start" data-screc-float="start">시작</button>
        <button type="button" class="screc-float-stop" data-screc-float="stop" disabled>중지</button>
        <button type="button" class="screc-float-share" data-screc-float="share" hidden>공유</button>
        <button type="button" class="screc-float-clear" data-screc-float="clear" hidden>지우기</button>
      </div>
    `
    document.body.appendChild(dock)
  }
  document.body.classList.add('screc-active')
  if (!floatBound) {
    floatBound = true
    dock.addEventListener('click', (ev) => {
      const t = (ev.target as HTMLElement | null)?.closest?.('[data-screc-float]') as HTMLElement | null
      if (!t) return
      const action = t.getAttribute('data-screc-float')
      if (action === 'start') void runStart()
      if (action === 'stop') void stopAndSave()
      if (action === 'share') void runShare()
      if (action === 'clear') runClear()
    })
  }
  if (stateRef) syncFloatDock(stateRef)
  return dock
}

export function removeFloatDock(): void {
  if (typeof document === 'undefined') {
    floatBound = false
    return
  }
  document.body.classList.remove('screc-active')
  const dock = document.getElementById(FLOAT_ID)
  if (dock) dock.remove()
  floatBound = false
}

function attachLive(stream: MediaStream): void {
  liveStream = stream
  const video = liveVideo()
  if (!video) return
  video.removeAttribute('src')
  video.srcObject = stream
  video.muted = true
  video.controls = false
  void video.play().catch(() => undefined)
}

async function runStart(): Promise<void> {
  const st = stateRef
  const patch = patchRef
  if (!st || !patch) return
  if (isRecordingActive() || starting) return

  // Phone-screen intent on iOS / browsers without getDisplayMedia → system guide.
  if (st.mode === 'display' && !st.displaySupported) {
    patch({
      systemGuideOpen: true,
      phase: 'preview',
      error: '',
      status:
        '제어 센터에서 화면 녹화를 켜면, 지금 휴대폰에 보이는 어떤 화면이든 그대로 녹화됩니다. 중지 시 사진첩에 저장됩니다.',
    })
    return
  }

  if (!st.recorderSupported) {
    patch({ error: '이 브라우저에서는 녹화를 지원하지 않아요.', phase: 'error' })
    return
  }
  if (st.resultUrl) {
    revokeUrl(st.resultUrl)
    lastClip = null
  }
  starting = true
  syncFloatDock(st)
  patch({
    phase: 'preview',
    error: '',
    status:
      st.mode === 'display'
        ? '공유할 화면을 고르세요. 「전체 화면」을 선택하면 지금 보이는 휴대폰 화면을 녹화합니다.'
        : '카메라 권한을 확인한 뒤 녹화합니다…',
    resultUrl: '',
    resultBytes: 0,
    resultName: '',
    resultMime: '',
    elapsedMs: 0,
    systemGuideOpen: false,
  })
  try {
    const { stream } = await startRecording({
      mode: st.mode,
      facing: st.facing,
      includeMic: st.includeMic,
      onStreamEnded: () => {
        if (!isRecordingActive()) return
        void stopAndSave()
      },
    })
    attachLive(stream)
    requestAnimationFrame(() => attachLive(stream))
    starting = false
    patch({
      phase: 'recording',
      status:
        st.mode === 'display'
          ? '휴대폰 화면 녹화 중… 원하는 화면으로 이동한 뒤, 하단 「중지」로 끝내세요.'
          : '녹화 중… 하단 「중지」로 저장하세요.',
      error: '',
      elapsedMs: 0,
    })
    startElapsedTicker((ms) => {
      if (stateRef) stateRef.elapsedMs = ms
      const el = document.querySelector('.screc-timer')
      if (el) el.textContent = formatElapsed(ms)
      const floatTimer = document.querySelector('[data-screc-float-timer]')
      if (floatTimer) floatTimer.textContent = formatElapsed(ms)
    })
    syncFloatDock({ ...st, phase: 'recording', elapsedMs: 0 })
  } catch (err) {
    starting = false
    clearElapsedTicker()
    liveStream = null
    const msg = err instanceof Error ? err.message : String(err)
    // If display capture was denied/unavailable, fall back to system guide on iOS.
    if (st.mode === 'display' && (st.isIosHint || /화면|display|NotAllowed|NotSupported/i.test(msg))) {
      patch({
        phase: 'preview',
        systemGuideOpen: true,
        error: '',
        status:
          '브라우저 화면 공유를 쓸 수 없어 시스템 화면 녹화 안내로 전환했어요. 제어 센터로 지금 보이는 화면을 녹화하세요.',
        elapsedMs: 0,
      })
      if (stateRef) syncFloatDock({ ...stateRef, phase: 'preview', elapsedMs: 0 })
      return
    }
    patch({
      phase: 'error',
      error: msg,
      status: '녹화를 시작하지 못했어요.',
      elapsedMs: 0,
    })
    if (stateRef) syncFloatDock({ ...stateRef, phase: 'error', elapsedMs: 0 })
  }
}

async function runShare(): Promise<void> {
  const patch = patchRef
  if (!patch) return
  if (!lastClip) {
    patch({ error: '저장할 녹화가 없어요.' })
    return
  }
  const r = await shareOrDownloadClip(lastClip)
  patch({ status: r.message, error: r.ok ? '' : r.message })
}

function runClear(): void {
  const patch = patchRef
  const st = stateRef
  if (!patch || !st) return
  if (st.resultUrl) revokeUrl(st.resultUrl)
  lastClip = null
  const video = liveVideo()
  if (video) {
    video.removeAttribute('src')
    video.srcObject = null
  }
  patch({
    resultUrl: '',
    resultBytes: 0,
    resultName: '',
    resultMime: '',
    phase: 'idle',
    status: '결과가 지워졌습니다. 다시 녹화할 수 있어요.',
    error: '',
    elapsedMs: 0,
  })
}

export function renderScreenRecordScreen(st: ScreenRecordState): string {
  const recording = st.phase === 'recording'
  const hasResult = Boolean(st.resultUrl)
  const timer = formatElapsed(st.elapsedMs)
  const phoneScreen = st.mode === 'display'
  const needsSystemGuide = phoneScreen && (!st.displaySupported || st.systemGuideOpen)
  return `
    <section class="panel screc-panel screc-phone" data-screc="1">
      <header class="navv2-head screc-head">
        <button type="button" class="ghost-btn tiny" data-action="screc-back">뒤로</button>
        <strong>휴대폰 화면 녹화</strong>
        <span class="hint screc-timer" aria-live="polite">${esc(timer)}</span>
      </header>
      <p class="screc-lead">휴대폰에 <em>지금 보이는 화면</em>을 그대로 녹화합니다. 원하는 앱·화면으로 이동해 찍으세요.</p>
      <p class="hint screc-status">${esc(st.status)}</p>
      ${st.error ? `<p class="hint screc-error">${esc(st.error)}</p>` : ''}
      <div class="screc-modes" role="group" aria-label="녹화 대상">
        <button type="button" class="ghost-btn tiny ${phoneScreen ? 'active' : ''}" data-screc-mode="display" ${recording ? 'disabled' : ''}>지금 보이는 화면</button>
        <button type="button" class="ghost-btn tiny ${st.mode === 'camera' ? 'active' : ''}" data-screc-mode="camera" ${recording ? 'disabled' : ''}>카메라 촬영</button>
      </div>
      ${
        needsSystemGuide
          ? `<div class="screc-system-guide" data-screc-guide="1">
              <strong>iPhone · 지금 보이는 화면 녹화</strong>
              <ol>
                <li>화면 오른쪽 위에서 아래로 쓸어 <b>제어 센터</b>를 엽니다.</li>
                <li><b>화면 녹화</b> ● 버튼을 누릅니다. (없으면 제어 센터 편집에서 추가)</li>
                <li>마이크를 켜면 내 목소리도 함께 녹음됩니다.</li>
                <li>제어 센터를 닫고, <b>원하는 앱·화면</b>으로 이동합니다.</li>
                <li>상단 빨간 상태 표시줄을 눌러 중지하면 <b>사진첩에 자동 저장</b>됩니다.</li>
              </ol>
              <p class="hint">AIZIO 웹앱은 iPhone의 다른 앱 화면을 직접 캡처할 수 없어, 시스템 화면 녹화를 안내합니다.</p>
              <button type="button" class="primary-btn" data-screc-action="open-guide">안내 다시 보기</button>
            </div>`
          : ''
      }
      ${
        st.mode === 'camera'
          ? `<div class="screc-modes" role="group" aria-label="카메라 방향">
        <button type="button" class="ghost-btn tiny ${st.facing === 'environment' ? 'active' : ''}" data-screc-facing="environment" ${recording ? 'disabled' : ''}>후면</button>
        <button type="button" class="ghost-btn tiny ${st.facing === 'user' ? 'active' : ''}" data-screc-facing="user" ${recording ? 'disabled' : ''}>전면</button>
      </div>`
          : ''
      }
      ${
        st.mode === 'camera' || st.displaySupported
          ? `<label class="screc-mic"><input type="checkbox" data-screc-mic="1" ${st.includeMic ? 'checked' : ''} ${recording ? 'disabled' : ''}/> 마이크 소리 포함</label>`
          : ''
      }
      <div class="screc-stage">
        <div class="screc-preview ${recording || st.previewUrl || hasResult ? 'has' : ''}">
          <video data-screc-video="1" playsinline muted autoplay ${hasResult && !recording ? 'controls' : ''} ${hasResult && !recording ? `src="${esc(st.resultUrl)}"` : ''}></video>
          ${
            !recording && !hasResult && !st.previewUrl
              ? `<p class="hint screc-empty">${
                  phoneScreen
                    ? needsSystemGuide
                      ? '시작 → 제어 센터 화면 녹화'
                      : '시작 → 전체 화면 선택'
                    : '미리보기 · 카메라'
                }</p>`
              : ''
          }
          ${recording ? `<div class="screc-rec-badge" aria-live="polite">REC</div>` : ''}
        </div>
      </div>
      <p class="hint screc-float-hint">${
        needsSystemGuide
          ? '하단 「시작」을 누르면 제어 센터 안내가 열립니다. 시스템 녹화는 중지 시 사진첩에 저장됩니다.'
          : '하단 「시작」으로 보이는 화면 녹화를 시작하고, 「중지」하면 기기에 저장됩니다.'
      }</p>
      <div class="row-btns screc-actions screc-actions-inline">
        ${
          hasResult
            ? `<button type="button" class="ghost-btn" data-screc-action="share">공유·저장</button>
               <button type="button" class="ghost-btn" data-screc-action="clear">결과 지우기</button>`
            : ''
        }
      </div>
      ${
        hasResult
          ? `<p class="hint">저장됨 · ${esc(st.resultName)} · ${esc(formatBytes(st.resultBytes))}</p>`
          : ''
      }
      ${!st.recorderSupported && st.displaySupported ? `<p class="hint screc-error">이 브라우저에서는 녹화를 지원하지 않아요.</p>` : ''}
    </section>
  `
}

export function bindScreenRecordScreen(
  root: HTMLElement,
  st: ScreenRecordState,
  patch: (next: Partial<ScreenRecordState>) => void,
  opts?: { onBack?: () => void },
): void {
  stateRef = st
  patchRef = patch
  ensureFloatDock()
  syncFloatDock(st)

  // Always rebind panel chrome after remount — controls live on the float dock.
  if (root.dataset.screcBound === '1') {
    const video = liveVideo()
    if (video && liveStream && st.phase === 'recording') {
      video.srcObject = liveStream
      video.muted = true
      void video.play().catch(() => undefined)
    } else if (st.resultUrl && video && st.phase === 'done') {
      video.srcObject = null
      video.src = st.resultUrl
      video.controls = true
    }
    return
  }
  root.dataset.screcBound = '1'

  root.querySelector('[data-action="screc-back"]')?.addEventListener('click', () => {
    if (isRecordingActive() || starting) {
      starting = false
      cancelRecording()
      liveStream = null
      patch({
        phase: 'idle',
        elapsedMs: 0,
        previewUrl: '',
        status: '녹화를 취소하고 나갑니다.',
        error: '',
      })
    }
    removeFloatDock()
    opts?.onBack?.()
  })

  root.querySelectorAll<HTMLButtonElement>('[data-screc-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isRecordingActive() || starting) return
      const mode = btn.dataset.screcMode === 'display' ? 'display' : 'camera'
      if (mode === 'display') {
        patch({
          mode,
          error: '',
          systemGuideOpen: !supportsDisplayCapture(),
          status: supportsDisplayCapture()
            ? '시작을 누르면 지금 휴대폰에 보이는 화면을 골라 녹화합니다.'
            : '시작을 누르면 제어 센터 화면 녹화 안내가 열립니다. 원하는 화면으로 이동해 찍으세요.',
        })
        return
      }
      patch({
        mode,
        error: '',
        systemGuideOpen: false,
        status: '카메라로 영상을 녹화합니다. 전면/후면을 고를 수 있어요.',
      })
    })
  })

  root.querySelector('[data-screc-action="open-guide"]')?.addEventListener('click', () => {
    patch({
      systemGuideOpen: true,
      status:
        '제어 센터 → 화면 녹화로 지금 보이는 화면을 녹화하세요. 중지하면 사진첩에 저장됩니다.',
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-screc-facing]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isRecordingActive() || starting) return
      const facing = btn.dataset.screcFacing === 'user' ? 'user' : 'environment'
      patch({ facing, error: '' })
    })
  })

  root.querySelector('[data-screc-mic="1"]')?.addEventListener('change', (ev) => {
    const checked = (ev.target as HTMLInputElement).checked
    patch({ includeMic: checked })
  })

  root.querySelector('[data-screc-action="share"]')?.addEventListener('click', () => {
    void runShare()
  })

  root.querySelector('[data-screc-action="clear"]')?.addEventListener('click', () => {
    runClear()
  })

  if (liveStream && st.phase === 'recording') {
    attachLive(liveStream)
  } else if (st.resultUrl && st.phase === 'done') {
    const video = liveVideo()
    if (video) {
      video.srcObject = null
      video.src = st.resultUrl
      video.controls = true
    }
  }
}

async function stopAndSave(): Promise<void> {
  const patch = patchRef
  if (!patch) return
  starting = false
  clearElapsedTicker()
  patch({ phase: 'stopping', status: '녹화를 저장하는 중…' })
  if (stateRef) syncFloatDock({ ...stateRef, phase: 'stopping' })
  try {
    const clip = await stopRecording()
    liveStream = null
    const video = liveVideo()
    if (video) video.srcObject = null
    if (!clip) {
      patch({
        phase: 'error',
        status: '녹화된 데이터가 비어 있어요. 다시 시도해 주세요.',
        error: 'empty_recording',
        elapsedMs: 0,
      })
      if (stateRef) syncFloatDock({ ...stateRef, phase: 'error', elapsedMs: 0 })
      return
    }
    const url = URL.createObjectURL(clip.blob)
    lastClip = clip
    if (video) {
      video.controls = true
      video.muted = false
      video.src = url
    }

    // Auto-save while still close to the Stop user gesture (iOS share / download).
    const saved = await autoSaveClipToAlbum(clip)
    patch({
      phase: 'done',
      status: saved.ok
        ? saved.message
        : '녹화는 완료됐어요. 「공유」로 사진첩에 저장해 주세요.',
      error: saved.ok ? '' : saved.message,
      resultUrl: url,
      resultMime: clip.mime,
      resultBytes: clip.bytes,
      resultName: clip.name,
      elapsedMs: 0,
      previewUrl: url,
    })
    if (stateRef) syncFloatDock({ ...stateRef, phase: 'done', elapsedMs: 0, resultUrl: url })
  } catch (err) {
    liveStream = null
    const msg = err instanceof Error ? err.message : String(err)
    patch({
      phase: 'error',
      status: '녹화 중지에 실패했어요.',
      error: msg,
    })
    if (stateRef) syncFloatDock({ ...stateRef, phase: 'error' })
  }
}

/** Call when leaving the view to avoid leaked tracks. */
export function teardownScreenRecord(): void {
  clearElapsedTicker()
  starting = false
  if (isRecordingActive()) cancelRecording()
  liveStream = null
  patchRef = null
  stateRef = null
  removeFloatDock()
}

export function getLastClip(): RecordedClip | null {
  return lastClip
}
