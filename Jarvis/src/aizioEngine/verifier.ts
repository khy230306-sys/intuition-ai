/**
 * Verifier V1.1 — never trust tool success flags alone.
 */

import { loadReminders } from '../storage'
import type { SessionContext } from './context'
import type { ToolResult } from './toolResult'
import { makeToolResult } from './toolResult'
import type { EngineCalendarWrite, EnginePlaceCandidate, EngineWeatherSnapshot } from './types'

export type VerifyOutcome<T> = {
  ok: boolean
  result: ToolResult<T>
  userMessage?: string
}

export function verifyWeatherResult(
  raw: ToolResult<EngineWeatherSnapshot>,
): VerifyOutcome<EngineWeatherSnapshot> {
  const d = raw.data
  if (!raw.success || !d) {
    return {
      ok: false,
      result: makeToolResult({
        ...raw,
        success: false,
        status: 'failed',
        isRealData: false,
        errorCode: raw.errorCode || 'weather_empty',
        errorMessage: raw.errorMessage || '날씨 데이터가 비어 있습니다.',
        verifiedAt: Date.now(),
      }),
      userMessage: '날씨 조회 결과를 확인하지 못했어요. 완료된 것으로 처리하지 않습니다.',
    }
  }
  const hasPlace = Boolean(d.city?.trim())
  const hasLabel = Boolean(d.label?.trim())
  const hasDay = Boolean(d.dayLabel)
  if (!hasPlace || !hasLabel || !hasDay) {
    return {
      ok: false,
      result: makeToolResult({
        toolId: raw.toolId,
        success: false,
        status: 'failed',
        data: d,
        source: raw.source,
        sourceType: raw.sourceType,
        isRealData: false,
        errorCode: 'weather_incomplete',
        errorMessage: '위치·날짜·예보 필드가 불완전합니다.',
        confidence: 0,
        verifiedAt: Date.now(),
      }),
      userMessage: '날씨 응답이 불완전해 신뢰할 수 없어요.',
    }
  }
  // Live API only counts as real
  const isReal = raw.sourceType === 'live_api' && raw.source.includes('open-meteo')
  return {
    ok: true,
    result: makeToolResult({
      ...raw,
      success: true,
      status: 'ok',
      data: d,
      isRealData: isReal,
      confidence: isReal ? Math.max(raw.confidence, 0.85) : Math.min(raw.confidence, 0.5),
      verifiedAt: Date.now(),
    }),
  }
}

export function verifyPlacesResult(
  raw: ToolResult<{ candidates: EnginePlaceCandidate[]; query: string }>,
): VerifyOutcome<{ candidates: EnginePlaceCandidate[]; query: string }> {
  const d = raw.data
  if (!raw.success || !d?.candidates?.length) {
    return {
      ok: false,
      result: makeToolResult({
        toolId: raw.toolId,
        success: false,
        status: 'failed',
        data: d,
        source: raw.source,
        sourceType: raw.sourceType,
        isRealData: false,
        errorCode: 'places_empty',
        errorMessage: '장소 후보가 없습니다.',
        confidence: 0,
        verifiedAt: Date.now(),
      }),
      userMessage: '장소 목록을 확인하지 못했어요. 추천이 완료된 것이 아닙니다.',
    }
  }
  const valid = d.candidates.every((c) => c.title?.trim() && c.mapsQuery?.trim() && c.rank >= 1)
  if (!valid) {
    return {
      ok: false,
      result: makeToolResult({
        toolId: raw.toolId,
        success: false,
        status: 'failed',
        data: d,
        source: raw.source,
        sourceType: raw.sourceType,
        isRealData: false,
        errorCode: 'places_invalid',
        errorMessage: '장소명/위치/출처가 불완전합니다.',
        confidence: 0,
        verifiedAt: Date.now(),
      }),
      userMessage: '장소 데이터 형식이 올바르지 않아 표시하지 않습니다.',
    }
  }
  // photon/catalog live-ish; curated is honest but not live API
  const isReal = raw.sourceType === 'live_api' || raw.sourceType === 'catalog'
  return {
    ok: true,
    result: makeToolResult({
      ...raw,
      success: true,
      data: d,
      isRealData: isReal && raw.sourceType !== 'curated',
      confidence: raw.sourceType === 'curated' ? 0.55 : raw.confidence,
      verifiedAt: Date.now(),
    }),
  }
}

export function verifyCalendarWrite(
  raw: ToolResult<EngineCalendarWrite>,
): VerifyOutcome<EngineCalendarWrite> {
  const d = raw.data
  if (!raw.success || !d?.reminderId) {
    return {
      ok: false,
      result: makeToolResult({
        toolId: raw.toolId,
        success: false,
        status: 'failed',
        data: d,
        source: raw.source,
        sourceType: 'local_store',
        isRealData: false,
        errorCode: raw.errorCode || 'calendar_write_failed',
        errorMessage: raw.errorMessage || '일정 저장 실패',
        confidence: 0,
        verifiedAt: Date.now(),
      }),
      userMessage: '일정 저장에 실패했어요. 저장된 것으로 처리하지 않습니다.',
    }
  }
  // Re-read from storage
  const found = loadReminders().find((r) => r.id === d.reminderId)
  if (!found || found.text !== d.title) {
    return {
      ok: false,
      result: makeToolResult({
        toolId: raw.toolId,
        success: false,
        status: 'failed',
        data: d,
        source: 'localStorage',
        sourceType: 'local_store',
        isRealData: false,
        errorCode: 'calendar_verify_miss',
        errorMessage: '저장소 재조회에서 일정을 찾지 못했습니다.',
        confidence: 0,
        verifiedAt: Date.now(),
      }),
      userMessage: '저장 요청 후 목록에서 확인되지 않았어요. 완료·성공으로 처리하지 않습니다.',
    }
  }
  const verified: EngineCalendarWrite = { ...d, verified: true }
  return {
    ok: true,
    result: makeToolResult({
      toolId: raw.toolId,
      success: true,
      status: 'ok',
      data: verified,
      source: 'localStorage',
      sourceType: 'local_store',
      isRealData: true,
      confidence: 0.95,
      verifiedAt: Date.now(),
    }),
  }
}

/** Generic memory re-read helper for session context fields. */
export function verifyMemoryField(
  ctx: SessionContext,
  key: 'city' | 'selected',
  expected: string,
): VerifyOutcome<{ key: string; value: string }> {
  const actual =
    key === 'city' ? ctx.city : ctx.selected ? `${ctx.selected.rank}:${ctx.selected.title}` : ''
  if (!actual || actual !== expected) {
    return {
      ok: false,
      result: makeToolResult<{ key: string; value: string }>({
        toolId: 'memory.read',
        success: false,
        status: 'failed',
        data: { key, value: actual || '' },
        source: 'session',
        sourceType: 'local_store',
        isRealData: false,
        errorCode: 'memory_mismatch',
        errorMessage: `기억 불일치: ${key}`,
        confidence: 0,
        verifiedAt: Date.now(),
      }),
      userMessage: '이전 대화 내용을 확인하지 못했어요.',
    }
  }
  return {
    ok: true,
    result: makeToolResult({
      toolId: 'memory.read',
      success: true,
      data: { key, value: actual },
      source: 'session',
      sourceType: 'local_store',
      isRealData: true,
      confidence: 1,
      verifiedAt: Date.now(),
    }),
  }
}

/** Forbidden success phrases when verification failed. */
export function containsForbiddenSuccessClaim(text: string): boolean {
  return /완료되었습니다|저장했습니다|예약했습니다|등록\s*완료|성공적으로\s*저장/.test(text)
}
