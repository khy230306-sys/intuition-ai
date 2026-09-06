/**
 * Asset image provider — project-configured generation/import backend.
 * Cursor-side tools are NOT a configured production provider.
 */

export type AssetProviderStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'ERROR'

export type ProviderInfo = {
  status: AssetProviderStatus
  name: string | null
  reason: string
  requiredSecrets: string[]
}

function readProviderKey(): string {
  try {
    const viteKey = import.meta.env?.VITE_SSUK_ASSET_PROVIDER_API_KEY
    if (typeof viteKey === 'string' && viteKey.length > 0) return viteKey
  } catch {
    /* ignore */
  }
  return ''
}

/** Never claim generation succeeded when provider is missing. */
export function getAssetProviderStatus(): ProviderInfo {
  const key = readProviderKey()

  if (!key) {
    return {
      status: 'NOT_CONFIGURED',
      name: null,
      reason:
        'No SSUK_ASSET_PROVIDER_API_KEY / VITE_SSUK_ASSET_PROVIDER_API_KEY. Do not invent or fake production bitmaps.',
      requiredSecrets: ['SSUK_ASSET_PROVIDER_API_KEY'],
    }
  }

  return {
    status: 'CONFIGURED',
    name: 'env-provider',
    reason: 'API key present — generation still must pass Quality Gate before APPROVED.',
    requiredSecrets: [],
  }
}

export const ASSET_PROVIDER_STATUS = getAssetProviderStatus().status
