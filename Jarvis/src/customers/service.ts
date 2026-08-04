import {
  customersWithBirthdayToday,
  deleteCustomerByQuery,
  findCustomers,
  formatBirthdayDisplay,
  loadCustomers,
  upsertCustomer,
} from './storage'
import { parseCustomerIntent, wantsCustomers } from './parse'
import type { CustomerRecord } from './types'

export type CustomerHandleResult = {
  handled: boolean
  text: string
  speak?: boolean
  view?: 'customers'
  openSheet?: boolean
}

function formatOne(c: CustomerRecord): string {
  const parts = [`${c.name}`, `생일 ${formatBirthdayDisplay(c.birthday)}`]
  if (c.phone) parts.push(`전화 ${c.phone}`)
  if (c.memo) parts.push(c.memo)
  return parts.join(' · ')
}

export async function tryHandleCustomers(text: string): Promise<CustomerHandleResult | null> {
  if (!wantsCustomers(text)) return null
  const parsed = parseCustomerIntent(text)
  if (!parsed) return null

  if (parsed.kind === 'help' || parsed.kind === 'open') {
    return {
      handled: true,
      view: 'customers',
      speak: true,
      text:
        '손님관리 화면을 열게요. 이름·생년월일을 저장해 바로 찾을 수 있어요.\n예: 「손님 추가 김철수 1990-05-15」「손님 김철수 찾아줘」「오늘 생일인 손님」',
    }
  }

  if (parsed.kind === 'list') {
    const items = loadCustomers()
    if (!items.length) {
      return {
        handled: true,
        view: 'customers',
        speak: true,
        text: '저장된 손님이 아직 없어요. 손님관리에서 이름과 생일을 추가해 보세요.',
      }
    }
    const lines = items.slice(0, 12).map((c, i) => `${i + 1}. ${formatOne(c)}`)
    const more = items.length > 12 ? `\n…외 ${items.length - 12}명` : ''
    return {
      handled: true,
      view: 'customers',
      speak: true,
      text: `손님 ${items.length}명입니다.\n${lines.join('\n')}${more}`,
    }
  }

  if (parsed.kind === 'birthdays_today') {
    const items = customersWithBirthdayToday()
    if (!items.length) {
      return { handled: true, view: 'customers', speak: true, text: '오늘 생일인 손님은 없어요.' }
    }
    return {
      handled: true,
      view: 'customers',
      speak: true,
      text: `오늘 생일인 손님 ${items.length}명: ${items.map((c) => c.name).join(', ')}`,
    }
  }

  if (parsed.kind === 'add') {
    try {
      const rec = upsertCustomer({
        name: parsed.name,
        birthday: parsed.birthday,
        memo: parsed.memo,
        phone: parsed.phone,
      })
      return {
        handled: true,
        view: 'customers',
        speak: true,
        text: `${rec.name} 님을 손님 목록에 저장했어요. 생일: ${formatBirthdayDisplay(rec.birthday)}`,
      }
    } catch {
      return {
        handled: true,
        view: 'customers',
        speak: true,
        text: '이름을 확인해 주세요. 예: 「손님 추가 김철수 1990-05-15」',
      }
    }
  }

  if (parsed.kind === 'delete') {
    const hit = deleteCustomerByQuery(parsed.query)
    if (!hit) {
      return {
        handled: true,
        view: 'customers',
        speak: true,
        text: `「${parsed.query}」님을 찾지 못했어요.`,
      }
    }
    return {
      handled: true,
      view: 'customers',
      speak: true,
      text: `${hit.name} 님을 손님 목록에서 삭제했어요.`,
    }
  }

  if (parsed.kind === 'search') {
    const hits = findCustomers(parsed.query)
    if (!hits.length) {
      return {
        handled: true,
        view: 'customers',
        speak: true,
        text: `「${parsed.query}」님을 찾지 못했어요. 손님관리에서 새로 추가할 수 있어요.`,
      }
    }
    if (hits.length === 1) {
      return {
        handled: true,
        view: 'customers',
        speak: true,
        text: formatOne(hits[0]!),
      }
    }
    return {
      handled: true,
      view: 'customers',
      speak: true,
      text: `「${parsed.query}」검색 결과 ${hits.length}명:\n${hits
        .slice(0, 5)
        .map((c) => formatOne(c))
        .join('\n')}`,
    }
  }

  return { handled: true, view: 'customers', speak: true, text: '손님관리 화면을 열게요.' }
}
