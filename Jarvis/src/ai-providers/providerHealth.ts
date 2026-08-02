import { getHybridProvider } from './providerRegistry'
import { updateProviderSlot } from './providerConfig'
import type { HybridProviderId, ProviderHealthStatus, ProviderTestResult } from './types'

export async function testProviderConnection(id: HybridProviderId): Promise<ProviderTestResult> {
  const p = getHybridProvider(id)
  if (!p) return { ok: false, message: '알 수 없는 Provider' }
  return p.testConnection()
}

export function markProviderStatus(id: HybridProviderId, status: ProviderHealthStatus, lastError?: string): void {
  updateProviderSlot(id, {
    status,
    lastError,
    lastSuccessAt: status === 'ok' ? new Date().toISOString() : undefined,
  })
}
