/** Shared AI engine types — provider-agnostic. */

export type AiMode = 'chat' | 'coding' | 'planning' | 'analysis'

export type AiProviderId = 'openai-compatible'

export type AiChatRole = 'system' | 'user' | 'assistant'

export interface AiChatMessage {
  role: AiChatRole
  content: string
}

export interface AiRequest {
  message: string
  history?: Array<{ role: string; text: string }>
  mode?: AiMode
  locale?: string
  displayName?: string
  lifeContext?: string
  riskTolerance?: string
  investHorizon?: string
  apiKey?: string
  apiBase?: string
  model?: string
  signal?: AbortSignal
  /** Override auto mode detection. */
  forceMode?: AiMode
}

export interface AiResponse {
  text: string
  provider: AiProviderId | string
  model: string
  mode: AiMode
  finishReason?: string
  latencyMs: number
  fallbackUsed: boolean
  confidence?: number
  warnings?: string[]
}

export interface AiProvider {
  id: AiProviderId | string
  label: string
  isAvailable(req: AiRequest): boolean
  complete(req: AiRequest, messages: AiChatMessage[], signal: AbortSignal): Promise<{
    text: string
    model: string
    finishReason?: string
  }>
}

export interface AiRouteDecision {
  provider: AiProviderId | string
  model: string
  mode: AiMode
  reason: string
}
