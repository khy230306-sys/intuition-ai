import { getSettings } from './store'

let unlocked = false
let lastText = ''
let lastAt = 0

export function unlockSpeech() {
  unlocked = true
  try {
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    window.speechSynthesis.speak(u)
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

export function speak(text: string, lang = 'ko-KR') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  if (getSettings().muteSpeech) return
  const clean = text.replace(/[^\p{L}\p{N}\s.!?,~…·]/gu, '').trim()
  if (!clean) return

  // Debounce identical/rapid chatter that causes lag on mobile
  const now = Date.now()
  if (clean === lastText && now - lastAt < 450) return
  if (now - lastAt < 120) return
  lastText = clean
  lastAt = now

  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = lang
    u.rate = 0.95
    u.pitch = 1.15
    window.speechSynthesis.speak(u)
    unlocked = true
  } catch {
    /* ignore */
  }
}

export function cheer() {
  const lines = ['잘했어요!', '최고예요!', '멋져요!', '부릉부릉 잘했어요!', '대단해요!']
  speak(lines[Math.floor(Math.random() * lines.length)]!)
}

export function isSpeechUnlocked() {
  return unlocked
}
