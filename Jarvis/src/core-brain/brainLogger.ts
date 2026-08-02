import type { CoreIntent } from './types'

export type BrainLogEvent = {
  requestId: string
  intent?: CoreIntent
  confidence?: number
  selectedSkill?: string
  executionMs?: number
  success?: boolean
  errorCode?: string
  fallback?: boolean
}

/** Dev-only diagnostics — never logs full user text or secrets. */
export function brainLog(event: BrainLogEvent): void {
  try {
    if (typeof process !== 'undefined' && process.env?.VITEST) return
    const dev =
      typeof import.meta !== 'undefined' &&
      Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)
    if (!dev) return
    // eslint-disable-next-line no-console
    console.debug('[AIZIO CoreBrain]', {
      requestId: event.requestId,
      intent: event.intent,
      confidence: event.confidence,
      selectedSkill: event.selectedSkill,
      executionMs: event.executionMs,
      success: event.success,
      errorCode: event.errorCode,
      fallback: event.fallback,
    })
  } catch {
    /* ignore */
  }
}
