export type RecordMode = 'display' | 'camera'
export type RecordFacing = 'user' | 'environment'
export type RecordPhase = 'idle' | 'preview' | 'recording' | 'stopping' | 'done' | 'error'

export type ScreenRecordState = {
  mode: RecordMode
  facing: RecordFacing
  includeMic: boolean
  phase: RecordPhase
  status: string
  elapsedMs: number
  /** Object URL for live preview / last take */
  previewUrl: string
  /** Object URL for finished recording (download/share) */
  resultUrl: string
  resultMime: string
  resultBytes: number
  resultName: string
  error: string
  /** Capability notes shown in UI */
  displaySupported: boolean
  recorderSupported: boolean
  isIosHint: boolean
}

export type RecordedClip = {
  blob: Blob
  mime: string
  name: string
  bytes: number
  createdAt: number
  mode: RecordMode
}
