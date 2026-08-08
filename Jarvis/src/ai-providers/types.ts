/** AIZIO Hybrid AI Provider System — shared types. */

export type HybridProviderId =
  | 'openrouter'
  | 'gemini'
  | 'groq'
  | 'openai'
  | 'custom'

export type ProviderCategory = 'free' | 'paid' | 'local'

export type ProviderHealthStatus =
  | 'unconfigured'
  | 'ok'
  | 'rate_limit'
  | 'quota'
  | 'auth'
  | 'error'
  | 'unknown'

export type HybridRouteMode = 'auto' | 'fixed'

export interface ModelInfo {
  id: string
  label: string
  category?: 'fast' | 'chat' | 'coding' | 'translate' | 'analysis'
  freeHint?: boolean
}

export interface ProviderSlotConfig {
  /** Plain key in memory; persisted obfuscated. */
  apiKey: string
  model: string
  /** Custom OpenAI-compatible base (custom provider, or OpenAI override). */
  apiBase?: string
  enabled: boolean
  lastSuccessAt?: string
  lastError?: string
  status?: ProviderHealthStatus
  /** Epoch ms — skip this provider in routing until then (billing/quota/rate). */
  cooldownUntil?: number
}

export interface HybridAiConfig {
  mode: HybridRouteMode
  fixedProvider?: HybridProviderId
  /** Default false — never auto-call paid providers. */
  allowPaidFallback: boolean
  wizardDismissed: boolean
  providers: Partial<Record<HybridProviderId, ProviderSlotConfig>>
}

export interface ProviderChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ProviderChatRequest {
  messages: ProviderChatMessage[]
  model?: string
  signal?: AbortSignal
}

export interface ProviderChatResult {
  text: string
  model: string
  finishReason?: string
  providerId: HybridProviderId
}

export interface ProviderTestResult {
  ok: boolean
  message: string
  model?: string
  latencyMs?: number
}

export interface HybridProvider {
  id: HybridProviderId
  displayName: string
  category: ProviderCategory
  requiresApiKey: boolean
  defaultApiBase?: string
  signupUrl: string
  docsHint: string
  recommendedModels: ModelInfo[]
  isConfigured: () => boolean
  getSlot: () => ProviderSlotConfig
  testConnection: () => Promise<ProviderTestResult>
  sendChat: (req: ProviderChatRequest) => Promise<ProviderChatResult>
  supportsOpenAIFormat: boolean
}

export interface HybridChatInput {
  message: string
  history?: Array<{ role: string; text: string }>
  displayName?: string
  lifeContext?: string
  riskTolerance?: string
  investHorizon?: string
  locale?: string
  signal?: AbortSignal
}

export interface HybridChatOutput {
  text: string
  providerId: HybridProviderId | 'none'
  model: string
  fallbackUsed: boolean
  attempted: HybridProviderId[]
}

export interface UsageDayStats {
  day: string
  requests: number
  success: number
  failure: number
  fallbacks: number
  byProvider: Partial<Record<HybridProviderId, number>>
}
