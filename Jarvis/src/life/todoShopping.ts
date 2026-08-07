/**
 * Sentence-structure priority for TODO vs shopping/grocery.
 * Prefer explicit frames over single keyword collisions (장보기).
 */

export type TodoShoppingKind = 'todo.create' | 'shopping.add' | 'shopping.list' | 'none'

export type TodoShoppingHit = {
  kind: TodoShoppingKind
  title?: string
  items?: string[]
}

function splitItems(raw: string): string[] {
  return String(raw || '')
    .split(/[,，、과와랑및\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Explicit TODO create frames — wins over bare 장보기 keyword. */
export function isTodoCreateUtterance(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || /번역|통역/i.test(t)) return false
  if (/^장바구니|^장보기\s*목록|마트에서\s*살/.test(t)) return false
  // 할 일 [title] 추가|등록|만들
  if (/할\s*일\s+.+\s*(?:추가|등록|만들)/i.test(t)) return true
  // 할 일 추가|등록 [title]
  if (/할\s*일\s*(?:추가|등록|만들)/i.test(t)) return true
  if (/투두\s*추가/i.test(t)) return true
  if (/할\s*일에\s*넣/i.test(t)) return true
  if (/^(?:오늘|내일|모레)?\s*할\s*일\s+.+/i.test(t) && /추가|등록|만들/.test(t)) return true
  return false
}

export function extractTodoTitle(text: string): string {
  const t = String(text || '').trim()
  // 할 일 추가 장보기 / 할 일 등록 우유
  let m = t.match(/할\s*일\s*(?:추가|등록|만들)(?:해(?:줘|요)?)?\s*(.+)$/i)
  if (m?.[1]?.trim()) return m[1].trim()
  // 할 일 장보기 추가 / 오늘 할 일 운동 추가 / 내일 할 일 병원 전화 추가
  m = t.match(/(?:오늘|내일|모레)?\s*할\s*일\s+(.+?)\s*(?:추가|등록|만들)(?:해(?:줘|요)?)?$/i)
  if (m?.[1]?.trim()) return m[1].trim()
  // 투두 추가 X
  m = t.match(/투두\s*추가\s*(.+)$/i)
  if (m?.[1]?.trim()) return m[1].trim()
  m = t.match(/할\s*일에\s*넣(?:어)?(?:줘)?\s*(.+)$/i)
  if (m?.[1]?.trim()) return m[1].trim()
  // fallback: strip frame words
  return t
    .replace(/^(?:오늘|내일|모레)\s*/i, '')
    .replace(/할\s*일/gi, ' ')
    .replace(/투두/gi, ' ')
    .replace(/(?:추가|등록|만들)(?:해(?:줘|요)?)?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Shopping / grocery — only when not framed as TODO. */
export function isShoppingAddUtterance(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || isTodoCreateUtterance(t)) return false
  if (/목록|보여|리스트/.test(t) && !/(추가|넣어)/.test(t)) return false
  if (/장바구니에?\s*.+/.test(t) && /(추가|넣어)/.test(t)) return true
  if (/^장바구니\s*(?:추가)?\s*.+/.test(t)) return true
  if (/장보기\s*목록에?\s*.+/.test(t) && /(넣|추가)/.test(t)) return true
  if (/마트에서\s*살\s*것/.test(t)) return true
  if (/살\s*것\s*(추가|넣)/.test(t)) return true
  // "우유 장바구니 추가" / "계란 장보기 넣어"
  if (/.+\s*(?:장바구니|장보기)\s*(?:추가|넣어)/.test(t)) return true
  // leading 장보기 without 할 일 frame
  if (/^장보기\s*(?:추가)?\s*.+/.test(t)) return true
  return false
}

export function extractShoppingItems(text: string): string[] {
  const t = String(text || '').trim()
  let m =
    t.match(/장바구니에?\s*(.+?)\s*(?:추가|넣어)(?:줘|요)?$/i) ||
    t.match(/^장바구니\s*(?:추가)?\s*(.+)$/i) ||
    t.match(/장보기\s*목록에?\s*(.+?)\s*(?:넣|추가)/i) ||
    t.match(/마트에서\s*살\s*것(?:에)?\s*(?:추가|넣(?:어)?)?(?:\s*(.+))?$/i) ||
    t.match(/살\s*것\s*(?:추가|넣(?:어)?)\s*(.+)$/i) ||
    t.match(/^(.+?)\s*(?:장바구니|장보기)\s*(?:추가|넣어)/i) ||
    t.match(/^장보기\s*(?:추가)?\s*(.+)$/i)
  if (!m) return []
  const raw = (m[1] || '').trim()
  if (!raw || /^(추가|넣어|해줘)$/.test(raw)) {
    // "마트에서 살 것 추가" with no item — empty
    return []
  }
  return splitItems(raw.replace(/^(?:에|을|를)\s*/, ''))
}

export function classifyTodoShopping(text: string): TodoShoppingHit {
  const t = String(text || '').trim()
  if (!t) return { kind: 'none' }
  if (/장바구니\s*(목록|보여|리스트)|장보기\s*목록\s*(보여|알려)?/.test(t) && !/(추가|넣어)/.test(t)) {
    return { kind: 'shopping.list' }
  }
  if (isTodoCreateUtterance(t)) {
    return { kind: 'todo.create', title: extractTodoTitle(t) }
  }
  if (isShoppingAddUtterance(t)) {
    return { kind: 'shopping.add', items: extractShoppingItems(t) }
  }
  return { kind: 'none' }
}
