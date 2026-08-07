/**
 * Standardized Tool Result for AIZIO Core Engine V1.1+.
 * LLM-generated text must never use this type as if it were tool data.
 */

export type ToolSourceType = 'live_api' | 'local_store' | 'catalog' | 'curated' | 'none'

export type ToolStatus =
  | 'ok'
  | 'partial'
  | 'failed'
  | 'needs_input'
  | 'denied'
  | 'pending_external_setup'

export type VerificationMethod =
  | 'field_check'
  | 'provider_id_and_geo'
  | 'store_reread'
  | 'external_reread'
  | 'none'

export type ToolResult<T = unknown> = {
  toolId: string
  success: boolean
  status: ToolStatus
  data: T | null
  source: string
  sourceType: ToolSourceType
  fetchedAt: number
  verifiedAt: number | null
  errorCode: string | null
  errorMessage: string | null
  confidence: number
  /** Fake/Mock/Demo/Fallback/curated must never be true. */
  isRealData: boolean
  provider?: string | null
  providerRequestId?: string | null
  externalId?: string | null
  verificationMethod?: VerificationMethod | null
}

export function makeToolResult<T>(partial: {
  toolId: string
  success: boolean
  status?: ToolStatus
  data?: T | null
  source: string
  sourceType: ToolSourceType
  errorCode?: string | null
  errorMessage?: string | null
  confidence?: number
  isRealData: boolean
  fetchedAt?: number
  verifiedAt?: number | null
  provider?: string | null
  providerRequestId?: string | null
  externalId?: string | null
  verificationMethod?: VerificationMethod | null
}): ToolResult<T> {
  const success = partial.success
  return {
    toolId: partial.toolId,
    success,
    status: partial.status ?? (success ? 'ok' : 'failed'),
    data: partial.data ?? null,
    source: partial.source,
    sourceType: partial.sourceType,
    fetchedAt: partial.fetchedAt ?? Date.now(),
    verifiedAt: partial.verifiedAt ?? null,
    errorCode: partial.errorCode ?? null,
    errorMessage: partial.errorMessage ?? null,
    confidence: partial.confidence ?? (success ? 0.8 : 0),
    isRealData: partial.isRealData === true && success,
    provider: partial.provider ?? null,
    providerRequestId: partial.providerRequestId ?? null,
    externalId: partial.externalId ?? null,
    verificationMethod: partial.verificationMethod ?? null,
  }
}
