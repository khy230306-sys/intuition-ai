import type { RelationCode } from './types'

export type RelationDef = {
  code: RelationCode
  ko: string[]
  en: string[]
  ja: string[]
  vi: string[]
}

/** Internal code ↔ surface aliases (ko primary for matching). */
export const RELATION_CATALOG: RelationDef[] = [
  { code: 'mother', ko: ['엄마', '어머니', '모친'], en: ['mom', 'mother'], ja: ['母', 'お母さん', 'ママ'], vi: ['mẹ', 'mẹ ơi'] },
  { code: 'father', ko: ['아빠', '아버지', '부친'], en: ['dad', 'father'], ja: ['父', 'お父さん', 'パパ'], vi: ['bố', 'cha'] },
  { code: 'spouse', ko: ['배우자', '남편', '아내', '와이프', '신랑', '신부'], en: ['spouse', 'husband', 'wife'], ja: ['配偶者', '夫', '妻'], vi: ['vợ', 'chồng'] },
  { code: 'son', ko: ['아들', '아들내미'], en: ['son'], ja: ['息子'], vi: ['con trai'] },
  { code: 'daughter', ko: ['딸', '딸내미'], en: ['daughter'], ja: ['娘'], vi: ['con gái'] },
  { code: 'elder_brother', ko: ['형', '오빠'], en: ['older brother', 'brother'], ja: ['兄', 'お兄さん'], vi: ['anh'] },
  { code: 'elder_sister', ko: ['누나', '언니'], en: ['older sister', 'sister'], ja: ['姉', 'お姉さん'], vi: ['chị'] },
  { code: 'younger_sibling', ko: ['동생', '남동생', '여동생'], en: ['younger sibling', 'younger brother', 'younger sister'], ja: ['弟', '妹', '弟妹'], vi: ['em'] },
  { code: 'grandmother', ko: ['할머니', '외할머니'], en: ['grandmother', 'grandma'], ja: ['祖母', 'おばあちゃん'], vi: ['bà'] },
  { code: 'grandfather', ko: ['할아버지', '외할아버지'], en: ['grandfather', 'grandpa'], ja: ['祖父', 'おじいちゃん'], vi: ['ông'] },
  { code: 'aunt', ko: ['이모', '고모', '숙모'], en: ['aunt'], ja: ['叔母', '伯母'], vi: ['dì', 'cô'] },
  { code: 'uncle', ko: ['삼촌', '외삼촌', '큰아버지', '작은아버지'], en: ['uncle'], ja: ['叔父', '伯父'], vi: ['chú', 'bác'] },
  { code: 'friend', ko: ['친구', '베프', '절친'], en: ['friend'], ja: ['友達', '友人'], vi: ['bạn'] },
  { code: 'guardian', ko: ['보호자', '보호인'], en: ['guardian'], ja: ['保護者'], vi: ['người giám hộ'] },
]

export function primaryLabel(code: RelationCode, locale = 'ko'): string {
  const def = RELATION_CATALOG.find((d) => d.code === code)
  if (!def) return code
  if (locale.startsWith('en')) return def.en[0] || def.ko[0]!
  if (locale.startsWith('ja')) return def.ja[0] || def.ko[0]!
  if (locale.startsWith('vi')) return def.vi[0] || def.ko[0]!
  return def.ko[0]!
}

export function matchRelation(text: string): { code: RelationCode; display: string } | null {
  const t = text.replace(/\s+/g, '')
  for (const def of RELATION_CATALOG) {
    const all = [...def.ko, ...def.en, ...def.ja, ...def.vi]
    for (const a of all) {
      const compact = a.replace(/\s+/g, '')
      if (!compact) continue
      if (t.includes(compact) || text.includes(a)) {
        return { code: def.code, display: def.ko[0] || a }
      }
    }
  }
  return null
}

export function allAliases(code: RelationCode): string[] {
  const def = RELATION_CATALOG.find((d) => d.code === code)
  if (!def) return []
  return [...def.ko, ...def.en, ...def.ja, ...def.vi]
}
