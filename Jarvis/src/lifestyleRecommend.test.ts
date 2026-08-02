import { describe, expect, it } from 'vitest'
import {
  buildLifestyleReply,
  detectLifestyleRecommend,
  wantsLifestyleHelp,
} from './lifestyleRecommend'

describe('lifestyle recommend router', () => {
  it('detects music / food / travel asks', () => {
    expect(detectLifestyleRecommend('좋은 음악을 추천해줘')).toBe('music')
    expect(detectLifestyleRecommend('맛집추천')).toBe('food')
    expect(detectLifestyleRecommend('국내여행은 어디가좋을까?')).toBe('travel_kr')
    expect(detectLifestyleRecommend('제주 여행 추천')).toBe('travel_kr')
    expect(detectLifestyleRecommend('해외 여행지 추천해줘')).toBe('travel_world')
    expect(detectLifestyleRecommend('카페 추천')).toBe('cafe')
    expect(detectLifestyleRecommend('볼만한 영화 추천')).toBe('movie')
  })

  it('does not steal stock asks', () => {
    expect(detectLifestyleRecommend('주식 종목 추천')).toBeNull()
    expect(detectLifestyleRecommend('미국 보수 추천')).toBeNull()
    expect(detectLifestyleRecommend('냉정하게 추천해줘')).toBeNull()
  })

  it('ignores unrelated chat', () => {
    expect(wantsLifestyleHelp('안녕')).toBe(false)
    expect(detectLifestyleRecommend('오늘 날씨 어때')).toBeNull()
  })

  it('builds actionable replies', () => {
    const food = buildLifestyleReply('강남 맛집 추천', 'food')
    expect(food.mapsQuery || food.searchQuery).toBeTruthy()
    expect(food.text).toMatch(/먹을|맛집|후보/)

    const travel = buildLifestyleReply('국내여행은 어디가좋을까', 'travel_kr')
    expect(travel.text).toMatch(/제주|부산|강릉|국내/)
    expect(travel.searchQuery).toBeTruthy()
  })
})
