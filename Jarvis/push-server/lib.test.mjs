import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertHttpsBaseUrl,
  isHttpsEndpoint,
  maskId,
  normalizeBaseUrl,
  parseOrigins,
  pastReminderStatus,
  privacyBody,
} from './lib.mjs'

describe('lib helpers', () => {
  it('privacy modes', () => {
    assert.match(privacyBody('hidden', '엄마 병원').body, /AIZIO 알림/)
    assert.match(privacyBody('simple', '엄마 병원').body, /예약된 일정/)
    assert.match(privacyBody('full', '엄마 병원').body, /엄마 병원/)
  })

  it('https endpoint validation', () => {
    assert.equal(isHttpsEndpoint('https://fcm.googleapis.com/x'), true)
    assert.equal(isHttpsEndpoint('http://evil'), false)
    assert.equal(isHttpsEndpoint('not-a-url'), false)
  })

  it('maskId hides middle', () => {
    assert.equal(maskId('abcdefghijklmnop'), 'abcd…mnop')
  })

  it('parseOrigins falls back', () => {
    const d = ['https://a.com']
    assert.deepEqual(parseOrigins('', d), d)
    assert.deepEqual(parseOrigins('https://b.com/, https://c.com', d), ['https://b.com', 'https://c.com'])
  })

  it('normalize and https base url', () => {
    assert.equal(normalizeBaseUrl('https://x.com/'), 'https://x.com')
    assert.equal(assertHttpsBaseUrl('https://x.com/').ok, true)
    assert.equal(assertHttpsBaseUrl('http://x.com').ok, false)
    assert.equal(assertHttpsBaseUrl('http://localhost:8787', { allowLocalhost: true }).ok, true)
  })

  it('past reminder policy', () => {
    const now = Date.now()
    assert.equal(pastReminderStatus(now + 60_000, now), 'scheduled')
    assert.equal(pastReminderStatus(now - 1000, now), 'due')
    assert.equal(pastReminderStatus(now - 25 * 60 * 60 * 1000, now), 'expired')
  })
})
