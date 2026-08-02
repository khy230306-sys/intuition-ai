import type { AlertKind } from '@/utils/timer'

const MESSAGES: Record<AlertKind, string> = {
  five_min: '현재 레벨이 5분 남았습니다.',
  one_min: '블라인드가 곧 상승합니다.',
  ten_sec: '10초 남았습니다.',
  level_end: '현재 레벨이 종료되었습니다.',
  break_start: '브레이크가 시작되었습니다.',
  break_end: '브레이크가 종료되었습니다.',
  reg_close: '등록이 마감되었습니다.',
  rebuy_end: '리바이가 종료되었습니다.',
}

export function alertMessage(kind: AlertKind): string {
  return MESSAGES[kind]
}

export function playBeep(muted: boolean) {
  if (muted || typeof window === 'undefined') return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 880
    gain.gain.value = 0.05
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.18)
    window.setTimeout(() => void ctx.close(), 300)
  } catch {
    // ignore
  }
}

export function speakAlert(kind: AlertKind, muted: boolean, voiceEnabled: boolean) {
  if (muted || !voiceEnabled || typeof window === 'undefined') {
    playBeep(muted)
    return
  }
  if (!('speechSynthesis' in window)) {
    playBeep(muted)
    return
  }
  const utter = new SpeechSynthesisUtterance(alertMessage(kind))
  utter.lang = 'ko-KR'
  utter.rate = 1
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utter)
}

export function vibrateAlert(enabled: boolean) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return
  navigator.vibrate([120, 60, 120])
}

export function flashScreen() {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.className = 'pd-flash'
  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), 500)
}
