import {
  cancelRecording,
  clearElapsedTicker,
  formatBytes,
  formatElapsed,
  isLikelyIos,
  isRecordingActive,
  revokeUrl,
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
    mode: displaySupported ? 'display' : 'camera',
    facing: 'environment',
    includeMic: true,
    phase: 'idle',
    status: displaySupported
      ? '화면 공유 또는 카메라로 휴대폰 화면·영상을 녹화할 수 있어요.'
      : isIosHint
        ? 'iPhone 웹앱은 시스템 화면 공유가 제한됩니다. 카메라 영상 녹화를 쓰거나, 제어 센터 → 화면 녹화를 이용해 주세요.'
        : '카메라 영상 녹화를 시작할 수 있어요. 화면 공유가 지원되면 화면 모드도 선택할 수 있습니다.',
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
  }
}

let lastClip: RecordedClip | null = null
let liveStream: MediaStream | null = null

export function getLastClip(): RecordedClip | null {
  return lastClip
}

export function renderScreenRecordScreen(st: ScreenRecordState): string {
  const recording = st.phase === 'recording'
  const hasResult = Boolean(st.resultUrl)
  const timer = formatElapsed(st.elapsedMs)
  return `
    <section class="panel screc-panel" data-screc="1">
      <header class="navv2-head">
        <button type="button" class="ghost-btn tiny" data-action="screc-back">뒤로</button>
        <strong>화면 · 영상 녹화</strong>
        <span class="hint screc-timer" aria-live="polite">${esc(timer)}</span>
      </header>
      <p class="hint">${esc(st.status)}</p>
      ${st.error ? `<p class="hint screc-error">${esc(st.error)}</p>` : ''}
      ${
        st.isIosHint
          ? `<div class="screc-tip"><strong>iPhone 전체 화면 녹화</strong><p class="hint">제어 센터 → 화면 녹화 버튼을 누르면 휴대폰 전체 화면을 저장할 수 있어요. AIZIO 안에서는 카메라 영상 녹화를 제공합니다.</p></div>`
          : ''
      }
      <div class="screc-modes" role="group" aria-label="녹화 모드">
        <button type="button" class="ghost-btn tiny ${st.mode === 'display' ? 'active' : ''}" data-screc-mode="display" ${!st.displaySupported || recording ? 'disabled' : ''}>화면 공유</button>
        <button type="button" class="ghost-btn tiny ${st.mode === 'camera' ? 'active' : ''}" data-screc-mode="camera" ${recording ? 'disabled' : ''}>카메라 영상</button>
      </div>
      ${
        st.mode === 'camera'
          ? `<div class="screc-modes" role="group" aria-label="카메라 방향">
        <button type="button" class="ghost-btn tiny ${st.facing === 'environment' ? 'active' : ''}" data-screc-facing="environment" ${recording ? 'disabled' : ''}>후면</button>
        <button type="button" class="ghost-btn tiny ${st.facing === 'user' ? 'active' : ''}" data-screc-facing="user" ${recording ? 'disabled' : ''}>전면</button>
      </div>`
          : ''
      }
      <label class="screc-mic"><input type="checkbox" data-screc-mic="1" ${st.includeMic ? 'checked' : ''} ${recording ? 'disabled' : ''}/> 마이크 소리 포함</label>
      <div class="screc-preview ${recording || st.previewUrl || hasResult ? 'has' : ''}">
        <video data-screc-video="1" playsinline muted autoplay ${hasResult && !recording ? 'controls' : ''} ${hasResult && !recording ? `src="${esc(st.resultUrl)}"` : ''}></video>
        ${!recording && !hasResult && !st.previewUrl ? `<p class="hint screc-empty">미리보기</p>` : ''}
      </div>
      <div class="row-btns screc-actions">
        ${
          recording
            ? `<button type="button" class="primary-btn screc-stop" data-screc-action="stop">녹화 중지</button>`
            : `<button type="button" class="primary-btn" data-screc-action="start" ${!st.recorderSupported ? 'disabled' : ''}>녹화 시작</button>`
        }
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
      ${!st.recorderSupported ? `<p class="hint screc-error">이 브라우저에서는 녹화를 지원하지 않아요.</p>` : ''}
    </section>
  `
}

