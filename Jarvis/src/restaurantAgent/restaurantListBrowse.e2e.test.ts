/**
 * Device bug: 「나트랑 맛집좀 찾아줘」 → party-size loop;
 * 「그냥 맛집 리스트만줘」 must escape and show a list.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { think } from '../brain'
import { resetActionAgentForTests } from '../actionAgent'
import { endTranslationSession } from '../commandRouter/session'
import { clearTravelSession } from '../travelAgent/session'
import { handleRestaurantAgent } from './agent'
import { clearRestaurantSession, loadRestaurantSession, saveRestaurantSession, createRestaurantSession } from './session'
import { clearInterpretMode } from '../translateBrain'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v)
  },
  removeItem: (k: string) => {
    store.delete(k)
  },
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', {
  onLine: true,
  language: 'ko-KR',
  geolocation: { getCurrentPosition: () => {} },
})

describe('Restaurant list browse (no party-size trap)', () => {
  beforeEach(() => {
    store.clear()
    resetActionAgentForTests()
    clearTravelSession()
    clearRestaurantSession()
    clearInterpretMode()
    endTranslationSession()
  })

  it('나트랑 맛집좀 찾아줘 → list, not party ask', async () => {
    const r = await think('나트랑 맛집좀 찾아줘')
    expect(r.text).toMatch(/DEMO|맛집|식당|한식|추천/)
    expect(r.text).not.toMatch(/몇 명이서 가시나요|인원을 숫자로/)
    const sess = loadRestaurantSession()
    expect(sess?.searchInput?.location).toMatch(/나트랑/)
    expect(sess?.results.length).toBeGreaterThan(0)
    expect(sess?.pendingQuestion).toBeFalsy()
  })

  it('pending partySize + 그냥 맛집 리스트만줘 → list, not number loop', async () => {
    const sess = createRestaurantSession({
      bookingFlow: true,
      pendingQuestion: 'partySize',
      searchInput: { location: '나트랑' },
      status: 'searching',
    })
    saveRestaurantSession(sess)

    const r = await think('그냥 맛집 리스트만줘')
    expect(r.text).toMatch(/DEMO|맛집|식당/)
    expect(r.text).not.toMatch(/인원을 숫자로 알려/)
    expect(loadRestaurantSession()?.results.length).toBeGreaterThan(0)
  })

  it('가족 외식 booking flow still asks party after location (legacy agent)', async () => {
    const s1 = await handleRestaurantAgent('오늘 저녁 가족들이랑 외식하려고')
    expect(s1?.text).toMatch(/지역/)

    const s2 = await handleRestaurantAgent('울산 삼산')
    expect(s2?.text).toMatch(/명/)
    expect(s2?.text).not.toMatch(/DEMO 맛집 검색/)

    const s3 = await handleRestaurantAgent('4명')
    expect(s3?.text).toMatch(/음식|한식/)
  })
})
