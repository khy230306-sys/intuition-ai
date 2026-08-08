/**
 * Configure @huggingface/transformers to load ONNX Runtime WASM from CDN.
 * Keeps the ShipStatic deploy under the 20MB/file limit (asyncify wasm is ~23MB).
 * Workbox runtimeCaching caches these URLs after first online load for offline Local AI.
 */

/** Must match the onnxruntime-web version nested under @huggingface/transformers. */
export const ORT_WEB_VERSION = '1.26.0-dev.20260416-b7804b056c'

export const ORT_CDN_PREFIX = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_WEB_VERSION}/dist/`

function preferSafariWasmPaths(): boolean {
  if (typeof navigator === 'undefined') return true
  const ua = navigator.userAgent || ''
  // iOS / iPadOS / Safari desktop — transformers default uses non-asyncify here
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  if (/Macintosh/i.test(ua) && 'ontouchend' in (typeof document !== 'undefined' ? document : {})) return true
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua)) return true
  return false
}

/** Apply CDN wasmPaths + browser cache. Safe to call multiple times. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function configureTransformersEnv(env: any): void {
  env.allowLocalModels = false
  env.useBrowserCache = true
  env.backends = env.backends || {}
  env.backends.onnx = env.backends.onnx || {}
  env.backends.onnx.wasm = env.backends.onnx.wasm || {}

  const safari = preferSafariWasmPaths()
  const base = safari ? 'ort-wasm-simd-threaded' : 'ort-wasm-simd-threaded.asyncify'
  env.backends.onnx.wasm.wasmPaths = {
    mjs: `${ORT_CDN_PREFIX}${base}.mjs`,
    wasm: `${ORT_CDN_PREFIX}${base}.wasm`,
  }
  // Keep main thread responsive; proxy can fail in some PWAs — leave default false
  env.backends.onnx.wasm.proxy = false
}

/** Prefetch ORT wasm into HTTP/Cache so offline Local AI can start after one online install. */
export async function prefetchOrtRuntime(): Promise<void> {
  if (typeof fetch === 'undefined') return
  const safari = preferSafariWasmPaths()
  const base = safari ? 'ort-wasm-simd-threaded' : 'ort-wasm-simd-threaded.asyncify'
  const urls = [`${ORT_CDN_PREFIX}${base}.mjs`, `${ORT_CDN_PREFIX}${base}.wasm`]
  await Promise.all(
    urls.map(async (url) => {
      try {
        await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'force-cache' })
      } catch {
        /* non-fatal — pipeline() will retry */
      }
    }),
  )
}
