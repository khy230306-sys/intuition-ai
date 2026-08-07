/**
 * Device bug: 「나트랑 맛집좀 찾아줘」 → party-size loop.
 * Production: DEMO lists are disabled — honest unavailable, still no party ask.
 * Legacy DEMO path kept for dialogue regression with fixtures on.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { think } from '../brain'
import { resetActionAgentForTests } from '../actionAgent'
import { endTranslationSession } from '../commandRouter/session'
import { setLegacyDemoProvidersEnabled } from '../featureTruth'
import { clearTravelSession } from '../travelAgent/session'
import { handleRestaurantAgent } from './agent'
import {
  clearRestaurantSession,
  loadRestaurantSession,
  saveRestaurantSession,
  createRestaurantSession,
} from './session'
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
    setLegacyDemoProvidersEnabled(false)
  })

  it('production: 나트랑 맛집 → unavailable, not party ask, not DEMO list', async () => {
    const r = await think('나트랑 맛집좀 찾아줘')
    expect(r.text).toMatch(/실검색|미연결|지도|근처 맛집|제공자|연결/)
    expect(r.text).not.toMatch(/【DEMO 맛집 검색】/)
    expect(r.text).not.toMatch(/몇 명이서 가시나요|인원을 숫자로/)
  })

  it('legacy DEMO: list browse without party ask', async () => {
    setLegacyDemoProvidersEnabled(true)
    const r = await handleRestaurantAgent('나트랑 맛집좀 찾아줘')
    expect(r?.text).toMatch(/DEMO|맛집|식당/)
    expect(r?.text).not.toMatch(/몇 명이서 가시나요|인원을 숫자로/)
    const sess = loadRestaurantSession()
    expect(sess?.searchInput?.location).toMatch(/나트랑/)
    expect(sess?.results.length).toBeGreaterThan(0)
    expect(sess?.pendingQuestion).toBeFalsy()
  })

  it('legacy: partySize pending honors list-only bypass', async () => {
    setLegacyDemoProvidersEnabled(true)
    const sess = createRestaurantSession({
      bookingFlow: true,
      pendingQuestion: 'partySize',
      searchInput: { location: '나트랑' },
      status: 'searching',
    })
    saveRestaurantSession(sess)
    const r = await handleRestaurantAgent('그냥 맛집 리스트만줘')
    expect(r?.text).toMatch(/DEMO|맛집|식당/)
    expect(r?.text).not.toMatch(/인원을 숫자/)
    expect(loadRestaurantSession()?.results.length).toBeGreaterThan(0)
  })
})
