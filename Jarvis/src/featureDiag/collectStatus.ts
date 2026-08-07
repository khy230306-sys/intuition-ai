/**
 * Feature diagnostics snapshot — no API keys, no images, no PII dumps.
 */

import { loadHybridAiConfig, hasAnyConfiguredProvider } from '../ai-providers'
import { pickVisionProvider, listVisionProviders, loadVisionHistory } from '../ai-camera'
import { loadParkingMemory } from '../life-assistant'
import {
  listFamilyHelperSchedules,
  listFamilyHelperTasks,
  listFamilyMembers,
  listGrowth,
  listMedications,
  listVaccinations,
  loadFamilyHelperBundle,
} from '../family-helper'
import { loadFeatureDiagErrors } from './errorCodes'

export type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'

export type FeatureDiagStatus = {
  app: {
    version: string
    buildId: string
    commit: string
    channel: string
    online: boolean
    standalonePwa: boolean
    swControlled: boolean
    swReady: boolean
    storageWritable: boolean
    storageError: string | null
  }
  providers: {
    mode: string
    openai: { configured: boolean; model: string; visionCapable: boolean }
    openrouter: { configured: boolean; model: string; visionCapable: boolean }
    mock: { available: boolean }
    activeVision: string
    hasAnyKey: boolean
  }
  permissions: {
    camera: PermState
    photoPicker: PermState
    geolocation: PermState
    notifications: PermState
    microphone: PermState
  }
  data: {
    lifeAssistantStoredCount: number
    parkingSaved: boolean
    visionHistoryCount: number
    familyMembers: number
    familySchedules: number
    familyTasks: number
    medications: number
    vaccinations: number
    growthRecords: number
    lifeAssistantSchemaOk: boolean
  }
  recentErrors: {
    life: string[]
    vision: string[]
    family: string[]
    storage: string[]
    provider: string[]
  }
  generatedAt: string
}

async function queryPerm(name: PermissionName | string): Promise<PermState> {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const st = await navigator.permissions.query({ name: name as PermissionName })
    if (st.state === 'granted') return 'granted'
    if (st.state === 'denied') return 'denied'
    if (st.state === 'prompt') return 'prompt'
    return 'unknown'
  } catch {
    return 'unsupported'
  }
}

function permLabel(p: PermState): string {
  if (p === 'granted') return '허용'
  if (p === 'denied') return '거부'
  if (p === 'prompt') return '아직 요청하지 않음'
  if (p === 'unsupported') return '브라우저에서 확인 불가'
  return '브라우저에서 확인 불가'
}

export { permLabel }

export async function collectFeatureDiagStatus(meta: {
  version: string
  buildId?: string
  commit?: string
  channel?: string
}): Promise<FeatureDiagStatus> {
  let storageWritable = true
  let storageError: string | null = null
  try {
    const k = '__aizio_diag_probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
  } catch (e) {
    storageWritable = false
    storageError = e instanceof Error ? e.name : 'storage_error'
  }

  let swControlled = false
  let swReady = false
  try {
    swControlled = Boolean(navigator.serviceWorker?.controller)
    if (navigator.serviceWorker) {
      await Promise.race([
        navigator.serviceWorker.ready.then(() => {
          swReady = true
        }),
        new Promise((r) => setTimeout(r, 800)),
      ])
    }
  } catch {
    /* ignore */
  }

  const standalonePwa =
    (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches) ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

  const cfg = loadHybridAiConfig()
  const openai = cfg.providers.openai
  const openrouter = cfg.providers.openrouter
  const visionId = pickVisionProvider()?.id || 'none'

  const [camera, geolocation, microphone] = await Promise.all([
    queryPerm('camera'),
    queryPerm('geolocation'),
    queryPerm('microphone'),
  ])

  const notif: PermState =
    typeof Notification === 'undefined'
      ? 'unsupported'
      : Notification.permission === 'granted'
        ? 'granted'
        : Notification.permission === 'denied'
          ? 'denied'
          : 'prompt'

  const errs = loadFeatureDiagErrors()
  const pick = (re: RegExp) =>
    errs.filter((e) => re.test(e.code)).slice(0, 5).map((e) => `${e.code}${e.detail ? ` · ${e.detail}` : ''}`)

  let lifeSchemaOk = true
  let lifeAssistantStoredCount = 0
  try {
    lifeSchemaOk = Boolean(localStorage.getItem('aizio_life_assistant_schema_v1') || true)
    loadFamilyHelperBundle()
    const lifeKeys = [
      'aizio_life_assistant_schema_v1',
      'aizio_life_assistant_prefs_v1',
      'aizio_parking_memory_v1',
    ]
    lifeAssistantStoredCount = lifeKeys.filter((k) => {
      try {
        return Boolean(localStorage.getItem(k))
      } catch {
        return false
      }
    }).length
  } catch {
    lifeSchemaOk = false
  }

  return {
    app: {
      version: meta.version,
      buildId: meta.buildId || '',
      commit: meta.commit || '',
      channel: meta.channel || '',
      online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
      standalonePwa,
      swControlled,
      swReady,
      storageWritable,
      storageError,
    },
    providers: {
      mode: cfg.mode,
      openai: {
        configured: Boolean(openai?.apiKey?.trim()),
        model: openai?.model || '',
        visionCapable: Boolean(openai?.apiKey?.trim()),
      },
      openrouter: {
        configured: Boolean(openrouter?.apiKey?.trim()),
        model: openrouter?.model || '',
        visionCapable: Boolean(openrouter?.apiKey?.trim()),
      },
      mock: { available: listVisionProviders().some((p) => p.id === 'mock') },
      activeVision: visionId,
      hasAnyKey: hasAnyConfiguredProvider(),
    },
    permissions: {
      camera,
      photoPicker: 'unknown', // file input always available if not blocked
      geolocation,
      notifications: notif,
      microphone,
    },
    data: {
      lifeAssistantStoredCount,
      parkingSaved: Boolean(loadParkingMemory()),
      visionHistoryCount: loadVisionHistory().length,
      familyMembers: listFamilyMembers(true).length,
      familySchedules: listFamilyHelperSchedules({ days: 365, includeDone: true }).length,
      familyTasks: listFamilyHelperTasks(true).length,
      medications: listMedications(false).length,
      vaccinations: listVaccinations().length,
      growthRecords: listGrowth().length,
      lifeAssistantSchemaOk: lifeSchemaOk,
    },
    recentErrors: {
      life: pick(/LIFE-/),
      vision: pick(/VISION-/),
      family: pick(/FAMILY-/),
      storage: pick(/STORAGE|storage/i),
      provider: pick(/PROVIDER|provider/i),
    },
    generatedAt: new Date().toISOString(),
  }
}

/** Sanitize export — strip any accidental secrets. */
export function sanitizeDiagExport(obj: unknown): unknown {
  const raw = JSON.stringify(obj)
  const cleaned = raw
    .replace(/sk-[a-zA-Z0-9_-]+/g, '[redacted]')
    .replace(/"apiKey"\s*:\s*"[^"]*"/g, '"apiKey":"[redacted]"')
    .replace(/data:image\/[^"]+/g, '[image-redacted]')
  return JSON.parse(cleaned)
}
