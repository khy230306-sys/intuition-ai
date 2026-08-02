import type { BrainReply } from '../types'
import { CoreBrainError, userFacingBrainError } from './brainErrors'
import { brainLog } from './brainLogger'
import { isDuplicateRequest, rememberTurn } from './brainState'
import { shouldExecuteViaSkills } from './confidenceEvaluator'
import { buildCoreRequest } from './contextResolver'
import { buildExecutionPlan } from './executionPlanner'
import { routeIntent } from './intentRouter'
import { composeResponse } from './responseComposer'
import { assertSafeToExecute } from './safetyPolicy'
import { executeSkillById } from './skillExecutor'
import { getSkillById } from './skillRegistry'
import type {
  BrainHistoryItem,
  BrainSource,
  CoreBrainRequest,
  CoreBrainResult,
  SkillContext,
  SkillResult,
} from './types'
import type { AppLocale } from '../i18n'

export type ProcessCoreBrainInput = {
  text: string
  history?: BrainHistoryItem[]
  locale?: AppLocale
  source?: BrainSource
  signal?: AbortSignal
  /** When true, skip in-flight dedupe (tests). */
  allowDuplicate?: boolean
}

/**
 * AIZIO Core Brain — central intent → skill planner.
 * Returns `fallbackLegacy: true` when the existing `think` pipeline should continue
 * (invest/life/geo/AI chat, etc.).
 */
