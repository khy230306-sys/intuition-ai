import { describe, expect, it } from 'vitest'
import {
  classifyConnection,
  connectionLabelKo,
  featureNetworkNeed,
  featureUsableOffline,
  offlineUserMessage,
} from './connectionModel'

describe('connectionModel', () => {
  it('classifies offline / online / degraded', () => {
    expect(classifyConnection({ navigatorOnline: false, healthOk: null })).toBe('OFFLINE')
    expect(classifyConnection({ navigatorOnline: true, healthOk: true })).toBe('ONLINE')
    expect(classifyConnection({ navigatorOnline: true, healthOk: false, healthStatus: 500 })).toBe(
      'DEGRADED',
    )
    expect(classifyConnection({ navigatorOnline: true, healthOk: false, healthStatus: 511 })).toBe(
      'CAPTIVE_PORTAL',
    )
  })

  it('marks local features usable offline', () => {
    expect(featureUsableOffline('calendar')).toBe(true)
    expect(featureUsableOffline('weather')).toBe(false)
    expect(featureNetworkNeed('ai_llm')).toBe('NETWORK_REQUIRED')
  })

  it('gives user-facing offline weather copy', () => {
    expect(offlineUserMessage('weather')).toMatch(/인터넷 연결이 없어/)
    expect(connectionLabelKo('OFFLINE')).toBe('오프라인 모드')
  })
})
