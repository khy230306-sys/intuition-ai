export interface LangDef {
  code: string // MyMemory / BCP47 short: en, ko, ja
  bcp47: string // for SpeechRecognition / TTS
  name: string
  aliases: string[]
}

/** Widely used languages for realtime interpretation. */
export const LANGS: LangDef[] = [
  { code: 'ko', bcp47: 'ko-KR', name: '한국어', aliases: ['한국말', '한글', 'korean', 'kr'] },
  { code: 'en', bcp47: 'en-US', name: '영어', aliases: ['english', '잉글리시', '영문'] },
  { code: 'ja', bcp47: 'ja-JP', name: '일본어', aliases: ['일본말', 'japanese', '일어'] },
  { code: 'zh-CN', bcp47: 'zh-CN', name: '중국어', aliases: ['중국말', 'chinese', '북경어', '만다린', 'zh'] },
  { code: 'zh-TW', bcp47: 'zh-TW', name: '중국어(번체)', aliases: ['대만어', '번체'] },
  { code: 'es', bcp47: 'es-ES', name: '스페인어', aliases: ['spanish', '에스파뇰'] },
  { code: 'fr', bcp47: 'fr-FR', name: '프랑스어', aliases: ['french', '불어'] },
  { code: 'de', bcp47: 'de-DE', name: '독일어', aliases: ['german', '도이치'] },
  { code: 'pt', bcp47: 'pt-BR', name: '포르투갈어', aliases: ['portuguese', '브라질어'] },
  { code: 'it', bcp47: 'it-IT', name: '이탈리아어', aliases: ['italian'] },
  { code: 'ru', bcp47: 'ru-RU', name: '러시아어', aliases: ['russian'] },
  { code: 'vi', bcp47: 'vi-VN', name: '베트남어', aliases: ['vietnamese'] },
  { code: 'th', bcp47: 'th-TH', name: '태국어', aliases: ['thai'] },
  { code: 'id', bcp47: 'id-ID', name: '인도네시아어', aliases: ['indonesian', 'bahasa'] },
  { code: 'ms', bcp47: 'ms-MY', name: '말레이어', aliases: ['malay'] },
  { code: 'hi', bcp47: 'hi-IN', name: '힌디어', aliases: ['hindi'] },
  { code: 'ar', bcp47: 'ar-SA', name: '아랍어', aliases: ['arabic'] },
  { code: 'tr', bcp47: 'tr-TR', name: '터키어', aliases: ['turkish'] },
  { code: 'pl', bcp47: 'pl-PL', name: '폴란드어', aliases: ['polish'] },
  { code: 'nl', bcp47: 'nl-NL', name: '네덜란드어', aliases: ['dutch'] },
  { code: 'sv', bcp47: 'sv-SE', name: '스웨덴어', aliases: ['swedish'] },
  { code: 'uk', bcp47: 'uk-UA', name: '우크라이나어', aliases: ['ukrainian'] },
  { code: 'cs', bcp47: 'cs-CZ', name: '체코어', aliases: ['czech'] },
  { code: 'ro', bcp47: 'ro-RO', name: '루마니아어', aliases: ['romanian'] },
  { code: 'el', bcp47: 'el-GR', name: '그리스어', aliases: ['greek'] },
  { code: 'he', bcp47: 'he-IL', name: '히브리어', aliases: ['hebrew'] },
  { code: 'fa', bcp47: 'fa-IR', name: '페르시아어', aliases: ['farsi', 'persian'] },
  { code: 'bn', bcp47: 'bn-BD', name: '벵골어', aliases: ['bengali'] },
  { code: 'ta', bcp47: 'ta-IN', name: '타밀어', aliases: ['tamil'] },
  { code: 'tl', bcp47: 'fil-PH', name: '필리핀어', aliases: ['tagalog', 'filipino'] },
]

export function findLang(raw: string): LangDef | null {
  const q = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!q) return null
  for (const l of LANGS) {
    if (l.code.toLowerCase() === q || l.bcp47.toLowerCase() === q) return l
    if (l.name.replace(/\s+/g, '') === q) return l
    if (l.aliases.some((a) => a.replace(/\s+/g, '').toLowerCase() === q)) return l
  }
  for (const l of LANGS) {
    if (q.includes(l.name.replace(/\s+/g, '')) || l.aliases.some((a) => q.includes(a.toLowerCase()))) return l
  }
  return null
}

export function detectLangCode(text: string): string {
  const t = text.trim()
  if (!t) return 'en'
  if (/[\u3040-\u30ff]/.test(t)) return 'ja'
  if (/[\u0400-\u04ff]/.test(t)) return 'ru'
  if (/[\u0600-\u06ff]/.test(t)) return 'ar'
  if (/[\u0900-\u097f]/.test(t)) return 'hi'
  if (/[\u0e00-\u0e7f]/.test(t)) return 'th'
  if (/[\uac00-\ud7af]/.test(t)) return 'ko'
  // CJK without kana → Chinese
  if (/[\u4e00-\u9fff]/.test(t)) return 'zh-CN'
  if (/[äöüß]/i.test(t)) return 'de'
  if (/[àâçéèêëïîôùûü]/i.test(t)) return 'fr'
  if (/[áéíóúñ¿¡]/i.test(t)) return 'es'
  return 'en'
}

export interface TranslateResult {
  ok: boolean
  text: string
  from: string
  to: string
  error?: string
}

export async function translateText(text: string, from: string, to: string): Promise<TranslateResult> {
  const q = text.trim()
  if (!q) return { ok: false, text: '', from, to, error: '번역할 문장이 없습니다.' }
  if (from === to) return { ok: true, text: q, from, to }

  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q.slice(0, 450))}` +
    `&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`

  try {
    const res = await fetch(url)
    if (!res.ok) return { ok: false, text: '', from, to, error: `번역 서버 오류 (${res.status})` }
    const data = (await res.json()) as {
      responseData?: { translatedText?: string }
      responseStatus?: number | string
      quotaFinished?: boolean
    }
    const out = data.responseData?.translatedText?.trim() || ''
    const status = Number(data.responseStatus)
    if (!out || status !== 200) {
      return {
        ok: false,
        text: '',
        from,
        to,
        error: data.quotaFinished ? '무료 번역 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.' : '번역 결과를 받지 못했습니다.',
      }
    }
    // MyMemory sometimes echoes weird empty/garbage
    if (out === q && from !== to && q.length < 3) {
      return { ok: false, text: '', from, to, error: '번역 신뢰도가 낮습니다. 문장을 조금 더 길게 입력해 주세요.' }
    }
    return { ok: true, text: out, from, to }
  } catch {
    return { ok: false, text: '', from, to, error: '네트워크 오류로 번역하지 못했습니다.' }
  }
}

export function langLabel(code: string): string {
  return findLang(code)?.name || code
}

export function bcp47(code: string): string {
  return findLang(code)?.bcp47 || (code.includes('-') ? code : `${code}`)
}

export function listLanguagesHelp(): string {
  return LANGS.map((l) => `${l.name}(${l.code})`).join(', ')
}
