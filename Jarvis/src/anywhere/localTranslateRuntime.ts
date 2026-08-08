/** On-device neural translation via transformers.js (downloadable Marian packs). */

import { packById } from './modelRegistry'
import { getPackState, installedTranslatePackIds, setPackState } from './packState'
import { probeDeviceCapability } from './deviceCapability'

const pipeCache = new Map<string, unknown>()

async function loadTransformers() {
  return import('@huggingface/transformers')
}

function packForPair(from: string, to: string): string | null {
  const f = from.slice(0, 2).toLowerCase()
  const t = to.slice(0, 2).toLowerCase()
  if (f === 'ko' && t === 'en') return 'mt-ko-en'
  if (f === 'en' && t === 'ko') return 'mt-en-ko'
  if (f === 'en' && t === 'vi') return 'mt-en-vi'
  if (f === 'en' && t === 'ja') return 'mt-en-ja'
  if (f === 'en' && t === 'zh') return 'mt-en-zh'
  return null
}

async function getPipe(packId: string): Promise<unknown> {
  if (pipeCache.has(packId)) return pipeCache.get(packId)
  const def = packById(packId)
  if (!def) throw new Error('unknown pack')
  if (getPackState(packId).status !== 'installed') {
    throw new Error(`${def.label} 오프라인 언어팩이 아직 설치되지 않았어요.`)
  }
  const cap = await probeDeviceCapability()
  const { pipeline, env } = await loadTransformers()
  env.useBrowserCache = true
  env.allowLocalModels = false
  const device = cap.platform === 'ios' || !cap.hasWebGpu ? 'wasm' : 'webgpu'
  const pipe = await pipeline(def.task, def.hfId, { device, dtype: def.dtype })
  pipeCache.set(packId, pipe)
  return pipe
}

async function runMt(packId: string, text: string): Promise<string> {
  const pipe = (await getPipe(packId)) as (t: string) => Promise<Array<{ translation_text?: string }>>
  const out = await pipe(text.slice(0, 800))
  const translated = out?.[0]?.translation_text || ''
  setPackState({
    ...getPackState(packId),
    status: 'installed',
    progress: 100,
    lastUsedAt: new Date().toISOString(),
  })
  return translated.trim()
}

/**
 * Local neural translate. Returns null if packs missing (caller shows install hint).
 * Korean→VI/JA/ZH uses English pivot when packs allow.
 */
export async function localNeuralTranslate(
  text: string,
  from: string,
  to: string,
): Promise<{ text: string; path: string } | { error: string; missingPack?: string }> {
  const f = from.slice(0, 2).toLowerCase()
  const t = to.slice(0, 2).toLowerCase()
  const installed = new Set(installedTranslatePackIds())

  const direct = packForPair(f, t)
  if (direct) {
    if (!installed.has(direct)) {
      return {
        error: `${packById(direct)?.label || direct} 오프라인 언어팩이 아직 설치되지 않았어요.`,
        missingPack: direct,
      }
    }
    try {
      const out = await runMt(direct, text)
      return { text: out, path: direct }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'local mt failed' }
    }
  }

  // Pivot via English
  if (f === 'ko' && (t === 'vi' || t === 'ja' || t === 'zh')) {
    if (!installed.has('mt-ko-en')) {
      return { error: '번역 · 한국어→영어 오프라인 언어팩이 아직 설치되지 않았어요.', missingPack: 'mt-ko-en' }
    }
    const pivotPack = packForPair('en', t)
    if (!pivotPack || !installed.has(pivotPack)) {
      return {
        error: `${packById(pivotPack || '')?.label || t} 오프라인 언어팩이 아직 설치되지 않았어요.`,
        missingPack: pivotPack || undefined,
      }
    }
    try {
      const en = await runMt('mt-ko-en', text)
      const out = await runMt(pivotPack, en)
      return { text: out, path: `mt-ko-en→${pivotPack}` }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'local mt pivot failed' }
    }
  }

  if (f === 'en' && t === 'ko') {
    /* handled by direct */
  }

  return {
    error: `지원 오프라인 번역 경로가 없습니다 (${f}→${t}). 설정 → AIZIO Anywhere에서 언어팩을 설치해 주세요.`,
  }
}

export function translatePackSummary(): string {
  const ids = installedTranslatePackIds()
  if (!ids.length) return '오프라인 번역 엔진 · 미설치 (내장 표현 사전만)'
  return `오프라인 번역 엔진 · ${ids.length}개 팩`
}
