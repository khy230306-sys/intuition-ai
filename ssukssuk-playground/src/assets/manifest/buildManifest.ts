import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { buildClientManifest } from './productionGate'
import type { AssetManifestEntry } from './types'

/** Node/CI: client manifest + real file existence check. */
export function buildAssetManifest(): AssetManifestEntry[] {
  const root = join(process.cwd(), 'public')
  return buildClientManifest().map((entry) => {
    if (!entry.filePath) return entry
    const abs = join(root, entry.filePath.replace(/^\//, ''))
    const exists = existsSync(abs)
    if (!exists) {
      return {
        ...entry,
        productionApproved: false,
        qualityGateResult: 'FAIL',
        source: 'registry_spec',
        format: 'none',
        filePath: null,
      }
    }
    return entry
  })
}

export function approvedProductionCount(manifest = buildAssetManifest()): number {
  return manifest.filter((m) => m.productionApproved).length
}
