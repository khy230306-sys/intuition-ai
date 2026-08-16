import type { RecordFacing, RecordMode, RecordedClip } from './types'

type ActiveSession = {
  stream: MediaStream
  recorder: MediaRecorder
  chunks: BlobPart[]
  mode: RecordMode
  startedAt: number
  mime: string
}

let active: ActiveSession | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null

export function isLikelyIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function supportsDisplayCapture(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function'
}

export function supportsUserMedia(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

export function supportsMediaRecorder(): boolean {
  return typeof MediaRecorder !== 'undefined'
}

/** Pick a mime type the browser can actually record. */
export function pickRecorderMime(): string {
  if (!supportsMediaRecorder()) return ''
  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c
    } catch {
      /* ignore */
    }
  }
  return ''
}

export function extForMime(mime: string): string {
  if (/mp4/i.test(mime)) return 'mp4'
  if (/webm/i.test(mime)) return 'webm'
  if (/ogg/i.test(mime)) return 'ogg'
  return 'webm'
}

function stopTracks(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const t of stream.getTracks()) {
    try {
      t.stop()
    } catch {
      /* ignore */
    }
  }
}

export function isRecordingActive(): boolean {
  return Boolean(active && active.recorder.state === 'recording')
}

export function getElapsedMs(): number {
  if (!active) return 0
  return Math.max(0, Date.now() - active.startedAt)
}

export function clearElapsedTicker(): void {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

export function startElapsedTicker(onTick: (ms: number) => void): void {
  clearElapsedTicker()
  tickTimer = setInterval(() => onTick(getElapsedMs()), 250)
}

async function openStream(
  mode: RecordMode,
  facing: RecordFacing,
  includeMic: boolean,
): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    throw new Error('이 기기에서 미디어 장치를 사용할 수 없어요.')
  }
  if (mode === 'display') {
    if (!supportsDisplayCapture()) {
      throw new Error(
        '이 기기 웹앱에서는 전체 화면을 직접 캡처할 수 없어요. iPhone은 제어 센터 → 화면 녹화로 지금 보이는 화면을 녹화하세요.',
      )
    }
    // Prefer entire device screen when the browser allows it (Android Chrome etc.).
    const videoConstraints: MediaTrackConstraints & Record<string, unknown> = {
      frameRate: 30,
      displaySurface: 'monitor',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    }
    const displayOpts: DisplayMediaStreamOptions & Record<string, unknown> = {
      video: videoConstraints,
      audio: includeMic,
      preferCurrentTab: false,
      selfBrowserSurface: 'exclude',
      surfaceSwitching: 'include',
      monitorTypeSurfaces: 'include',
      systemAudio: includeMic ? 'include' : 'exclude',
    }
    let display: MediaStream
    try {
      display = await navigator.mediaDevices.getDisplayMedia(displayOpts)
    } catch {
      // Fall back to simpler constraints if advanced options are rejected.
      display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: includeMic,
      })
    }
    if (includeMic && display.getAudioTracks().length === 0 && supportsUserMedia()) {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        for (const t of mic.getAudioTracks()) display.addTrack(t)
      } catch {
        /* mic optional */
      }
    }
    return display
  }
  if (!supportsUserMedia()) {
    throw new Error('카메라·마이크 권한이 필요해요.')
  }
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: includeMic,
  })
}

export type StartRecordResult = {
  stream: MediaStream
  mime: string
}

/**
 * Start MediaRecorder. Caller should attach `stream` to a <video> for live preview.
 * Resolves when recording has started; rejects if permission denied or unsupported.
 */
export async function startRecording(opts: {
  mode: RecordMode
  facing?: RecordFacing
  includeMic?: boolean
  onStreamEnded?: () => void
}): Promise<StartRecordResult> {
  if (active) {
    throw new Error('이미 녹화 중입니다. 먼저 중지해 주세요.')
  }
  if (!supportsMediaRecorder()) {
    throw new Error('이 브라우저에서는 MediaRecorder를 지원하지 않아요.')
  }
  const mode = opts.mode
  const facing = opts.facing || 'environment'
  const includeMic = opts.includeMic !== false
  const stream = await openStream(mode, facing, includeMic)
  const mime = pickRecorderMime()
  const recorder = mime
    ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 })
    : new MediaRecorder(stream)
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data)
  }
  for (const track of stream.getTracks()) {
    track.addEventListener('ended', () => {
      opts.onStreamEnded?.()
    })
  }
  active = {
    stream,
    recorder,
    chunks,
    mode,
    startedAt: Date.now(),
    mime: recorder.mimeType || mime || 'video/webm',
  }
  try {
    recorder.start(1000)
  } catch (err) {
    stopTracks(stream)
    active = null
    throw err instanceof Error ? err : new Error(String(err))
  }
  return { stream, mime: active.mime }
}

