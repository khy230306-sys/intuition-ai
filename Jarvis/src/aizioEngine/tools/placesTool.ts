/**
 * Family place seek — ToolResult. Curated ≠ live (isRealData false).
 */

import { searchPlaces } from '../../navigationV2/placeSearchService'
import { makeToolResult, type ToolResult } from '../toolResult'
import type { EnginePlaceCandidate } from '../types'

const CURATED_FAMILY: Record<string, Array<{ title: string; mapsQuery: string; subtitle: string }>> = {
  울산: [
    { title: '울산대공원', mapsQuery: '울산대공원', subtitle: '넓은 공원 · 가족 산책' },
    { title: '울산박물관', mapsQuery: '울산박물관', subtitle: '실내 관람 · 아이 체험' },
    { title: '태화강 국가정원', mapsQuery: '태화강 국가정원', subtitle: '산책·자전거 · 야외' },
    { title: '울산 고래생태체험관', mapsQuery: '울산 고래생태체험관', subtitle: '아이 체험 · 실내외' },
  ],
  서울: [
    { title: '서울숲', mapsQuery: '서울숲', subtitle: '공원 · 가족' },
    { title: '국립중앙박물관', mapsQuery: '국립중앙박물관', subtitle: '실내 관람' },
    { title: '어린이대공원', mapsQuery: '서울 어린이대공원', subtitle: '놀이·동물' },
  ],
  부산: [
    { title: '부산시립박물관', mapsQuery: '부산시립박물관', subtitle: '실내 관람' },
    { title: '용두산공원', mapsQuery: '용두산공원', subtitle: '전망·산책' },
    { title: '부산 어린이회관', mapsQuery: '부산 어린이회관', subtitle: '아이 체험' },
  ],
}

function toCandidates(
  items: Array<{
    title: string
    mapsQuery: string
    subtitle?: string
    source: EnginePlaceCandidate['source']
    id?: string
  }>,
): EnginePlaceCandidate[] {
  return items.slice(0, 5).map((it, i) => ({
    rank: i + 1,
    id: it.id || `place_${i + 1}`,
    title: it.title,
    subtitle: it.subtitle,
    mapsQuery: it.mapsQuery,
    source: it.source,
  }))
}

export type PlacesToolData = { candidates: EnginePlaceCandidate[]; query: string }

export async function runPlacesTool(opts: {
  city: string
  utterance: string
}): Promise<ToolResult<PlacesToolData>> {
  const city = opts.city || '울산'
  const query = /아이|어린이|키즈/.test(opts.utterance)
    ? `${city} 어린이 체험 공원`
    : `${city} 가족 나들이`

  const remote = await searchPlaces(query, { allowRemote: true, limit: 5 })
  if (remote.ok && remote.candidates.length >= 2) {
    const candidates = toCandidates(
      remote.candidates.map((c, i) => ({
        title: c.name,
        mapsQuery: c.name,
        subtitle: c.address || c.category || remote.provider,
        source: remote.catalogOnly ? 'catalog' : 'photon',
        id: c.id || `remote_${i}`,
      })),
    )
    return makeToolResult({
      toolId: 'places.family_seek',
      success: true,
      data: { candidates, query },
      source: remote.provider,
      sourceType: remote.catalogOnly ? 'catalog' : 'live_api',
      isRealData: !remote.catalogOnly,
      confidence: remote.catalogOnly ? 0.7 : 0.85,
    })
  }

  const curated = CURATED_FAMILY[city] || CURATED_FAMILY['울산']!
  const candidates = toCandidates(curated.map((c) => ({ ...c, source: 'curated' as const })))
  return makeToolResult({
    toolId: 'places.family_seek',
    success: true,
    data: { candidates, query },
    source: 'curated-family',
    sourceType: 'curated',
    // Honest public-place shortlist — NOT live rankings / NOT demo restaurants
    isRealData: false,
    confidence: 0.55,
  })
}

/** @deprecated */
export async function seekFamilyPlaces(opts: {
  city: string
  utterance: string
}): Promise<{ candidates: EnginePlaceCandidate[]; query: string; provider: string }> {
  const r = await runPlacesTool(opts)
  return {
    candidates: r.data?.candidates || [],
    query: r.data?.query || '',
    provider: r.source,
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
    const src =
      c.source === 'curated' ? '후보(공개 장소)' : c.source === 'catalog' ? '로컬목록' : '검색'
    return `${c.rank}. ${c.title}${c.subtitle ? ` — ${c.subtitle}` : ''} · ${src}`
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