export async function processCoreBrain(input: ProcessCoreBrainInput): Promise<CoreBrainResult> {
  const started = Date.now()
  const request = buildCoreRequest(input)

  if (!request.text.trim() && !request.normalizedText) {
    return emptyResult(request, 'invalid_input', started)
  }

  if (!input.allowDuplicate && isDuplicateRequest(request.normalizedText || request.text)) {
    return {
      ...emptyResult(request, 'cancelled', started),
      status: 'failed',
      responseText: '같은 요청이 바로 전에 처리되었습니다.',
      speakText: '잠시만요.',
      fallbackLegacy: false,
      brainReply: { text: '같은 요청이 바로 전에 처리되었습니다.', speak: true },
      errorCode: 'cancelled',
    }
  }

  try {
    assertSafeToExecute(request.normalizedText || request.text, 'general_chat')
  } catch (err) {
    if (err instanceof CoreBrainError && err.code === 'unsafe_action') {
      const msg = userFacingBrainError('unsafe_action')
      return {
        requestId: request.requestId,
        intent: 'unknown',
        confidence: 1,
        entities: {},
        selectedSkills: [],
        executionPlan: [],
        results: [],
        responseText: msg,
        speakText: msg,
        status: 'failed',
        warnings: [],
        latencyMs: Date.now() - started,
        fallbackLegacy: false,
        brainReply: { text: msg, speak: true },
        errorCode: 'unsafe_action',
      }
    }
  }

  const { classification, executeSkills } = await routeIntent(
    request.normalizedText || request.text,
    request.locale,
    request.signal,
  )

  // Offline gate for intents that need network (translate cloud, etc. still may work offline-dict)
  if (request.appContext.online === false && classification.intent === 'ask_information') {
    // still allow legacy offline helpers
  }

  if (!executeSkills || classification.intent === 'general_chat' || classification.intent === 'ask_information') {
    rememberTurn(classification.intent, classification.entities, request.normalizedText)
    brainLog({
      requestId: request.requestId,
      intent: classification.intent,
      confidence: classification.confidence,
      fallback: true,
      executionMs: Date.now() - started,
      success: true,
    })
    return {
      requestId: request.requestId,
      intent: classification.intent,
      confidence: classification.confidence,
      entities: classification.entities,
      selectedSkills: ['chat'],
      executionPlan: [{ skillId: 'chat', intent: classification.intent, reason: 'legacy' }],
      results: [],
      responseText: '',
      speakText: '',
      status: 'fallback_legacy',
      warnings: [],
      latencyMs: Date.now() - started,
      fallbackLegacy: true,
    }
  }

  try {
    assertSafeToExecute(request.normalizedText || request.text, classification.intent)
  } catch {
    const msg = userFacingBrainError('unsafe_action')
    return {
      requestId: request.requestId,
      intent: classification.intent,
      confidence: classification.confidence,
      entities: classification.entities,
      selectedSkills: [],
      executionPlan: [],
      results: [],
      responseText: msg,
      speakText: msg,
      status: 'failed',
      warnings: [],
      latencyMs: Date.now() - started,
      fallbackLegacy: false,
      brainReply: { text: msg, speak: true },
      errorCode: 'unsafe_action',
    }
  }

  const plan = buildExecutionPlan(request.normalizedText || request.text, classification.intent)
  const results: SkillResult[] = []
  const warnings: string[] = []

  for (const step of plan) {
    if (request.signal?.aborted) {
      results.push({
        success: false,
        status: 'cancelled',
        data: {},
        message: userFacingBrainError('cancelled'),
        error: { code: 'cancelled' },
      })
      break
    }
    // Chat defer steps → legacy
    if (step.skillId === 'chat') {
      rememberTurn(classification.intent, classification.entities, request.normalizedText)
      return {
        requestId: request.requestId,
        intent: classification.intent,
        confidence: classification.confidence,
        entities: classification.entities,
        selectedSkills: ['chat'],
        executionPlan: plan,
        results,
        responseText: '',
        speakText: '',
        status: 'fallback_legacy',
        warnings,
        latencyMs: Date.now() - started,
        fallbackLegacy: true,
      }
    }

    const skill = getSkillById(step.skillId)
    const ctx: SkillContext = {
      request: { ...request, /* per-step intent */ },
      intent: step.intent,
      entities: classification.entities,
      signal: request.signal,
    }
    // Mark unavailable skills without loading when registry says unavailable AND it's project
    if (skill && !skill.available && step.skillId === 'project') {
      const r = await executeSkillById(step.skillId, ctx)
      results.push(r)
      continue
    }
    const r = await executeSkillById(step.skillId, ctx)
    results.push(r)
  }

  // If music/translate returned unavailable, fall back to legacy for another chance
  const onlyFailed =
    results.length > 0 &&
    results.every((r) => !r.success) &&
    (classification.intent === 'play_music' || classification.intent === 'translate')
  if (onlyFailed) {
    rememberTurn(classification.intent, classification.entities, request.normalizedText)
    brainLog({
      requestId: request.requestId,
      intent: classification.intent,
      confidence: classification.confidence,
      fallback: true,
      success: false,
      executionMs: Date.now() - started,
    })
    return {
      requestId: request.requestId,
      intent: classification.intent,
      confidence: classification.confidence,
      entities: classification.entities,
      selectedSkills: plan.map((p) => p.skillId),
      executionPlan: plan,
      results,
      responseText: '',
      speakText: '',
      status: 'fallback_legacy',
      warnings,
      latencyMs: Date.now() - started,
      fallbackLegacy: true,
    }
  }

  const composed = composeResponse(results, warnings)
  rememberTurn(classification.intent, classification.entities, request.normalizedText)

  const out: CoreBrainResult = {
    requestId: request.requestId,
    intent: classification.intent,
    confidence: classification.confidence,
    entities: classification.entities,
    selectedSkills: plan.map((p) => p.skillId),
    executionPlan: plan,
    results,
    responseText: composed.responseText,
    speakText: composed.speakText,
    status: composed.status,
    warnings,
    latencyMs: Date.now() - started,
    fallbackLegacy: false,
    brainReply: {
      ...composed.brainReply,
      text: composed.responseText,
      speak: true,
    },
  }

  brainLog({
    requestId: request.requestId,
    intent: out.intent,
    confidence: out.confidence,
    selectedSkill: out.selectedSkills[0],
    executionMs: out.latencyMs,
    success: out.status === 'success' || out.status === 'partial' || out.status === 'needs_user_action',
    fallback: false,
  })

  return out
}

function emptyResult(request: CoreBrainRequest, code: CoreBrainResult['errorCode'], started: number): CoreBrainResult {
  const msg = userFacingBrainError(code || 'invalid_input')
  return {
    requestId: request.requestId,
    intent: 'unknown',
    confidence: 0,
    entities: {},
    selectedSkills: [],
    executionPlan: [],
    results: [],
    responseText: msg,
    speakText: msg,
    status: 'failed',
    warnings: [],
    latencyMs: Date.now() - started,
    fallbackLegacy: true,
    errorCode: code,
  }
}

/** Map Core Brain output to BrainReply when handled. */
export function coreResultToBrainReply(result: CoreBrainResult): BrainReply | null {
  if (result.fallbackLegacy || !result.brainReply) return null
  return result.brainReply
}

export { shouldExecuteViaSkills }
