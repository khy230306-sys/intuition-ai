/**
 * Places tool — capability-based Provider selection. No curated Production fallback.
 */

import {
  resolvePlacesProvider,
  type ProviderPlace,
} from '../providers'
import { makeToolResult, type ToolResult } from '../toolResult'
import type { EnginePlaceCandidate } from '../types'

export type PlacesToolData = {
  candidates: EnginePlaceCandidate[]
  query: string
  provider: string
  providerRequestId: string
  degraded: boolean
  missingCapabilities: string[]
  fallbackFrom: string | null
  providerTier: string
}

function toCandidate(p: ProviderPlace, rank: number): EnginePlaceCandidate {
  const source =
    p.provider === 'photon'
      ? 'photon'
      : p.provider === 'google_places'
        ? 'google_places'
        : p.provider === 'test_places'
          ? 'test_places'
          : 'photon'
  return {
    rank,
    id: p.providerPlaceId,
    title: p.name,
    subtitle: p.address || p.category,
    mapsQuery: p.navigationQuery || p.name,
    source,
    provider: p.provider,
    providerPlaceId: p.providerPlaceId,
    address: p.address,
    latitude: p.latitude,
    longitude: p.longitude,
    category: p.category,
    // Pass through only if present — never invent
    rating: p.rating ?? undefined,
    reviewCount: p.reviewCount ?? undefined,
    mapsUrl: p.mapsUrl,
    fetchedAt: p.fetchedAt,
    rawSourceAvailable: p.rawSourceAvailable,
    attributions: p.attributions,
  }
}

export async function runPlacesTool(opts: {
  city: string
  utterance: string
}): Promise<ToolResult<PlacesToolData>> {
  const city = opts.city || ''
  const query = /아이|어린이|키즈/.test(opts.utterance)
    ? `${city} 어린이 체험 공원`.trim()
    : `${city} 가족 나들이`.trim()

  const resolved = await resolvePlacesProvider()
  if (!resolved.provider || resolved.availability !== 'READY') {
    const avail = resolved.availability
    return makeToolResult({
      toolId: 'places.family_seek',
      success: false,
      status: avail === 'PENDING_EXTERNAL_SETUP' ? 'pending_external_setup' : 'failed',
      source: resolved.health?.providerId || 'none',
      sourceType: 'none',
      isRealData: false,
      provider: resolved.health?.providerId || null,
      errorCode: avail === 'PENDING_EXTERNAL_SETUP' ? 'PENDING_EXTERNAL_SETUP' : avail,
      errorMessage:
        avail === 'PENDING_EXTERNAL_SETUP'
          ? '실제 장소 검색 서비스를 연결해야 합니다. (PENDING_EXTERNAL_SETUP)'
          : '실제 장소 검색 서비스를 사용할 수 없습니다. 가짜 후보를 만들지 않습니다.',
      confidence: 0,
      verificationMethod: 'none',
      degraded: false,
      missingCapabilities: resolved.missingCapabilities,
    })
  }

  const provider = resolved.provider
  try {
    const out = await provider.searchPlaces({
      query,
      city: city || undefined,
      limit: 5,
    })
    if (!out.places.length) {
      return makeToolResult({
        toolId: 'places.family_seek',
        success: false,
        status: 'failed',
        source: provider.id,
        sourceType: 'live_api',
        isRealData: false,
        provider: provider.id,
        providerRequestId: out.providerRequestId,
        errorCode: 'places_empty',
        errorMessage: '검색 결과가 비어 있습니다. 장소를 만들어내지 않습니다.',
        confidence: 0,
        verificationMethod: 'none',
        degraded: resolved.degraded,
        missingCapabilities: resolved.missingCapabilities,
      })
    }

    const candidates = out.places.map((p: ProviderPlace, i: number) => toCandidate(p, i + 1))
    return makeToolResult({
      toolId: 'places.family_seek',
      success: true,
      status: resolved.degraded ? 'partial' : 'ok',
      data: {
        candidates,
        query,
        provider: provider.id,
        providerRequestId: out.providerRequestId,
        degraded: resolved.degraded,
        missingCapabilities: resolved.missingCapabilities,
        fallbackFrom: resolved.fallbackFrom,
        providerTier: provider.tier,
      },
      source: provider.id,
      sourceType: 'live_api',
      isRealData: false,
      provider: provider.id,
      providerRequestId: out.providerRequestId,
      confidence: resolved.degraded ? 0.7 : 0.85,
      verificationMethod: 'provider_id_and_geo',
      degraded: resolved.degraded,
      missingCapabilities: resolved.missingCapabilities,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'places_error'
    const pending = msg === 'PENDING_EXTERNAL_SETUP' || /PENDING_EXTERNAL_SETUP/.test(msg)
    const quota = msg === 'QUOTA_EXCEEDED' || /QUOTA_EXCEEDED/.test(msg)
    return makeToolResult({
      toolId: 'places.family_seek',
      success: false,
      status: pending ? 'pending_external_setup' : 'failed',
      source: provider.id,
      sourceType: 'live_api',
      isRealData: false,
      provider: provider.id,
      errorCode: pending ? 'PENDING_EXTERNAL_SETUP' : quota ? 'QUOTA_EXCEEDED' : 'places_provider_error',
      errorMessage: pending
        ? '실제 장소 검색 서비스를 연결해야 합니다.'
        : quota
          ? '장소 검색 할당량(quota)을 초과했습니다. 잠시 후 다시 시도해 주세요.'
          : `장소 검색 실패: ${msg}`,
      confidence: 0,
      verificationMethod: 'none',
      degraded: resolved.degraded,
      missingCapabilities: resolved.missingCapabilities,
    })
  }
}

export function formatPlacesReply(
  city: string,
  candidates: EnginePlaceCandidate[],
  weatherNote?: string,
  sourceNote?: string,
): string {
  const head = weatherNote
    ? `${weatherNote}\n\n【${city} · 아이와 갈 만한 곳】`
    : `【${city} · 아이와 갈 만한 곳】`
  const lines = candidates.map((c) => {
    const src = c.provider || c.source
    const addr = c.address ? ` — ${c.address}` : c.subtitle ? ` — ${c.subtitle}` : ''
    const rating =
      typeof c.rating === 'number' ? ` · ★${c.rating.toFixed(1)}` : ''
    return `${c.rank}. ${c.title}${addr}${rating} · ${src}`
  })
  return [
    head,
    sourceNote || '',
    ...lines,
    '',
    '번호로 골라 주세요. 예: 「두 번째가 괜찮네」',
    '실제 예약·영업 여부는 지도에서 확인해 주세요.',
  ]
    .filter((x) => x !== '')
    .join('\n')
}

export function formatPlacesUnavailable(message: string): string {
  return [
    '【장소 검색】',
    message,
    '가짜 장소 목록은 표시하지 않습니다.',
  ].join('\n')
}

export function formatPlacesDegradedNote(
  providerId: string,
  missing: string[],
  fallbackFrom: string | null,
): string {
  const miss = missing.length ? ` 부족 정보: ${missing.join(', ')}` : ''
  if (providerId === 'photon') {
    return `※ 보조 검색(Photon) 결과입니다. Google Places급 추천·평점이 아닙니다.${miss}${
      fallbackFrom ? ` (선호: ${fallbackFrom})` : ''
    }`
  }
  if (missing.length) {
    return `※ 일부 상세 정보가 없습니다.${miss}`
  }
  return `※ 실제 외부 장소 데이터 (${providerId})`
}
