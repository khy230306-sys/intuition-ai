/** Downloadable Local AI / translation / STT packs — not bundled in the app shell. */

export type PackKind = 'chat' | 'translate' | 'stt' | 'tts'

export type ModelPackDef = {
  id: string
  kind: PackKind
  tier: 'LITE' | 'STANDARD' | 'ADVANCED'
  label: string
  /** Hugging Face model id for transformers.js */
  hfId: string
  task: 'text-generation' | 'translation' | 'automatic-speech-recognition'
  dtype: 'q4' | 'q8' | 'fp16' | 'fp32'
  /** Approximate download size for UI */
  sizeMb: number
  langs?: string[]
  notes: string
  /** iPhone Safari: supported | limited | unsupported */
  iosSupport: 'supported' | 'limited' | 'unsupported'
}

export const CHAT_PACKS: ModelPackDef[] = [
  {
    id: 'chat-smollm2-135m',
    kind: 'chat',
    tier: 'LITE',
    label: '오프라인 AI · Lite (SmolLM2 135M)',
    hfId: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    task: 'text-generation',
    dtype: 'q4',
    sizeMb: 90,
    notes: 'WASM 경량 대화. iPhone에서도 시도 가능(느릴 수 있음).',
    iosSupport: 'limited',
  },
  {
    id: 'chat-smollm2-360m',
    kind: 'chat',
    tier: 'STANDARD',
    label: '오프라인 AI · Standard (SmolLM2 360M)',
    hfId: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    task: 'text-generation',
    dtype: 'q4',
    sizeMb: 220,
    notes: '중간 품질. 메모리 여유 기기 권장.',
    iosSupport: 'limited',
  },
]

export const TRANSLATE_PACKS: ModelPackDef[] = [
  {
    id: 'mt-ko-en',
    kind: 'translate',
    tier: 'LITE',
    label: '번역 · 한국어→영어',
    hfId: 'Xenova/opus-mt-ko-en',
    task: 'translation',
    dtype: 'q8',
    sizeMb: 75,
    langs: ['ko', 'en'],
    notes: 'MarianMT WASM. 온라인 없이 문장 번역.',
    iosSupport: 'supported',
  },
  {
    id: 'mt-en-ko',
    kind: 'translate',
    tier: 'LITE',
    label: '번역 · 영어→한국어',
    hfId: 'Xenova/opus-mt-en-ko',
    task: 'translation',
    dtype: 'q8',
    sizeMb: 75,
    langs: ['en', 'ko'],
    notes: 'MarianMT WASM.',
    iosSupport: 'supported',
  },
  {
    id: 'mt-en-vi',
    kind: 'translate',
    tier: 'STANDARD',
    label: '번역 · 영어→베트남어',
    hfId: 'Xenova/opus-mt-en-vi',
    task: 'translation',
    dtype: 'q8',
    sizeMb: 70,
    langs: ['en', 'vi'],
    notes: '한국어→베트남어는 en 경유.',
    iosSupport: 'supported',
  },
  {
    id: 'mt-en-ja',
    kind: 'translate',
    tier: 'STANDARD',
    label: '번역 · 영어→일본어',
    hfId: 'Xenova/opus-mt-en-jap',
    task: 'translation',
    dtype: 'q8',
    sizeMb: 80,
    langs: ['en', 'ja'],
    notes: '모델 id는 HF 카탈로그 기준. 실패 시 재다운로드.',
    iosSupport: 'limited',
  },
  {
    id: 'mt-en-zh',
    kind: 'translate',
    tier: 'STANDARD',
    label: '번역 · 영어→중국어',
    hfId: 'Xenova/opus-mt-en-zh',
    task: 'translation',
    dtype: 'q8',
    sizeMb: 80,
    langs: ['en', 'zh'],
    notes: '한국어→중국어는 en 경유.',
    iosSupport: 'limited',
  },
]

export const STT_PACKS: ModelPackDef[] = [
  {
    id: 'stt-whisper-tiny',
    kind: 'stt',
    tier: 'ADVANCED',
    label: '오프라인 음성인식 · Whisper Tiny',
    hfId: 'Xenova/whisper-tiny',
    task: 'automatic-speech-recognition',
    dtype: 'q8',
    sizeMb: 75,
    notes: 'PWA WASM STT. iPhone은 메모리 부족 가능 — 실패 시 채팅은 유지.',
    iosSupport: 'limited',
  },
]

export function allPacks(): ModelPackDef[] {
  return [...CHAT_PACKS, ...TRANSLATE_PACKS, ...STT_PACKS]
}

export function packById(id: string): ModelPackDef | undefined {
  return allPacks().find((p) => p.id === id)
}

export function recommendChatPack(tier: 'LITE' | 'STANDARD' | 'ADVANCED'): ModelPackDef {
  if (tier === 'LITE') return CHAT_PACKS[0]!
  return CHAT_PACKS[1] || CHAT_PACKS[0]!
}
