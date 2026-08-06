import { recordFromExecution } from './metrics'
import type { ActionExecutionResult, ExecutionStatus } from './types'

export function makeExecutionResult(partial: {
  success: boolean
  action: string
  intent: string
  status?: ExecutionStatus
  userMessage: string
  data?: unknown
  errorCode?: string
  retryable?: boolean
  provider?: string
  durationMs?: number
  fallback?: boolean
}): ActionExecutionResult {
  const result: ActionExecutionResult = {
    status: partial.status || (partial.success ? 'success' : 'failed'),
    fallback: false,
    ...partial,
  }
  // Opt-in gated inside recordMetric — suite uses recordMetric({force}) separately.
  recordFromExecution(result)
  return result
}

export function brainReplyFromExecution(result: ActionExecutionResult): {
  text: string
  speak: boolean
} {
  return { text: result.userMessage, speak: true }
}

/** Wrap async work with timing + metrics. */
export async function timedExecute<T>(
  intent: string,
  action: string,
  fn: () => Promise<{ ok: boolean; message: string; data?: T; errorCode?: string; provider?: string; status?: ExecutionStatus }>,
): Promise<ActionExecutionResult> {
  const t0 = performance.now()
  try {
    const out = await fn()
    return makeExecutionResult({
      success: out.ok,
      action,
      intent,
      status: out.status || (out.ok ? 'success' : 'failed'),
      userMessage: out.message,
      data: out.data,
      errorCode: out.errorCode,
      provider: out.provider,
      durationMs: Math.round(performance.now() - t0),
    })
  } catch (e) {
    return makeExecutionResult({
      success: false,
      action,
      intent,
      status: 'failed',
      userMessage: e instanceof Error ? e.message : '실행에 실패했습니다.',
      errorCode: 'ROUTER-001',
      retryable: true,
      durationMs: Math.round(performance.now() - t0),
    })
  }
}
