import type { CustomerParse } from './types'

/** True when utterance clearly targets customer CRM (not casual “손님” talk). */
export function wantsCustomers(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/(손님|고객)\s*(관리|목록|리스트|명단|장부)|고객\s*관리|crm|손님관리/i.test(t)) return true
  if (/^(손님|고객)\s*(열어|보여|가|화면)/i.test(t)) return true
  if (/(손님|고객)\s*(추가|등록|저장|삭제|지워|찾아|검색|누구)/i.test(t)) return true
  if (/오늘\s*생일\s*(인\s*)?(손님|고객)/i.test(t)) return true
  if (/(손님|고객)\s+.+\s*(찾아|검색|알려|생일)/i.test(t)) return true
  // "이름 생일 알려줘" style with 손님 context already covered; avoid bare 손님 alone
  return false
}

export function parseCustomerIntent(text: string): CustomerParse | null {
  const t = text.trim()
  if (!t || !wantsCustomers(t)) return null

  if (/도움|사용법|어떻게/i.test(t)) return { kind: 'help' }
  if (/오늘\s*생일/i.test(t)) return { kind: 'birthdays_today' }
  if (/(목록|리스트|명단|전부|전체)\s*(보여|열어|알려)?/i.test(t) || /^(손님|고객)\s*(목록|리스트)$/i.test(t)) {
    return { kind: 'list' }
  }

  const del = t.match(/(?:손님|고객)\s*(?:삭제|지워|제거)\s*[:：]?\s*(.+)$/i)
  if (del?.[1]) return { kind: 'delete', query: del[1].trim() }

  const add =
    t.match(
      /(?:손님|고객)\s*(?:추가|등록|저장)\s*[:：]?\s*(.+?)(?:\s+(\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2}))?(?:\s+(.+))?$/i,
    ) ||
    t.match(
      /(.+?)\s*(?:손님|고객)\s*(?:추가|등록)(?:\s+(\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2}))?(?:\s+(.+))?$/i,
    )
  if (add?.[1] && !/^(손님|고객)$/i.test(add[1].trim())) {
    return {
      kind: 'add',
      name: add[1].trim().replace(/^(?:이름\s*)/, ''),
      birthday: add[2] || null,
      memo: add[3]?.trim() || '',
    }
  }

  const search =
    t.match(/(?:손님|고객)\s*(?:찾아|검색|알려|누구)\s*[:：]?\s*(.+)$/i) ||
    t.match(/(.+?)\s*(?:손님|고객)?\s*(?:찾아줘|검색해|생일\s*알려)/i)
  if (search?.[1] && search[1].length <= 40) {
    const q = search[1].trim()
    if (q && !/^(손님|고객|관리|목록)$/i.test(q)) return { kind: 'search', query: q }
  }

  if (/(열어|보여|가줘|화면|관리)/i.test(t)) return { kind: 'open' }
  return { kind: 'open' }
}
