import { mockVisionProvider } from './providers/mockVision'
import { openAiVisionProvider } from './providers/openAiVision'
import { openRouterVisionProvider } from './providers/openRouterVision'
import { fallbackVisionResult } from './visionSchema'
import type { VisionAnalyzeInput, VisionAnalyzeResult, VisionProvider } from './types'

const PROVIDERS: VisionProvider[] = [openAiVisionProvider, openRouterVisionProvider, mockVisionProvider]

export function listVisionProviders(): VisionProvider[] {
  return PROVIDERS
}

export function pickVisionProvider(): VisionProvider {
  for (const p of PROVIDERS) {
    if (p.id === 'mock') continue
    if (p.isAvailable()) return p
  }
  return mockVisionProvider
}

export async function analyzeImage(input: VisionAnalyzeInput): Promise<VisionAnalyzeResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    // Still allow mock for offline UI validation
    const mock = await mockVisionProvider.analyzeImage(input)
    return {
      ...mock,
      ok: false,
      warnings: [
        '오프라인입니다. 데모 결과만 표시합니다. 연결 후 다시 분석해 주세요.',
        ...mock.warnings,
      ],
      errorCode: 'offline',
      provider: 'mock-offline',
    }
  }

  const primary = pickVisionProvider()
  try {
    const result = await primary.analyzeImage(input)
    if (result.ok || result.errorCode === 'parse') return result
    // Fallback to mock so UI never hard-crashes
    if (primary.id !== 'mock') {
      const demo = await mockVisionProvider.analyzeImage(input)
      return {
        ...demo,
        warnings: [
          `${primary.label} 사용 불가 — 데모 결과로 대체했습니다. (${result.summary})`,
          ...demo.warnings,
        ],
        errorCode: result.errorCode || 'fallback_mock',
      }
    }
    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : '분석 실패'
    try {
      const demo = await mockVisionProvider.analyzeImage(input)
      return {
        ...demo,
        warnings: [`분석 오류 — 데모 결과: ${msg}`, ...demo.warnings],
        errorCode: 'exception',
      }
    } catch {
      return fallbackVisionResult(input.mode, 'none', msg, 'fatal')
    }
  }
}
