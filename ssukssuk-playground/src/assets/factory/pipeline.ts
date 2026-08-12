/**
 * Asset Factory Pipeline
 * ASSET_REQUEST → SPECIFICATION → GENERATION/IMPORT → VALIDATION →
 * PART ALIGNMENT → QUALITY GATE → REGISTRY → GAME READY
 */

import { ALL_ASSETS, type AssetSpec } from '../registry'
import { getAssetProviderStatus, type AssetProviderStatus } from './provider'

export type FactoryStage =
  | 'ASSET_REQUEST'
  | 'SPECIFICATION'
  | 'GENERATION_IMPORT'
  | 'VALIDATION'
  | 'PART_ALIGNMENT'
  | 'QUALITY_GATE'
  | 'REGISTRY'
  | 'GAME_READY'

export type FactoryJob = {
  assetId: string
  stage: FactoryStage
  blockedReason?: string
  updatedAt: number
}

export type FactorySnapshot = {
  providerStatus: AssetProviderStatus
  baselineReady: boolean
  jobs: FactoryJob[]
  gameReadyAssetIds: string[]
}

const STAGE_ORDER: FactoryStage[] = [
  'ASSET_REQUEST',
  'SPECIFICATION',
  'GENERATION_IMPORT',
  'VALIDATION',
  'PART_ALIGNMENT',
  'QUALITY_GATE',
  'REGISTRY',
  'GAME_READY',
]

function stageForAsset(asset: AssetSpec, providerStatus: AssetProviderStatus): FactoryStage {
  if (asset.status === 'APPROVED' && asset.path) return 'GAME_READY'
  if (asset.status === 'REJECTED_QUALITY_GATE') return 'QUALITY_GATE'
  // Specs exist in registry → stuck before/at generation when provider missing
  if (providerStatus === 'NOT_CONFIGURED') return 'GENERATION_IMPORT'
  if (asset.status === 'ASSET_REQUIRED') return 'GENERATION_IMPORT'
  return 'SPECIFICATION'
}

export function buildFactorySnapshot(): FactorySnapshot {
  const provider = getAssetProviderStatus()
  const jobs: FactoryJob[] = ALL_ASSETS.filter((a) => a.baselineGroup).map((asset) => ({
    assetId: asset.id,
    stage: stageForAsset(asset, provider.status),
    blockedReason:
      provider.status === 'NOT_CONFIGURED'
        ? 'ASSET_PROVIDER_STATUS=NOT_CONFIGURED — cannot generate/import production bitmaps'
        : asset.status === 'ASSET_REQUIRED'
          ? 'Awaiting production file + Quality Gate'
          : undefined,
    updatedAt: Date.now(),
  }))

  const gameReadyAssetIds = jobs.filter((j) => j.stage === 'GAME_READY').map((j) => j.assetId)
  const baselineIds = ALL_ASSETS.filter((a) => a.baselineGroup).map((a) => a.id)
  const baselineReady =
    baselineIds.length > 0 && baselineIds.every((id) => gameReadyAssetIds.includes(id))

  return {
    providerStatus: provider.status,
    baselineReady,
    jobs,
    gameReadyAssetIds,
  }
}

export function nextStage(stage: FactoryStage): FactoryStage | null {
  const i = STAGE_ORDER.indexOf(stage)
  if (i < 0 || i >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[i + 1]
}

/** Advance is only allowed when real artifacts exist — never fake-generate. */
export function canAdvanceToGeneration(providerStatus: AssetProviderStatus): boolean {
  return providerStatus === 'CONFIGURED'
}
