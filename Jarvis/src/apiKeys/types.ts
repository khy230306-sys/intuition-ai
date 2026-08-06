/** Unified Provider key status — settings + diagnostics share this. */

export type ProviderKeyId =
  | 'openrouter'
  | 'openai'
  | 'gemini'
  | 'groq'
  | 'custom'
  | 'duffel'
  | 'amadeus'
  | 'amadeus_secret'
  | 'expedia'

export type KeySource = 'user-secret' | 'environment' | 'device-local' | 'none'

export type ConnectionStatus =
  | 'untested'
  | 'connected'
  | 'invalid'
  | 'permission_error'
  | 'quota_error'
  | 'network_error'
  | 'provider_error'

export type ProviderKeyStatus = {
  provider: ProviderKeyId | string
  configured: boolean
  source: KeySource
  maskedKey: string
  lastUpdatedAt?: string | null
  lastTestedAt?: string | null
  connectionStatus: ConnectionStatus
  lastErrorCode?: string | null
  apiBase?: string
  model?: string
}

export type BackendCapability = {
  reachable: boolean
  baseUrl: string | null
  reason: string
  supportsSecretStore: boolean
  previewStaticOnly: boolean
}

export type SaveKeyResult = {
  ok: boolean
  message: string
  status?: ProviderKeyStatus
  via: 'server' | 'device-local' | 'none'
}

export type TestKeyResult = {
  ok: boolean
  message: string
  connectionStatus: ConnectionStatus
  code?: string
  latencyMs?: number
  partial?: boolean
  status?: ProviderKeyStatus
}