export function bindScreenRecordScreen(
  root: HTMLElement,
  st: ScreenRecordState,
  patch: (next: Partial<ScreenRecordState>) => void,
  opts?: { onBack?: () => void },
): void {
  if (root.dataset.screcBound === '1') {
    // Re-attach live stream to video after remount
    const video = root.querySelector('[data-screc-video="1"]') as HTMLVideoElement | null
    if (video && liveStream && st.phase === 'recording') {
      video.srcObject = liveStream
      video.muted = true
      void video.play().catch(() => undefined)
    }
    return
  }
  root.dataset.screcBound = '1'

  const video = root.querySelector('[data-screc-video="1"]') as HTMLVideoElement | null

  root.querySelector('[data-action="screc-back"]')?.addEventListener('click', () => {
    if (isRecordingActive()) {
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
    opts?.onBack?.()
  })

  root.querySelectorAll<HTMLButtonElement>('[data-screc-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isRecordingActive()) return
      const mode = btn.dataset.screcMode === 'display' ? 'display' : 'camera'
      if (mode === 'display' && !supportsDisplayCapture()) {
        patch({
          error: '이 기기에서는 화면 공유가 지원되지 않아요. 카메라 영상 모드를 이용해 주세요.',
        })
        return
      }
      patch({
        mode,
        error: '',
        status:
          mode === 'display'
            ? '화면 공유를 선택하면 공유할 화면을 고른 뒤 녹화가 시작됩니다.'
            : '카메라로 영상을 녹화합니다. 전면/후면을 고를 수 있어요.',
      })
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-screc-facing]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isRecordingActive()) return
      const facing = btn.dataset.screcFacing === 'user' ? 'user' : 'environment'
      patch({ facing, error: '' })
    })
  })

  root.querySelector('[data-screc-mic="1"]')?.addEventListener('change', (ev) => {
    const checked = (ev.target as HTMLInputElement).checked
    patch({ includeMic: checked })
  })

  const attachLive = (stream: MediaStream) => {
    liveStream = stream
    if (!video) return
    video.removeAttribute('src')
    video.srcObject = stream
    video.muted = true
    video.controls = false
    void video.play().catch(() => undefined)
  }

  root.querySelector('[data-screc-action="start"]')?.addEventListener('click', () => {
    void (async () => {
      if (isRecordingActive()) return
      if (st.resultUrl) {
        revokeUrl(st.resultUrl)
        lastClip = null
      }
      patch({
        phase: 'recording',
        error: '',
        status: st.mode === 'display' ? '화면 공유 권한을 확인한 뒤 녹화합니다…' : '카메라 권한을 확인한 뒤 녹화합니다…',
        resultUrl: '',
        resultBytes: 0,
        resultName: '',
        resultMime: '',
        elapsedMs: 0,
      })
      try {
        const { stream } = await startRecording({
          mode: st.mode,
          facing: st.facing,
          includeMic: st.includeMic,
          onStreamEnded: () => {
            if (!isRecordingActive()) return
            void stopAndSave(patch, video)
          },
        })
        attachLive(stream)
        patch({
          phase: 'recording',
          status: '녹화 중… 중지 버튼을 누르면 저장됩니다.',
          error: '',
        })
        startElapsedTicker((ms) => {
          const el = document.querySelector('.screc-timer')
          if (el) el.textContent = formatElapsed(ms)
          // keep state roughly in sync without full remount thrash
          st.elapsedMs = ms
        })
      } catch (err) {
        clearElapsedTicker()
        liveStream = null
        const msg = err instanceof Error ? err.message : String(err)
        patch({
          phase: 'error',
          error: msg,
          status: '녹화를 시작하지 못했어요.',
          elapsedMs: 0,
        })
      }
    })()
  })

  root.querySelector('[data-screc-action="stop"]')?.addEventListener('click', () => {
    void stopAndSave(patch, video)
  })

  root.querySelector('[data-screc-action="share"]')?.addEventListener('click', () => {
    void (async () => {
      if (!lastClip) {
        patch({ error: '저장할 녹화가 없어요.' })
        return
      }
      const r = await shareOrDownloadClip(lastClip)
      patch({ status: r.message, error: r.ok ? '' : r.message })
    })()
  })

  root.querySelector('[data-screc-action="clear"]')?.addEventListener('click', () => {
    if (st.resultUrl) revokeUrl(st.resultUrl)
    lastClip = null
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
  })

  // After remount during an active session, restore live preview.
  if (liveStream && st.phase === 'recording' && video) {
    video.srcObject = liveStream
    video.muted = true
    video.controls = false
    void video.play().catch(() => undefined)
  } else if (st.resultUrl && video && st.phase === 'done') {
    video.srcObject = null
    video.src = st.resultUrl
    video.controls = true
  }
}

async function stopAndSave(
  patch: (next: Partial<ScreenRecordState>) => void,
  video: HTMLVideoElement | null,
): Promise<void> {
  clearElapsedTicker()
  patch({ phase: 'stopping', status: '녹화를 저장하는 중…' })
  try {
    const clip = await stopRecording()
    liveStream = null
    if (video) {
      video.srcObject = null
    }
    if (!clip) {
      patch({
        phase: 'error',
        status: '녹화된 데이터가 비어 있어요. 다시 시도해 주세요.',
        error: 'empty_recording',
        elapsedMs: 0,
      })
      return
    }
    if (lastClip) {
      /* previous blob URL may still be in state — caller clears via patch */
    }
    const url = URL.createObjectURL(clip.blob)
    lastClip = clip
    if (video) {
      video.controls = true
      video.muted = false
      video.src = url
    }
    patch({
      phase: 'done',
      status: '녹화가 완료됐어요. 공유·저장으로 앨범/파일에 보관하세요.',
      error: '',
      resultUrl: url,
      resultMime: clip.mime,
      resultBytes: clip.bytes,
      resultName: clip.name,
      elapsedMs: 0,
      previewUrl: url,
    })
  } catch (err) {
    liveStream = null
    const msg = err instanceof Error ? err.message : String(err)
    patch({
      phase: 'error',
      status: '녹화 중지에 실패했어요.',
      error: msg,
    })
  }
}

/** Call when leaving the view to avoid leaked tracks. */
export function teardownScreenRecord(): void {
  clearElapsedTicker()
  if (isRecordingActive()) cancelRecording()
  liveStream = null
}
