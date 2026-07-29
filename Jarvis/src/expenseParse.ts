/** One-line expense parsing — "커피 4500", "4500원 택시", "점심 1.5만" */

export type ParsedExpense = {
  amount: number
  category: string
  note: string
}

const CATEGORY_RULES: Array<{ cat: string; re: RegExp }> = [
  { cat: '식비', re: /밥|점심|저녁|아침|식사|치킨|피자|분식|배달|편의점|마트|식료|점심값|저녁값/ },
  { cat: '카페', re: /커피|카페|스타벅스|아메리카노|라떼|디저트|베이커리/ },
  { cat: '교통', re: /택시|버스|지하철|교통|주유|주차|톨게이트|기차|KTX|비행|항공/ },
  { cat: '쇼핑', re: /쇼핑|쿠팡|무신사|옷|의류|가전|다이소/ },
  { cat: '생활', re: /생활|통신|인터넷|가스|전기|수도|관리비|월세|렌트/ },
  { cat: '건강', re: /약|병원|약국|헬스|운동|병원비/ },
  { cat: '문화', re: /영화|게임|넷플릭스|유튜브|공연|책|구독/ },
]

function inferCategory(label: string): string {
  const t = label.trim()
  for (const r of CATEGORY_RULES) {
    if (r.re.test(t)) return r.cat
  }
  if (!t || /^(기타|지출|결제|썼어)$/.test(t)) return '기타'
  // Use first token as category if short
  const first = t.split(/\s+/)[0]
  return first.slice(0, 12) || '기타'
}

function parseAmountToken(raw: string): number | null {
  const t = raw.replace(/,/g, '').trim()
  if (!t) return null
  const man = t.match(/^([\d.]+)\s*만(?:원)?$/)
  if (man) return Math.round(parseFloat(man[1]) * 10_000)
  const eok = t.match(/^([\d.]+)\s*억(?:원)?$/)
  if (eok) return Math.round(parseFloat(eok[1]) * 100_000_000)
  const plain = t.match(/^([\d.]+)\s*원?$/)
  if (plain) return parseFloat(plain[1])
  return null
}

function cleanLabel(s: string): string {
  return s
    .replace(/^(지출|썼어|결제|기록)\s*/i, '')
    .replace(/\s*(지출|썼어|결제|원)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when text looks like a one-line spend, not FX/market/reminder. */
export function wantsExpense(text: string): boolean {
  const t = text.trim()
  if (!t || t.length > 60) return false
  if (/환율|환전|달러|엔화|유로|시세|주가|장\s*시간|개장|알림|분\s*뒤|시간\s*뒤|리마인더|할\s*일|번역|통역|게임|위치/.test(t)) {
    return false
  }
  if (/(?:지출|썼어|결제)/.test(t) && /[\d]/.test(t)) return true
  if (/[\d,]+\s*원/.test(t) && !/포지션|평단|손절|진입|자본/.test(t)) return true
  // bare: 커피 4500 / 택시 12000 / 점심 1.5만
  if (/^.+?\s+[\d,]+(?:\.\d+)?\s*(?:만)?(?:원)?$/.test(t)) return true
  if (/^[\d,]+\s*(?:만)?(?:원)?\s+.+$/.test(t)) return true
  return false
}

export function parseExpenseLine(text: string): ParsedExpense | null {
  if (!wantsExpense(text)) return null
  const t = text.replace(/,/g, '').trim()

  // 지출 커피 4500원 / 썼어 택시 12000
  let m =
    t.match(/^(?:지출|썼어|결제)\s*(.+?)\s+([\d.]+)\s*(만)?\s*원?$/) ||
    t.match(/^(?:지출|썼어|결제)\s*([\d.]+)\s*(만)?\s*원?\s*(.+)$/)

  if (m) {
    // pattern A: label then amount
    if (m[0].startsWith('지출') || m[0].startsWith('썼어') || m[0].startsWith('결제')) {
      const hasLabelFirst = !/^[\d.]/.test(m[1])
      if (hasLabelFirst) {
        const amount = parseAmountToken(m[2] + (m[3] ? '만' : ''))
        if (amount == null || amount <= 0) return null
        const label = cleanLabel(m[1])
        return { amount, category: inferCategory(label), note: label }
      }
      const amount = parseAmountToken(m[1] + (m[2] ? '만' : ''))
      if (amount == null || amount <= 0) return null
      const label = cleanLabel(m[3] || '')
      return { amount, category: inferCategory(label), note: label }
    }
  }

  // 4500원 커피 / 1.5만원 점심
  m = t.match(/^([\d.]+)\s*(만)?\s*원\s*(?:지출|썼|결제)?\s*(.*)$/)
  if (m) {
    const amount = parseAmountToken(m[1] + (m[2] ? '만' : ''))
    if (amount == null || amount <= 0) return null
    const label = cleanLabel(m[3] || '기타')
    return { amount, category: inferCategory(label), note: label || '기타' }
  }

  // 커피 4500원 / 택시 1.2만 / 점심 15000
  m = t.match(/^(.+?)\s+([\d.]+)\s*(만)?\s*원?$/)
  if (m && !/^[\d.]/.test(m[1])) {
    const amount = parseAmountToken(m[2] + (m[3] ? '만' : ''))
    if (amount == null || amount <= 0 || amount > 100_000_000) return null
    const label = cleanLabel(m[1])
    if (!label) return null
    return { amount, category: inferCategory(label), note: label }
  }

  // 15000 커피
  m = t.match(/^([\d.]+)\s*(만)?\s*(?:원)?\s+(.+)$/)
  if (m) {
    const amount = parseAmountToken(m[1] + (m[2] ? '만' : ''))
    if (amount == null || amount <= 0) return null
    const label = cleanLabel(m[3])
    return { amount, category: inferCategory(label), note: label }
  }

  return null
}
