/**
 * Lecture recorder — MediaRecorder with pause/resume, markers, IndexedDB save.
 */

import { deleteCampusBlob, putCampusBlob } from '../blobStore'
import { campusId, nowIso } from '../id'
import { loadCampusStore, updateCampusStore } from '../storage'
import type { LectureRecording, NoteMarker } from '../types'

export type RecorderState = {
  active: boolean
  paused: boolean
  courseId: string
  startedAt: number
  elapsedMs: number
  markers: NoteMarker[]
  error: string
}

type Internal = {
  media: MediaStream | null
  recorder: MediaRecorder | null
  chunks: Blob[]
  state: RecorderState
  tick: number | null
  mimeType: string
}

const internal: Internal = {
  media: null,
  recorder: null,
  chunks: [],
  state: {
    active: false,
    paused: false,
    courseId: '',
    startedAt: 0,
    elapsedMs: 0,
    markers: [],
    error: '',
  },
  tick: null,
  mimeType: 'audio/webm',
}

function pickMime(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

function bumpElapsed(): void {
  if (!internal.state.active || internal.state.paused) return
  internal.state.elapsedMs = Date.now() - internal.state.startedAt
}

export function getRecorderState(): RecorderState {
  bumpElapsed()
  return { ...internal.state, markers: [...internal.state.markers] }
}

export async function startLectureRecording(courseId: string): Promise<RecorderState> {
  if (internal.state.active) throw new Error('이미 녹음 중입니다.')
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('이 기기에서 녹음을 지원하지 않습니다.')
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickMime()
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream)
  internal.media = stream
  internal.recorder = recorder
  internal.chunks = []
  internal.mimeType = recorder.mimeType || mimeType || 'audio/webm'
  internal.state = {
    active: true,
    paused: false,
    courseId,
    startedAt: Date.now(),
    elapsedMs: 0,
    markers: [],
    error: '',
  }
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) internal.chunks.push(ev.data)
  }
  // timeslice keeps memory bounded for long lectures
  recorder.start(2000)
  if (internal.tick) window.clearInterval(internal.tick)
  internal.tick = window.setInterval(bumpElapsed, 500)
  return getRecorderState()
}

export function pauseLectureRecording(): RecorderState {
  if (internal.recorder && internal.state.active && !internal.state.paused) {
    if (internal.recorder.state === 'recording') internal.recorder.pause()
    bumpElapsed()
    internal.state.paused = true
  }
  return getRecorderState()
}

export function resumeLectureRecording(): RecorderState {
  if (internal.recorder && internal.state.active && internal.state.paused) {
    if (internal.recorder.state === 'paused') internal.recorder.resume()
    // adjust startedAt so elapsed stays continuous
    internal.state.startedAt = Date.now() - internal.state.elapsedMs
    internal.state.paused = false
  }
  return getRecorderState()
}

export function addRecordingMarker(
  kind: NoteMarker['kind'],
  note = '',
): NoteMarker | null {
  if (!internal.state.active) return null
  bumpElapsed()
  const marker: NoteMarker = {
    id: campusId('mrk'),
    atMs: internal.state.elapsedMs,
    kind,
    note,
  }
  internal.state.markers.push(marker)
  return marker
}

export async function stopLectureRecording(title?: string): Promise<LectureRecording> {
  if (!internal.recorder || !internal.state.active) {
    throw new Error('진행 중인 녹음이 없습니다.')
  }
  const recorder = internal.recorder
  const courseId = internal.state.courseId
  const markers = [...internal.state.markers]
  const startedAt = internal.state.startedAt

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
    if (recorder.state !== 'inactive') recorder.stop()
    else resolve()
  })

  bumpElapsed()
  const durationMs = Math.max(0, Date.now() - startedAt)
  const blob = new Blob(internal.chunks, { type: internal.mimeType })
  const blobKey = campusId('aud')
  await putCampusBlob(blobKey, blob)

  internal.media?.getTracks().forEach((t) => t.stop())
  if (internal.tick) window.clearInterval(internal.tick)
  internal.media = null
  internal.recorder = null
  internal.chunks = []
  internal.tick = null
  internal.state = {
    active: false,
    paused: false,
    courseId: '',
    startedAt: 0,
    elapsedMs: 0,
    markers: [],
    error: '',
  }

  const now = nowIso()
  const rec: LectureRecording = {
    id: campusId('rec'),
    courseId,
    title: (title || `강의 녹음 ${now.slice(0, 16).replace('T', ' ')}`).slice(0, 120),
    blobKey,
    durationMs,
    status: 'saved',
    markers,
    createdAt: now,
    updatedAt: now,
  }
  updateCampusStore((s) => {
    s.recordings.unshift(rec)
  })
  return rec
}

export async function deleteLectureRecording(id: string): Promise<boolean> {
  const rec = loadCampusStore().recordings.find((r) => r.id === id)
  if (!rec) return false
  try {
    await deleteCampusBlob(rec.blobKey)
  } catch {
    /* ignore */
  }
  updateCampusStore((s) => {
    s.recordings = s.recordings.filter((r) => r.id !== id)
    s.transcripts = s.transcripts.filter((t) => t.recordingId !== id)
  })
  return true
}
