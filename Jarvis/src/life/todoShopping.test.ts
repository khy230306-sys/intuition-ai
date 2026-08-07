import { describe, expect, it } from 'vitest'
import { routeCommand } from '../commandRouter'
import {
  classifyTodoShopping,
  extractShoppingItems,
  extractTodoTitle,
  isShoppingAddUtterance,
  isTodoCreateUtterance,
} from './todoShopping'

describe('TODO vs shopping sentence structure', () => {
  it('routes 할 일 … 추가 as TODO not shopping', () => {
    const samples = [
      '할 일 장보기 추가',
      '할 일 우유 사기 추가',
      '오늘 할 일 운동 추가',
      '내일 할 일 병원 전화 추가',
      '할 일 추가 장보기',
    ]
    for (const s of samples) {
      expect(isTodoCreateUtterance(s), s).toBe(true)
      expect(isShoppingAddUtterance(s), s).toBe(false)
      expect(classifyTodoShopping(s).kind, s).toBe('todo.create')
      expect(routeCommand({ text: s }).intent).toMatch(/todo/)
    }
    expect(extractTodoTitle('할 일 장보기 추가')).toBe('장보기')
    expect(extractTodoTitle('할 일 우유 사기 추가')).toBe('우유 사기')
    expect(extractTodoTitle('오늘 할 일 운동 추가')).toBe('운동')
    expect(extractTodoTitle('내일 할 일 병원 전화 추가')).toBe('병원 전화')
  })

  it('routes shopping frames as grocery', () => {
    const samples = [
      '장바구니에 우유 추가',
      '장보기 목록에 계란 넣어줘',
      '마트에서 살 것 추가 빵',
      '우유 장바구니 추가',
    ]
    for (const s of samples) {
      expect(isShoppingAddUtterance(s), s).toBe(true)
      expect(isTodoCreateUtterance(s), s).toBe(false)
      expect(classifyTodoShopping(s).kind, s).toBe('shopping.add')
    }
    expect(extractShoppingItems('장바구니에 우유 추가')).toContain('우유')
    expect(extractShoppingItems('장보기 목록에 계란 넣어줘')).toContain('계란')
  })

  it('마트에서 살 것 추가 alone is shopping frame', () => {
    expect(isShoppingAddUtterance('마트에서 살 것 추가')).toBe(true)
    expect(classifyTodoShopping('마트에서 살 것 추가').kind).toBe('shopping.add')
  })
})
