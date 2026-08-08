import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DURABLE_LS_KEYS } from './idbKv'

describe('idbKv durable keys', () => {
  it('lists local data keys that must survive asset cache wipes', () => {
    expect(DURABLE_LS_KEYS).toContain('aizio_family_helper_v1')
    expect(DURABLE_LS_KEYS).toContain('jarvis_settings_v1')
    expect(DURABLE_LS_KEYS).toContain('jarvis_chat_v1')
  })
})

describe('idbKv best-effort without IndexedDB', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', undefined)
  })
  it('mirror/restore soft-fail', async () => {
    const { mirrorDurableLocalData, restoreDurableLocalData, idbSet } = await import('./idbKv')
    await expect(idbSet('k', 'v')).resolves.toBe(false)
    await expect(mirrorDurableLocalData()).resolves.toBe(0)
    await expect(restoreDurableLocalData()).resolves.toBe(0)
  })
})
