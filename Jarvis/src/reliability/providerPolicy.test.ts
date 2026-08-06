import { describe, expect, it, vi } from 'vitest'
import {
  isIdempotentProviderOp,
  providerFailurePolicy,
  providerTimeoutMs,
  shouldAutoRetry,
  withProviderTimeout,
} from './providerPolicy'
import { isolateFeature } from './crashIsolation'
import { offlineCapabilityReport, offlineReadAllowed } from './offlineRecovery'

vi.stubGlobal('navigator', { onLine: false, language: 'ko-KR' })

describe('Provider policy', () => {
  it('sets timeouts per provider', () => {
    expect(providerTimeoutMs('flight')).toBeGreaterThan(0)
    expect(providerTimeoutMs('translation')).toBeGreaterThan(0)
  })

  it('retries only idempotent reads', () => {
    expect(isIdempotentProviderOp('flight.search')).toBe(true)
    expect(isIdempotentProviderOp('booking.confirm')).toBe(false)
    expect(shouldAutoRetry('hotel.search', 0)).toBe(true)
    expect(shouldAutoRetry('booking.confirm', 0)).toBe(false)
  })

  it('keeps session and blocks GENERAL_CHAT fallback on provider failure', () => {
    for (const d of ['translation', 'weather', 'flight', 'hotel', 'restaurant', 'travel'] as const) {
      const p = providerFailurePolicy(d)
      expect(p.keepSession).toBe(true)
      expect(p.allowGeneralChatFallback).toBe(false)
      expect(p.userMessage.length).toBeGreaterThan(10)
      expect(p.errorCode).toBeTruthy()
    }
  })

  it('times out slow providers', async () => {
    await expect(
      withProviderTimeout(
        'generic',
        () => new Promise((r) => setTimeout(r, 200)),
        20,
      ),
    ).rejects.toThrow(/PROVIDER-TIMEOUT/)
  })
})

describe('Crash isolation', () => {
  it('contains feature errors', async () => {
    const r = await isolateFeature('travel', () => {
      throw new Error('boom')
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.userMessage).toMatch(/여행|저장/)
      expect(r.errorCode).toBeTruthy()
    }
  })
})

describe('Offline recovery', () => {
  it('allows local domain reads when offline', () => {
    const rep = offlineCapabilityReport()
    expect(rep.online).toBe(false)
    expect(offlineReadAllowed('calendar')).toBe(true)
    expect(offlineReadAllowed('family')).toBe(true)
    expect(offlineReadAllowed('travel')).toBe(true)
    expect(rep.liveBlocked.length).toBeGreaterThan(0)
  })
})
