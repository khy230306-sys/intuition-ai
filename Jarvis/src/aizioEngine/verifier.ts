/**
 * Verifier V1.2 — REAL requires provider identity + re-read where applicable.
 */

import { getLocalCalendarProvider, resolveExternalCalendarProvider } from './providers'
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
        verificationMethod: 'field_check',
      }),
      userMessage: '날씨 조회 결과를 확인하지 못했어요. 완료된 것으로 처리하지 않습니다.',
    }
  }
  if (!d.city?.trim() || !d.label?.trim() || !d.dayLabel || !d.fetchedAt) {
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
        errorMessage: '위치·날짜·예보·조회시각이 불완전합니다.',
        confidence: 0,
        verifiedAt: Date.now(),
        verificationMethod: 'field_check',
      }),
      userMessage: '날씨 응답이 불완전해 신뢰할 수 없어요.',
    }
  }
  const isReal = raw.sourceType === 'live_api' && /open-meteo/i.test(raw.source)
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
      verificationMethod: 'field_check',
      provider: raw.provider || raw.source,
    }),
  }
}

function placeIsRealShape(c: EnginePlaceCandidate): boolean {
  if (!c.providerPlaceId?.trim()) return false
  if (!c.provider?.trim()) return false
  if (!c.title?.trim()) return false
  if (!c.fetchedAt) return false
  if (c.rawSourceAvailable !== true) return false
  const hasGeo =
    (c.latitude != null && c.longitude != null && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) ||
    Boolean(c.address?.trim())
  if (!hasGeo) return false
  if (c.source === 'curated' || c.source === 'catalog') return false
  return true
}

export type PlacesVerifyData = {
  candidates: EnginePlaceCandidate[]
  query: string
  provider?: string
  providerRequestId?: string
  degraded?: boolean
  missingCapabilities?: string[]
  fallbackFrom?: string | null
  providerTier?: string
}

export function verifyPlacesResult(
  raw: ToolResult<PlacesVerifyData>,
): VerifyOutcome<PlacesVerifyData> {
  const pendingExternal = raw.status === 'pending_external_setup'
  if (pendingExternal) {
    return {
      ok: false,
      result: makeToolResult({
        ...raw,
        success: false,
        isRealData: false,
        verifiedAt: Date.now(),
        verificationMethod: 'none',
      }),
      userMessage: raw.errorMessage || '실제 장소 검색 서비스를 연결해야 합니다.',
    }
  }

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
        provider: raw.provider,
        providerRequestId: raw.providerRequestId,
        errorCode: raw.errorCode || 'places_empty',
        errorMessage: raw.errorMessage || '장소 후보가 없습니다.',
        confidence: 0,
        verifiedAt: Date.now(),
        verificationMethod: 'none',
      }),
      userMessage:
        raw.errorMessage ||
        '실제 장소 검색 결과를 확인하지 못했어요. 가짜 장소를 만들지 않습니다.',
    }
  }

  if (!raw.provider && !d.provider) {
    return {
      ok: false,
      result: makeToolResult({
        ...raw,
        success: false,
        isRealData: false,
        errorCode: 'places_no_provider',
        errorMessage: 'Provider 식별자가 없습니다.',
        verifiedAt: Date.now(),
        verificationMethod: 'provider_id_and_geo',
      }),
      userMessage: '장소 Provider를 확인할 수 없어 REAL로 처리하지 않습니다.',
    }
  }

  const allRealShape = d.candidates.every(placeIsRealShape)
  if (!allRealShape) {
    return {
      ok: false,
      result: makeToolResult({
        ...raw,
        success: false,
        status: 'failed',
        isRealData: false,
        errorCode: 'places_not_real_shape',
        errorMessage:
          'providerPlaceId·위치/주소·조회시각·출처가 불완전하거나 curated/catalog 결과입니다.',
        confidence: 0,
        verifiedAt: Date.now(),
        verificationMethod: 'provider_id_and_geo',
      }),
      userMessage: '실제 외부 장소 데이터로 확인되지 않아 목록을 표시하지 않습니다.',
    }
  }

  const isReal =
    raw.sourceType === 'live_api' &&
    allRealShape &&
    Boolean(raw.providerRequestId || d.providerRequestId)

  return {
    ok: true,
    result: makeToolResult({
      ...raw,
      success: true,
      data: d,
      isRealData: isReal,
      confidence: isReal ? Math.max(raw.confidence, 0.9) : 0.5,
      verifiedAt: Date.now(),
      verificationMethod: 'provider_id_and_geo',
      provider: raw.provider || d.provider,
      providerRequestId: raw.providerRequestId || d.providerRequestId,
      externalId: d.candidates[0]?.providerPlaceId,
    }),
  }
}

