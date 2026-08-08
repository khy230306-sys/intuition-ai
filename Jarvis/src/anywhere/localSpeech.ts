/**
 * Local STT / TTS abstractions.
 * TTS: device speechSynthesis (offline if voice resources present).
 * STT: optional Whisper Tiny pack via transformers.js; else honest failure (no mock).
 */

import { getPackState, setPackState } from './packState'
import { probeDeviceCapability } from './deviceCapability'
import { configureTransformersEnv } from './transformersEnv'

export async function localSpeak(text: string, lang = 'ko-KR'): Promise<{ ok: boolean; reason?: string }> {
  if (typeof speechSynthesis === 'undefined') {
    return { ok: false, reason: '이 기기는 음성 출력을 지원하지 않습니다.' }
  }
  const utter = new SpeechSynthesisUtterance(String(text || '').slice(0, 600))
  utter.lang = lang
  return await new Promise((resolve) => {
    utter.onend = () => resolve({ ok: true })
    utter.onerror = () =>
      resolve({ ok: false, reason: '음성 리소스가 없거나 오프라인 TTS를 사용할 수 없습니다.' })
    try {
      speechSynthesis.cancel()
      speechSynthesis.speak(utter)
    } catch {
      resolve({ ok: false, reason: '음성 출력에 실패했습니다.' })
    }
  })
}

export function localTtsAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined'
}

export async function localSttFromAudioBuffer(
  audio: Float32Array | ArrayBuffer,
  sampleRate = 16000,
): Promise<{ text: string } | { error: string; needInstall?: boolean }> {
  if (getPackState('stt-whisper-tiny').status !== 'installed') {
    return {
      error:
        '오프라인 음성인식 팩이 아직 설치되지 않았어요. 설정 → AIZIO Anywhere에서 Whisper Tiny를 다운로드해 주세요.',
      needInstall: true,
    }
  }
  try {
    const cap = await probeDeviceCapability()
    const { pipeline, env } = await import('@huggingface/transformers')
    configureTransformersEnv(env)
    const device = cap.platform === 'ios' || !cap.hasWebGpu ? 'wasm' : 'webgpu'
    const pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      device,
      dtype: 'q8',
    })
    const samples =
      audio instanceof Float32Array ? audio : new Float32Array(audio instanceof ArrayBuffer ? audio : [])
    const out = (await pipe(samples, { sampling_rate: sampleRate })) as { text?: string }
    setPackState({
      ...getPackState('stt-whisper-tiny'),
      status: 'installed',
      progress: 100,
      lastUsedAt: new Date().toISOString(),
    })
    const text = String(out?.text || '').trim()
    if (!text) return { error: '음성을 인식하지 못했어요.' }
    return { text }
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? `오프라인 음성인식 실패: ${e.message.slice(0, 140)}`
          : '오프라인 음성인식 실패',
    }
  }
}

export function sttStatusLine(): string {
  const st = getPackState('stt-whisper-tiny').status
  if (st === 'installed') return '음성 인식 · 설치됨 (Whisper Tiny)'
  if (st === 'corrupt') return '음성 인식 · 손상 · 재다운로드'
  return '음성 인식 · 설치 필요'
}
