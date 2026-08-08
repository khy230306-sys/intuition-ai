/**
 * Real on-device Local AI via @huggingface/transformers (ONNX WASM / WebGPU).
 * Models are NOT bundled — downloaded on demand into the browser model cache.
 */

import { packById, recommendChatPack, type ModelPackDef } from './modelRegistry'
import { getPackState, setPackState, loadPackStore, savePackStore, isChatModelInstalled } from './packState'
import { probeDeviceCapability } from './deviceCapability'
import { offlineNetworkRefusal } from './hallucinationGuard'

export type LocalAiChatResult = {
  text: string
  engine: 'local-transformers'
  modelId: string
  ms: number
  firstTokenMs?: number
}

type ProgressCb = (p: { progress: number; status: string; file?: string }) => void

let chatPipe: unknown = null
let chatPipeKey = ''
let loading: Promise<unknown> | null = null

async function loadTransformers() {
  return import('@huggingface/transformers')
}

function pickDevice(hasWebGpu: boolean, platform: string): 'wasm' | 'webgpu' {
  // iOS WebGPU is unreliable for production — force WASM
  if (platform === 'ios') return 'wasm'
  return hasWebGpu ? 'webgpu' : 'wasm'
}

export async function downloadPack(packId: string, onProgress?: ProgressCb): Promise<boolean> {
  const def = packById(packId)
  if (!def) return false
  setPackState({ id: packId, status: 'downloading', progress: 0 })
  try {
    const cap = await probeDeviceCapability()
    if (!cap.hasWasm) {
      setPackState({ id: packId, status: 'error', progress: 0, error: 'WebAssembly 미지원' })
      return false
    }
    const { pipeline, env } = await loadTransformers()
    env.allowLocalModels = false
    env.useBrowserCache = true
    const device = pickDevice(cap.hasWebGpu, cap.platform)
    const dtype = def.dtype
    const pipe = await pipeline(def.task, def.hfId, {
      device,
      dtype,
      progress_callback: (info: { progress?: number; status?: string; file?: string }) => {
        const progress = Math.max(0, Math.min(99, Math.round(Number(info.progress) || 0)))
        setPackState({
          id: packId,
          status: 'downloading',
          progress,
        })
        onProgress?.({
          progress,
          status: String(info.status || 'download'),
          file: info.file,
        })
      },
    })
    // Keep chat pipeline warm if this was a chat pack
    if (def.kind === 'chat') {
      chatPipe = pipe
      chatPipeKey = `${def.hfId}|${device}|${dtype}`
      const store = loadPackStore()
      store.activeChatPackId = packId
      savePackStore(store)
    } else {
      // Dispose non-chat pipes to free memory — they reload on use
      try {
        const disposable = pipe as { dispose?: () => Promise<void> }
        await disposable.dispose?.()
      } catch {
        /* ignore */
      }
    }
    setPackState({
      id: packId,
      status: 'installed',
      progress: 100,
      installedAt: new Date().toISOString(),
    })
    onProgress?.({ progress: 100, status: 'done' })
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'download failed'
    setPackState({ id: packId, status: 'error', progress: 0, error: msg.slice(0, 200) })
    return false
  }
}

