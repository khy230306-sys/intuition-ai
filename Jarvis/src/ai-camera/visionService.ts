import { MSG_VISION_NEEDS_KEY } from '../featureTruth'
import { openAiVisionProvider } from './providers/openAiVision'
import { openRouterVisionProvider } from './providers/openRouterVision'
import { fallbackVisionResult } from './visionSchema'
import type { VisionAnalyzeInput, VisionAnalyzeResult, VisionProvider } from './types'
import { mockVisionProvider } from './providers/mockVision'

const LIVE_PROVIDERS: VisionProvider[] = [openAiVisionProvider, openRouterVisionProvider]

/** Exported for tests that still exercise mock vision. */
export function listVisionProviders(): VisionProvider[] {
  return [...LIVE_PROVIDERS, mockVisionProvider]
}

export function pickVisionProvider(): VisionProvider | null {
  for (const p of LIVE_PROVIDERS) {
    if (p.isAvailable()) return p
  }
  return null
}

/**
 * Analyze image with a real Vision provider only.
 * Mock OCR/food demos are never returned as success content to users.
 */
export async function analyzeImage(input: VisionAnalyzeInput): Promise<VisionAnalyzeResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return fallbackVisionResult(input.mode, 'none', '오프라인입니다. 연결 후 다시 분석해 주세요.', 'offline')
  }

  const primary = pickVisionProvider()
  if (!primary) {
    return fallbackVisionResult(input.mode, 'none', MSG_VISION_NEEDS_KEY, 'needs_provider')
  }

  try {
    const result = await primary.analyzeImage(input)
    if (result.ok || result.errorCode === 'parse') return result
    return fallbackVisionResult(
      input.mode,
      primary.id,
      `${primary.label} 분석 실패: ${result.summary || '오류'}. 데모 결과로 대체하지 않습니다.`,
      result.errorCode || 'provider_error',
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : '분석 실패'
    return fallbackVisionResult(input.mode, primary.id, `분석 오류: ${msg}`, 'exception')
  }
}
