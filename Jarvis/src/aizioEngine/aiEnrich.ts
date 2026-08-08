/**
 * Optional Hybrid AI phrasing helpers for REAL tool results.
 * Never invents tool facts — only soft tips when providers are configured.
 * Hard-capped so enrichment never blocks release-speed weather/places replies.
 */

import { hasAnyConfiguredProvider, runHybridChat } from '../ai-providers'
import { loadSettings } from '../storage'
import type { EnginePlaceCandidate, EngineWeatherSnapshot } from './types'

const ENRICH_BUDGET_MS = 1_200

function withBudget<T>(p: Promise<T>, fallback: T, ms = ENRICH_BUDGET_MS): Promise<T> {
  return new Promise((resolve) => {
    let done = false
    const timer = setTimeout(() => {
      if (!done) {
        done = true
        resolve(fallback)
      }
    }, ms)
    p.then(
      (v) => {
        if (!done) {
          done = true
          clearTimeout(timer)
          resolve(v)
        }
      },
      () => {
        if (!done) {
          done = true
          clearTimeout(timer)
          resolve(fallback)
        }
      },
    )
  })
}

export async function enrichWeatherTip(w: EngineWeatherSnapshot): Promise<string> {
  if (!hasAnyConfiguredProvider()) return ''
  return withBudget(
    (async () => {
      try {
        const settings = loadSettings()
        const facts = [
          `${w.dayLabel} ${w.city} 날씨: ${w.label}`,
          w.tempC != null ? `기온 약 ${w.tempC}°C` : '',
          w.precipProb != null ? `강수확률 ${w.precipProb}%` : '',
          w.rainingLikely ? '비 가능성 있음' : '비 가능성 낮음',
          `출처: ${w.source}`,
        ]
          .filter(Boolean)
          .join(' · ')
        const ctrl = new AbortController()
        const kill = setTimeout(() => ctrl.abort(), ENRICH_BUDGET_MS)
        try {
          const result = await runHybridChat({
            message: [
              '아래는 이미 확인된 날씨 팩트입니다. 숫자를 바꾸거나 새 예보를 만들지 마세요.',
              facts,
              '사용자에게 짧은 생활 팁 1~2문장만 한국어로 덧붙이세요. (옷차림·우산·실내외 정도)',
              '팁 문장만 출력하세요. 제목·목록·이모지 나열 금지.',
            ].join('\n'),
            history: [],
            displayName: settings.displayName,
            locale: 'ko-KR',
            signal: ctrl.signal,
          })
          const tip = (result.text || '').trim().replace(/\n+/g, ' ')
          if (!tip || tip.length > 220) return ''
          return tip
        } finally {
          clearTimeout(kill)
        }
      } catch {
        return ''
      }
    })(),
    '',
  )
}

export async function enrichPlacesIntro(
  city: string,
  candidates: EnginePlaceCandidate[],
  weatherNote?: string,
): Promise<string> {
  if (!hasAnyConfiguredProvider() || !candidates.length) return ''
  return withBudget(
    (async () => {
      try {
        const settings = loadSettings()
        const list = candidates
          .slice(0, 5)
          .map((c) => `${c.rank}. ${c.title}${c.address ? ` (${c.address})` : ''}`)
          .join('\n')
        const ctrl = new AbortController()
        const kill = setTimeout(() => ctrl.abort(), ENRICH_BUDGET_MS)
        try {
          const result = await runHybridChat({
            message: [
              '아래는 실제 장소 검색 결과입니다. 목록에 없는 장소를 추가하거나 평점을 지어내지 마세요.',
              weatherNote || '',
              `지역: ${city}`,
              list,
              '사용자에게 한두 문장으로 고르는 팁만 한국어로 말하세요. 장소 이름을 새로 만들지 마세요.',
            ]
              .filter(Boolean)
              .join('\n'),
            history: [],
            displayName: settings.displayName,
            locale: 'ko-KR',
            signal: ctrl.signal,
          })
          const tip = (result.text || '').trim().replace(/\n+/g, ' ')
          if (!tip || tip.length > 240) return ''
          return tip
        } finally {
          clearTimeout(kill)
        }
      } catch {
        return ''
      }
    })(),
    '',
  )
}