export async function deletePack(packId: string): Promise<void> {
  setPackState({ id: packId, status: 'not_installed', progress: 0 })
  if (packById(packId)?.kind === 'chat') {
    chatPipe = null
    chatPipeKey = ''
  }
  // transformers.js Cache Storage entries are keyed by HF urls — best-effort clear
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      for (const k of keys) {
        if (/huggingface|transformers|onnx/i.test(k)) {
          // do not delete unrelated shell caches
          /* leave HF cache; user can clear site data — safer than wiping all */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

async function ensureChatPipeline(def: ModelPackDef): Promise<unknown> {
  const cap = await probeDeviceCapability()
  const device = pickDevice(cap.hasWebGpu, cap.platform)
  const key = `${def.hfId}|${device}|${def.dtype}`
  if (chatPipe && chatPipeKey === key) return chatPipe
  if (loading) return loading
  loading = (async () => {
    const { pipeline, env } = await loadTransformers()
    env.allowLocalModels = false
    env.useBrowserCache = true
    const pipe = await pipeline(def.task, def.hfId, {
      device,
      dtype: def.dtype,
    })
    chatPipe = pipe
    chatPipeKey = key
    loading = null
    return pipe
  })()
  try {
    return await loading
  } catch (e) {
    loading = null
    setPackState({
      id: def.id,
      status: 'corrupt',
      progress: 0,
      error: e instanceof Error ? e.message : 'load failed',
    })
    throw e
  }
}

export async function localAiChat(input: {
  message: string
  history?: Array<{ role: string; text: string }>
  displayName?: string
  signal?: AbortSignal
}): Promise<LocalAiChatResult | { error: string; needInstall?: boolean }> {
  const refusal = offlineNetworkRefusal(input.message)
  if (refusal && typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { text: refusal, engine: 'local-transformers', modelId: 'policy', ms: 0 }
  }

  if (!isChatModelInstalled()) {
    return {
      error:
        '오프라인 AI 모델이 아직 설치되지 않았어요. 설정 → AIZIO Anywhere에서 「오프라인 AI」를 다운로드해 주세요.',
      needInstall: true,
    }
  }

  const store = loadPackStore()
  let def = packById(store.activeChatPackId)
  if (!def || getPackState(def.id).status !== 'installed') {
    def = recommendChatPack('LITE')
    if (getPackState(def.id).status !== 'installed') {
      return { error: '설치된 오프라인 AI 모델이 없습니다.', needInstall: true }
    }
  }

  const t0 = Date.now()
  try {
    const pipe = (await ensureChatPipeline(def)) as (msgs: unknown, opts: unknown) => Promise<unknown>
    const name = input.displayName || '사용자'
    const messages = [
      {
        role: 'system',
        content:
          `You are AIZIO, a helpful on-device assistant for ${name}. ` +
          'Reply in Korean unless asked otherwise. Be concise. ' +
          'Never invent live weather, flight prices, hotel rates, or bookings. ' +
          'If you lack real-time data, say you are offline.',
      },
      ...(input.history || [])
        .slice(-6)
        .map((h) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: String(h.text || '').slice(0, 500),
        })),
      { role: 'user', content: String(input.message || '').slice(0, 1200) },
    ]
    const out = (await pipe(messages, {
      max_new_tokens: 160,
      temperature: 0.7,
      do_sample: true,
    })) as Array<{ generated_text?: Array<{ content?: string }> | string }>
    const gen = out?.[0]?.generated_text
    let text = ''
    if (Array.isArray(gen)) {
      text = String(gen[gen.length - 1]?.content || '').trim()
    } else if (typeof gen === 'string') {
      text = gen.trim()
    }
    if (!text) text = '로컬 AI 응답을 만들지 못했어요. 다시 한 번 말해 주세요.'
    setPackState({
      ...getPackState(def.id),
      status: 'installed',
      progress: 100,
      lastUsedAt: new Date().toISOString(),
    })
    return {
      text,
      engine: 'local-transformers',
      modelId: def.hfId,
      ms: Date.now() - t0,
    }
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `오프라인 AI 로드 실패: ${err.message.slice(0, 160)}. 설정에서 모델을 다시 다운로드해 주세요.`
          : '오프라인 AI 실행에 실패했습니다.',
    }
  }
}

export function localAiStatusLine(): string {
  if (!isChatModelInstalled()) return '오프라인 AI · 설치 필요'
  const st = getPackState(loadPackStore().activeChatPackId)
  if (st.status === 'corrupt') return '오프라인 AI · 손상 · 재다운로드 필요'
  return '오프라인 AI · 설치됨'
}
