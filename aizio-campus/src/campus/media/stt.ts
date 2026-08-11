/**
 * STT: Cloud Whisper (OpenAI / Groq) → clear failure (no fake transcript).
 * Live Web Speech can be used during recording separately.
 */

import { getProviderSlot } from '../../ai-providers/providerConfig'
import { campusId, nowIso } from '../id'
import { getCampusBlob } from '../blobStore'
import { loadCampusStore, updateCampusStore } from '../storage'
import type { Transcript } from '../types'

export type SttProviderId = 'openai-whisper' | 'groq-whisper' | 'none'

export function detectSttProvider(): { id: SttProviderId; apiKey: string; base: string } {
  const openai = getProviderSlot('openai')
  if (openai.apiKey.trim()) {
    return {
      id: 'openai-whisper',
      apiKey: openai.apiKey.trim(),
      base: (openai.apiBase || 'https://api.openai.com/v1').replace(/\/$/, ''),
    }
  }
  const groq = getProviderSlot('groq')
  if (groq.apiKey.trim()) {
    return {
      id: 'groq-whisper',
      apiKey: groq.apiKey.trim(),
      base: 'https://api.groq.com/openai/v1',
    }
  }
  return { id: 'none', apiKey: '', base: '' }
}

async function whisperTranscribe(
  blob: Blob,
  apiKey: string,
  base: string,
  model: string,
): Promise<string> {
  const form = new FormData()
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  form.append('file', blob, `lecture.${ext}`)
  form.append('model', model)
  form.append('language', 'ko')
  const res = await fetch(`${base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`STT 실패 (${res.status}): ${errText.slice(0, 180)}`)
  }
  const data = (await res.json()) as { text?: string }
  return (data.text || '').trim()
}

export async function transcribeRecording(recordingId: string): Promise<Transcript> {
  const store = loadCampusStore()
  const rec = store.recordings.find((r) => r.id === recordingId)
  if (!rec) throw new Error('녹음을 찾을 수 없습니다.')

  const existing = store.transcripts.find((t) => t.recordingId === recordingId)
  const now = nowIso()
  let transcript: Transcript =
    existing ||
    ({
      id: campusId('tr'),
      recordingId,
      courseId: rec.courseId,
      text: '',
      provider: '',
      status: 'processing',
      error: '',
      createdAt: now,
      updatedAt: now,
    } as Transcript)

  updateCampusStore((s) => {
    const idx = s.transcripts.findIndex((t) => t.id === transcript.id)
    transcript = {
      ...transcript,
      status: 'processing',
      error: '',
      updatedAt: nowIso(),
    }
    if (idx >= 0) s.transcripts[idx] = transcript
    else s.transcripts.unshift(transcript)
  })

  const provider = detectSttProvider()
  if (provider.id === 'none') {
    updateCampusStore((s) => {
      const idx = s.transcripts.findIndex((t) => t.id === transcript.id)
      if (idx < 0) return
      s.transcripts[idx] = {
        ...s.transcripts[idx],
        status: 'failed',
        provider: 'none',
        error:
          '음성→텍스트를 위해 OpenAI 또는 Groq API 키가 필요합니다. 설정에서 키를 연결해 주세요.',
        updatedAt: nowIso(),
      }
      transcript = s.transcripts[idx]
    })
    return transcript
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    updateCampusStore((s) => {
      const idx = s.transcripts.findIndex((t) => t.id === transcript.id)
      if (idx < 0) return
      s.transcripts[idx] = {
        ...s.transcripts[idx],
        status: 'failed',
        provider: provider.id,
        error: '오프라인입니다. Cloud STT는 인터넷이 필요합니다.',
        updatedAt: nowIso(),
      }
      transcript = s.transcripts[idx]
    })
    return transcript
  }

  try {
    const blob = await getCampusBlob(rec.blobKey)
    if (!blob) throw new Error('녹음 파일을 찾을 수 없습니다.')
    const model = provider.id === 'groq-whisper' ? 'whisper-large-v3' : 'whisper-1'
    const text = await whisperTranscribe(blob, provider.apiKey, provider.base, model)
    if (!text) throw new Error('STT 결과가 비어 있습니다.')
    updateCampusStore((s) => {
      const idx = s.transcripts.findIndex((t) => t.id === transcript.id)
      if (idx < 0) return
      s.transcripts[idx] = {
        ...s.transcripts[idx],
        text: text.slice(0, 300_000),
        provider: provider.id,
        status: 'ready',
        error: '',
        updatedAt: nowIso(),
      }
      transcript = s.transcripts[idx]
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'STT 실패'
    updateCampusStore((s) => {
      const idx = s.transcripts.findIndex((t) => t.id === transcript.id)
      if (idx < 0) return
      s.transcripts[idx] = {
        ...s.transcripts[idx],
        status: 'failed',
        provider: provider.id,
        error: msg,
        updatedAt: nowIso(),
      }
      transcript = s.transcripts[idx]
    })
  }
  return transcript
}

/** Web Speech live partial transcript helper (optional during recording). */
export function createLiveSpeechSession(onText: (text: string, isFinal: boolean) => void): {
  start: () => void
  stop: () => void
  available: boolean
} {
  type Recog = {
    lang: string
    continuous: boolean
    interimResults: boolean
    onresult: ((ev: {
      resultIndex: number
      results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
    }) => void) | null
    onend: (() => void) | null
    start: () => void
    stop: () => void
  }
  const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null
  const SR = w
    ? ((w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => Recog) | undefined)
    : undefined

  if (!SR) {
    return { start: () => {}, stop: () => {}, available: false }
  }

  let rec: Recog | null = null
  let stopped = false

  return {
    available: true,
    start() {
      stopped = false
      rec = new SR()
      rec.lang = 'ko-KR'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (ev) => {
        let interim = ''
        let final = ''
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i]
          if (r.isFinal) final += r[0].transcript
          else interim += r[0].transcript
        }
        if (final) onText(final, true)
        else if (interim) onText(interim, false)
      }
      rec.onend = () => {
        if (!stopped) {
          try {
            rec?.start()
          } catch {
            /* ignore */
          }
        }
      }
      try {
        rec.start()
      } catch {
        /* ignore */
      }
    },
    stop() {
      stopped = true
      try {
        rec?.stop()
      } catch {
        /* ignore */
      }
      rec = null
    },
  }
}
