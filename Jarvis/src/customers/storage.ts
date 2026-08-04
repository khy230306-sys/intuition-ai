import type { CustomerRecord } from './types'

export const CUSTOMERS_STORAGE_KEY = 'jarvis_customers_v1'
const MAX = 300

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `cust_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function read(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CustomerRecord[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((c) => c && typeof c.name === 'string' && c.name.trim())
  } catch {
    return []
  }
}

function write(items: CustomerRecord[]): void {
  localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(items.slice(0, MAX)))
}

export function loadCustomers(): CustomerRecord[] {
  return read().sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export function saveCustomers(items: CustomerRecord[]): void {
  write(items)
}

/** Normalize birthday to YYYY-MM-DD or MM-DD; null if empty/invalid. */
export function normalizeBirthday(raw: string | null | undefined): string | null {
  const s = String(raw || '')
    .trim()
    .replace(/[./]/g, '-')
  if (!s) return null
  const full = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (full) {
    const y = full[1]
    const m = full[2].padStart(2, '0')
    const d = full[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const md = s.match(/^(\d{1,2})-(\d{1,2})$/)
  if (md) {
    const m = md[1].padStart(2, '0')
    const d = md[2].padStart(2, '0')
    return `${m}-${d}`
  }
  return null
}

export function formatBirthdayDisplay(b: string | null): string {
  if (!b) return '미등록'
  if (/^\d{4}-\d{2}-\d{2}$/.test(b)) {
    const [y, m, d] = b.split('-')
    return `${y}년 ${Number(m)}월 ${Number(d)}일`
  }
  if (/^\d{2}-\d{2}$/.test(b)) {
    const [m, d] = b.split('-')
    return `${Number(m)}월 ${Number(d)}일`
  }
  return b
}

export function birthdayMonthDay(b: string | null): string | null {
  if (!b) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(b)) return b.slice(5)
  if (/^\d{2}-\d{2}$/.test(b)) return b
  return null
}

export function upsertCustomer(input: {
  name: string
  birthday?: string | null
  phone?: string | null
  memo?: string
  id?: string
}): CustomerRecord {
  const name = String(input.name || '')
    .trim()
    .slice(0, 40)
  if (!name) throw new Error('name_required')
  const now = nowIso()
  const items = read()
  const birthday = normalizeBirthday(input.birthday ?? null)
  const phone = String(input.phone || '')
    .trim()
    .slice(0, 40) || null
  const memo = String(input.memo || '')
    .trim()
    .slice(0, 200)

  let found = input.id ? items.find((c) => c.id === input.id) : undefined
  if (!found) {
    found = items.find((c) => c.name.toLowerCase() === name.toLowerCase())
  }

  if (found) {
    found.name = name
    if (input.birthday !== undefined) found.birthday = birthday
    if (input.phone !== undefined) found.phone = phone
    if (input.memo !== undefined) found.memo = memo
    found.updatedAt = now
    write(items)
    return found
  }

  const rec: CustomerRecord = {
    id: uid(),
    name,
    birthday,
    phone,
    memo,
    createdAt: now,
    updatedAt: now,
  }
  items.unshift(rec)
  write(items)
  return rec
}

export function deleteCustomer(id: string): boolean {
  const items = read()
  const next = items.filter((c) => c.id !== id)
  if (next.length === items.length) return false
  write(next)
  return true
}

export function deleteCustomerByQuery(query: string): CustomerRecord | null {
  const hit = findCustomers(query)[0]
  if (!hit) return null
  deleteCustomer(hit.id)
  return hit
}

export function findCustomers(query: string): CustomerRecord[] {
  const q = query.trim().toLowerCase()
  if (!q) return loadCustomers()
  return loadCustomers().filter((c) => {
    const blob = `${c.name} ${c.memo} ${c.phone || ''} ${c.birthday || ''}`.toLowerCase()
    return blob.includes(q) || c.name.toLowerCase().startsWith(q)
  })
}

export function customersWithBirthdayToday(now = new Date()): CustomerRecord[] {
  const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return loadCustomers().filter((c) => birthdayMonthDay(c.birthday) === md)
}

/** Diagnostics — counts only, no names/phones/birthdays. */
export function customersDiagSnapshot(): Record<string, unknown> {
  const items = read()
  return {
    count: items.length,
    withBirthday: items.filter((c) => Boolean(c.birthday)).length,
    withPhone: items.filter((c) => Boolean(c.phone)).length,
  }
}
