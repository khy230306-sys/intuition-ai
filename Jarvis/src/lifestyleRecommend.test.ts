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
    expect(food.mapsQuery).toMatch(/강남/)
    expect(food.text).toMatch(/강남|맛집|지도/)

    const jiri = buildLifestyleReply('지리산 맛집', 'food')
    expect(jiri.mapsQuery).toMatch(/지리산/)
    expect(jiri.text).toMatch(/지리산/)

    const travel = buildLifestyleReply('국내여행은 어디가좋을까', 'travel_kr')
    expect(travel.text).toMatch(/제주|부산|강릉|국내/)
    expect(travel.searchQuery).toBeTruthy()
  })

  it('brain routes food/travel away from stock screening', async () => {
    const { think } = await import('./brain')
    const food = await think('맛집추천')
    expect(food.text).toMatch(/먹을|맛집|지도|후보|방향/)
    expect(food.text).not.toMatch(/냉정 스크리닝|종목/)

    const placeFood = await think('지리산 맛집 찾아줘')
    expect(placeFood.text).toMatch(/지리산|지도/)
    expect(placeFood.text).not.toMatch(/한식 집밥 스타일/)
    expect(placeFood.action).toBeTypeOf('function')

    const travel = await think('국내여행은 어디가좋을까?')
    expect(travel.text).toMatch(/제주|부산|강릉|여행/)
    expect(travel.text).not.toMatch(/냉정 스크리닝/)

    const music = await think('좋은 음악을 추천해줘')
    expect(music.text).not.toMatch(/냉정 스크리닝|종목/)
    expect(music.musicShowMiniPlayer || /음악|YouTube|재생|검색/i.test(music.text)).toBeTruthy()
  }, 30000)
})