export async function stopRecording(): Promise<RecordedClip | null> {
  const sess = active
  if (!sess) return null
  clearElapsedTicker()

  const blob = await new Promise<Blob | null>((resolve) => {
    const finish = () => {
      const type = sess.mime || 'video/webm'
      if (!sess.chunks.length) {
        resolve(null)
        return
      }
      resolve(new Blob(sess.chunks, { type }))
    }
    sess.recorder.onstop = () => finish()
    try {
      if (sess.recorder.state === 'recording' || sess.recorder.state === 'paused') {
        sess.recorder.stop()
      } else {
        finish()
      }
    } catch {
      finish()
    }
  })

  stopTracks(sess.stream)
  const mode = sess.mode
  const mime = sess.mime
  active = null
  if (!blob || blob.size < 32) return null
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const name = `aizio-record-${mode}-${stamp}.${extForMime(mime)}`
  return {
    blob,
    mime,
    name,
    bytes: blob.size,
    createdAt: Date.now(),
    mode,
  }
}

/** Abort without producing a clip (e.g. leave screen). */
export function cancelRecording(): void {
  clearElapsedTicker()
  const sess = active
  active = null
  if (!sess) return
  try {
    if (sess.recorder.state === 'recording' || sess.recorder.state === 'paused') sess.recorder.stop()
  } catch {
    /* ignore */
  }
  stopTracks(sess.stream)
}

export function revokeUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
  }
}

export async function shareOrDownloadClip(clip: RecordedClip): Promise<{ ok: boolean; message: string }> {
  return autoSaveClipToAlbum(clip, { preferShare: true })
}

export type AutoSaveResult = {
  ok: boolean
  method: 'download' | 'share' | 'none'
  message: string
}

/**
 * Best-effort save to device gallery / Downloads after recording.
 * Web apps cannot silently write the iOS Photos library; on iPhone we open the
 * share sheet so the user can tap 「비디오 저장」 in one step. Elsewhere we
 * trigger an automatic file download (often lands in Downloads / Gallery).
 */
export async function autoSaveClipToAlbum(
  clip: RecordedClip,
  opts?: { preferShare?: boolean },
): Promise<AutoSaveResult> {
  const file = new File([clip.blob], clip.name, { type: clip.mime || 'video/webm' })
  const ios = isLikelyIos()
  const preferShare = opts?.preferShare === true || ios

  if (preferShare) {
    const shared = await tryShareFile(file, clip.name)
    if (shared.ok) return shared
  }

  const downloaded = tryDownloadFile(clip)
  if (downloaded.ok) {
    return {
      ok: true,
      method: 'download',
      message: ios
        ? '파일을 저장했어요. iPhone은 공유 → 「비디오 저장」으로 사진첩에 넣을 수 있어요.'
        : '녹화를 기기에 저장했어요 (다운로드/갤러리).',
    }
  }

  if (!preferShare) {
    const shared = await tryShareFile(file, clip.name)
    if (shared.ok) return shared
  }

  return {
    ok: false,
    method: 'none',
    message: '자동 저장에 실패했어요. 「공유」로 사진첩에 저장해 주세요.',
  }
}

async function tryShareFile(file: File, name: string): Promise<AutoSaveResult> {
  try {
    if (typeof navigator === 'undefined' || !navigator.canShare?.({ files: [file] })) {
      return { ok: false, method: 'none', message: '' }
    }
    await navigator.share({
      files: [file],
      title: 'AIZIO 녹화',
      text: name,
    })
    return {
      ok: true,
      method: 'share',
      message: isLikelyIos()
        ? '공유 시트에서 「비디오 저장」을 누르면 사진첩에 들어갑니다.'
        : '공유 시트를 열었습니다. 갤러리/사진첩으로 저장하세요.',
    }
  } catch (err) {
    const errName = err instanceof Error ? err.name : ''
    if (errName === 'AbortError') {
      return {
        ok: true,
        method: 'share',
        message: '공유를 취소했습니다. 「공유」로 다시 사진첩에 저장할 수 있어요.',
      }
    }
    return { ok: false, method: 'none', message: '' }
  }
}

function tryDownloadFile(clip: RecordedClip): AutoSaveResult {
  try {
    const url = URL.createObjectURL(clip.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = clip.name
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => revokeUrl(url), 8000)
    return {
      ok: true,
      method: 'download',
      message: '다운로드를 시작했습니다.',
    }
  } catch {
    return { ok: false, method: 'none', message: '' }
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
