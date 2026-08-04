import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseCustomerIntent, wantsCustomers } from './parse'
import {
  customersDiagSnapshot,
  customersWithBirthdayToday,
  findCustomers,
  formatBirthdayDisplay,
  loadCustomers,
  normalizeBirthday,
  upsertCustomer,
  deleteCustomer,
} from './storage'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})

describe('customer intent', () => {
  it('detects CRM phrases, not casual talk', () => {
    expect(wantsCustomers('손님관리 열어줘')).toBe(true)
    expect(wantsCustomers('고객 목록 보여줘')).toBe(true)
    expect(wantsCustomers('손님 추가 김철수 1990-05-15')).toBe(true)
    expect(wantsCustomers('오늘 생일인 손님')).toBe(true)
    expect(wantsCustomers('손님 이야기해 줘')).toBe(false)
    expect(wantsCustomers('날씨 알려줘')).toBe(false)
  })

  it('parses add / search / birthday', () => {
    const a = parseCustomerIntent('손님 추가 김철수 1990-05-15 단골')
    expect(a?.kind).toBe('add')
    if (a?.kind === 'add') {
      expect(a.name).toContain('김철수')
      expect(a.birthday).toMatch(/1990/)
    }
    const s = parseCustomerIntent('손님 김영희 찾아줘')
    expect(s?.kind).toBe('search')
    expect(parseCustomerIntent('오늘 생일인 손님')?.kind).toBe('birthdays_today')
  })
})

describe('customer storage', () => {
  beforeEach(() => store.clear())

  it('normalizes birthday and upserts by name', () => {
    expect(normalizeBirthday('1990.5.15')).toBe('1990-05-15')
    expect(normalizeBirthday('5-15')).toBe('05-15')
    upsertCustomer({ name: '김철수', birthday: '1990-05-15', memo: '단골' })
    upsertCustomer({ name: '김철수', phone: '010-0000-0000' })
    const list = loadCustomers()
    expect(list).toHaveLength(1)
    expect(list[0]?.phone).toContain('010')
    expect(formatBirthdayDisplay(list[0]!.birthday)).toContain('1990')
  })

  it('searches by name and finds birthday today', () => {
    const now = new Date()
    const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    upsertCustomer({ name: '박민수', birthday: `1990-${md}` })
    upsertCustomer({ name: '이수진', birthday: '1988-01-01' })
    expect(findCustomers('박민').map((c) => c.name)).toContain('박민수')
    expect(customersWithBirthdayToday(now).map((c) => c.name)).toContain('박민수')
    const id = loadCustomers().find((c) => c.name === '이수진')!.id
    deleteCustomer(id)
    expect(loadCustomers().some((c) => c.name === '이수진')).toBe(false)
  })

  it('diag omits names and phones', () => {
    upsertCustomer({ name: '비밀손님', birthday: '1990-01-01', phone: '010-9999-8888' })
    const j = JSON.stringify(customersDiagSnapshot())
    expect(j).not.toContain('비밀손님')
    expect(j).not.toContain('010-9999')
    expect(customersDiagSnapshot().count).toBe(1)
  })
})