export async function verifyCalendarWrite(
  raw: ToolResult<EngineCalendarWrite>,
): Promise<VerifyOutcome<EngineCalendarWrite>> {
  const d = raw.data
  if (!raw.success || !d?.reminderId) {
    return {
      ok: false,
      result: makeToolResult({
        toolId: raw.toolId,
        success: false,
        status: raw.status === 'pending_external_setup' ? 'pending_external_setup' : 'failed',
        data: d,
        source: raw.source,
        sourceType: raw.sourceType,
        isRealData: false,
        provider: raw.provider,
        errorCode: raw.errorCode || 'calendar_write_failed',
        errorMessage: raw.errorMessage || '일정 저장 실패',
        confidence: 0,
        verifiedAt: Date.now(),
        verificationMethod: 'none',
      }),
      userMessage: raw.errorMessage || '일정 저장에 실패했어요. 저장된 것으로 처리하지 않습니다.',
    }
  }

  if (d.calendarKind === 'external') {
    const ext = await resolveExternalCalendarProvider()
    if (!ext.provider) {
      return {
        ok: false,
        result: makeToolResult({
          ...raw,
          success: false,
          status: 'pending_external_setup',
          isRealData: false,
          errorCode: 'PENDING_EXTERNAL_SETUP',
          errorMessage: 'Google Calendar가 아직 연결되지 않았습니다.',
          verifiedAt: Date.now(),
        }),
        userMessage: 'Google Calendar가 아직 연결되지 않았습니다.',
      }
    }
    const found = await ext.provider.getEvent(d.externalEventId || d.reminderId)
    const timeOk =
      found != null &&
      (found.whenAt === d.whenAt ||
        Math.abs((found.whenAt || 0) - d.whenAt) < 120_000 ||
        (found.whenLabel && d.whenLabel && found.whenLabel.includes(d.whenLabel.slice(0, 8))))
    if (!found || found.title !== d.title || !timeOk) {
      return {
        ok: false,
        result: makeToolResult({
          ...raw,
          success: false,
          isRealData: false,
          errorCode: 'calendar_external_verify_miss',
          errorMessage: '외부 캘린더 재조회에서 제목/시간 일치 이벤트를 찾지 못했습니다.',
          verifiedAt: Date.now(),
          verificationMethod: 'external_reread',
        }),
        userMessage: 'Google Calendar 등록을 재조회로 확인하지 못했어요. 완료로 처리하지 않습니다.',
      }
    }
    const verified: EngineCalendarWrite = { ...d, verified: true }
    return {
      ok: true,
      result: makeToolResult({
        ...raw,
        success: true,
        data: verified,
        isRealData: true,
        confidence: 0.95,
        verifiedAt: Date.now(),
        verificationMethod: 'external_reread',
        provider: d.provider,
        externalId: found.eventId,
      }),
    }
  }

  // Local AIZIO calendar
  const local = getLocalCalendarProvider()
  const found = await local.getEvent(d.reminderId)
  if (!found || found.title !== d.title) {
    return {
      ok: false,
      result: makeToolResult({
        ...raw,
        success: false,
        isRealData: false,
        errorCode: 'calendar_verify_miss',
        errorMessage: 'AIZIO 내부 일정 재조회 실패',
        verifiedAt: Date.now(),
        verificationMethod: 'store_reread',
      }),
      userMessage: 'AIZIO 내부 일정 저장을 확인하지 못했어요. 완료로 처리하지 않습니다.',
    }
  }
  const verified: EngineCalendarWrite = { ...d, verified: true, calendarKind: 'local' }
  return {
    ok: true,
    result: makeToolResult({
      ...raw,
      success: true,
      data: verified,
      isRealData: true,
      sourceType: 'local_store',
      confidence: 0.95,
      verifiedAt: Date.now(),
      verificationMethod: 'store_reread',
      provider: d.provider || 'aizio_local_calendar',
      externalId: found.eventId,
    }),
  }
}

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

export function containsForbiddenSuccessClaim(text: string): boolean {
  // Honest success phrases are allowed; bare/fake completion claims are not.
  if (/AIZIO 내부 일정에 저장/.test(text)) return false
  if (/Google Calendar에 등록했습니다/.test(text)) return false
  if (/외부 캘린더에 등록했습니다/.test(text)) return false
  return /완료되었습니다|저장했습니다|예약했습니다|등록\s*완료|성공적으로\s*저장|캘린더에\s*등록했습니다/.test(
    text,
  )
}
