/** Stable diagnostic error codes — never include secrets or image payloads. */

import { recordDiagError } from '../diagnostics/deviceDiagnostics'

export const FeatureDiagCodes = {
  LIFE_INTENT: 'LIFE-INTENT-001',
  LIFE_EXEC: 'LIFE-EXEC-001',
  VISION_UPLOAD: 'VISION-UPLOAD-001',
  VISION_PROVIDER: 'VISION-PROVIDER-001',
  VISION_SCHEMA: 'VISION-SCHEMA-001',
  FAMILY_STORAGE: 'FAMILY-STORAGE-001',
  FAMILY_SCHEDULE: 'FAMILY-SCHEDULE-001',
  PWA_CACHE: 'PWA-CACHE-001',
} as const

export type FeatureDiagCode = (typeof FeatureDiagCodes)[keyof typeof FeatureDiagCodes]

const BUCKET = 'aizio_feature_diag_errors_v1'
const MAX = 30

function redact(detail: string): string {
  return String(detail || '')
    .replace(/sk-[a-zA-Z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '[image-redacted]')
    .slice(0, 160)
}

export function recordFeatureDiagError(code: FeatureDiagCode | string, detail?: string): void {
  try {
    const raw = localStorage.getItem(BUCKET)
    const list: Array<{ at: string; code: string; detail?: string }> = raw ? JSON.parse(raw) : []
    list.unshift({
      at: new Date().toISOString(),
      code: String(code),
      detail: detail ? redact(detail) : undefined,
    })
    localStorage.setItem(BUCKET, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* ignore */
  }
  recordDiagError(`${code}${detail ? `:${redact(detail).slice(0, 40)}` : ''}`)
}

export function loadFeatureDiagErrors(): Array<{ at: string; code: string; detail?: string }> {
  try {
    const raw = localStorage.getItem(BUCKET)
    return raw ? (JSON.parse(raw) as Array<{ at: string; code: string; detail?: string }>) : []
  } catch {
    return []
  }
}

export function clearFeatureDiagErrors(): void {
  localStorage.removeItem(BUCKET)
}
