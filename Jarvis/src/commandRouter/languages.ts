/** Target language recognition for command routing. */

export type LangHit = { code: string; name: string }

const LANGS: Array<{ code: string; name: string; aliases: string[] }> = [
  { code: 'en', name: '영어', aliases: ['english', '영문', '미국말', '영국말', '잉글리시'] },
  { code: 'ja', name: '일본어', aliases: ['japanese', '일본말', '일어'] },
  { code: 'zh-CN', name: '중국어', aliases: ['chinese', '중국말', '중문', '북경어'] },
  { code: 'ko', name: '한국어', aliases: ['korean', '한국말', '국어'] },
  { code: 'es', name: '스페인어', aliases: ['spanish', '스페인말'] },
  { code: 'fr', name: '프랑스어', aliases: ['french', '프랑스말'] },
  { code: 'de', name: '독일어', aliases: ['german', '독일말'] },
  { code: 'vi', name: '베트남어', aliases: ['vietnamese', '베트남말'] },
  { code: 'th', name: '태국어', aliases: ['thai', '태국말'] },
]

function matchLangToken(token: string): LangHit | null {
  const t = token.trim().toLowerCase()
  if (!t) return null
  for (const lang of LANGS) {
    const keys = [lang.name, ...lang.aliases].map((k) => k.toLowerCase())
    if (keys.includes(t)) return { code: lang.code, name: lang.name }
  }
  return null
}

export function findTargetLanguage(text: string): LangHit | null {
  const raw = text.trim()
  const lower = raw.toLowerCase()
  const targeted =
    raw.match(/([가-힣A-Za-z\-]+(?:어|말))\s*(?:로|으로)/) ||
    raw.match(/(english|japanese|chinese|korean|spanish|french|german|vietnamese|thai)\s*(?:로|으로|로\s*번역)?/i)
  if (targeted?.[1]) {
    const hit = matchLangToken(targeted[1])
    if (hit) return hit
  }
  // Prefer longer names first
  const ordered = [...LANGS].sort(
    (a, b) => Math.max(...b.aliases.map((x) => x.length), b.name.length) - Math.max(...a.aliases.map((x) => x.length), a.name.length),
  )
  for (const lang of ordered) {
    for (const k of [lang.name, ...lang.aliases]) {
      if (lower.includes(k.toLowerCase())) return { code: lang.code, name: lang.name }
    }
  }
  return null
}

export function langName(code: string): string {
  return LANGS.find((l) => l.code === code)?.name || code
}
