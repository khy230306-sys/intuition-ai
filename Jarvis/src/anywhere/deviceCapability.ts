/** Device capability probe for Local AI tier selection (PWA / WebKit aware). */

export type DeviceTier = 'LITE' | 'STANDARD' | 'ADVANCED'

export type DeviceCapability = {
  tier: DeviceTier
  platform: 'ios' | 'android' | 'desktop' | 'unknown'
  hasWebGpu: boolean
  hasWasm: boolean
  deviceMemoryGb: number | null
  hardwareConcurrency: number
  estimatedStorageOk: boolean
  notes: string[]
}

function detectPlatform(): DeviceCapability['platform'] {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Windows|Macintosh|Linux/i.test(ua)) return 'desktop'
  return 'unknown'
}

export async function probeDeviceCapability(): Promise<DeviceCapability> {
  const notes: string[] = []
  const platform = detectPlatform()
  const hasWasm = typeof WebAssembly !== 'undefined'
  let hasWebGpu = false
  try {
    hasWebGpu = Boolean((navigator as Navigator & { gpu?: unknown }).gpu)
  } catch {
    hasWebGpu = false
  }
  const nav = navigator as Navigator & { deviceMemory?: number }
  const deviceMemoryGb = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null
  const hardwareConcurrency = navigator.hardwareConcurrency || 2

  let estimatedStorageOk = true
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate()
      const free = (est.quota || 0) - (est.usage || 0)
      estimatedStorageOk = free > 80 * 1024 * 1024
      if (!estimatedStorageOk) notes.push('저장 공간 부족 가능성')
    }
  } catch {
    /* ignore */
  }

  if (!hasWasm) notes.push('WebAssembly 없음 — Local AI 불가')
  if (platform === 'ios') {
    notes.push('iPhone Safari: WebGPU 미보장 → WASM(q4/q8) 경로')
    if (hasWebGpu) notes.push('WebGPU 감지됐으나 iOS는 실험적 — WASM 우선')
  }

  let tier: DeviceTier = 'LITE'
  if (!hasWasm) {
    tier = 'LITE'
  } else if (platform === 'ios') {
    // Keep iPhone on LITE chat model (135M) — larger models risk tab kill
    tier = deviceMemoryGb != null && deviceMemoryGb >= 4 ? 'STANDARD' : 'LITE'
  } else if (hasWebGpu && (deviceMemoryGb == null || deviceMemoryGb >= 4) && hardwareConcurrency >= 4) {
    tier = 'ADVANCED'
  } else if (hardwareConcurrency >= 4 || (deviceMemoryGb != null && deviceMemoryGb >= 4)) {
    tier = 'STANDARD'
  } else {
    tier = 'LITE'
  }

  return {
    tier,
    platform,
    hasWebGpu,
    hasWasm,
    deviceMemoryGb,
    hardwareConcurrency,
    estimatedStorageOk,
    notes,
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
