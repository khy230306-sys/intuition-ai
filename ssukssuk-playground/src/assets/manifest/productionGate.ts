import { ALL_ASSETS, baselineTriad } from '../registry'
import { FIRE_TRUCK_01_VEHICLE } from '../registry/fireTruck01'
import { VISUAL_BIBLE_VERSION, type AssetManifestEntry } from './types'

/** Browser-safe manifest (no node:fs). File presence verified in Node tests. */
export function buildClientManifest(): AssetManifestEntry[] {
  return ALL_ASSETS.map((asset) => {
    const hasPath = Boolean(asset.path)
    const productionApproved = asset.status === 'APPROVED' && hasPath
    return {
      assetId: asset.id,
      assetType: asset.kind,
      version: productionApproved ? '1.0.0' : '0.0.0-spec',
      source: hasPath ? 'imported_file' : 'registry_spec',
      width: asset.size.w,
      height: asset.size.h,
      format: hasPath ? 'png' : 'none',
      transparent: asset.transparentBackground,
      anchor: { x: 0.5, y: 0.5 },
      pivot: { x: 0.5, y: 0.5 },
      parts: asset.partStructure ?? [],
      coloringRegions:
        asset.baselineGroup === 'fire_truck_01' ? [...FIRE_TRUCK_01_VEHICLE.paintRegions] : [],
      animationStates: asset.states ?? [],
      visualBibleVersion: VISUAL_BIBLE_VERSION,
      productionApproved,
      qualityGateResult: productionApproved
        ? 'PASS'
        : asset.status === 'REJECTED_QUALITY_GATE'
          ? 'FAIL'
          : 'NOT_RUN',
      filePath: asset.path ?? null,
    }
  })
}

export function clientApprovedCount(): number {
  return buildClientManifest().filter((m) => m.productionApproved).length
}

export function isBaselineTriadApproved(): boolean {
  return baselineTriad().allReady && clientApprovedCount() > 0
}
