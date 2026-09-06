/** Phase 7 — Asset Manifest metadata (registry is sole access path). */

export type ManifestQualityResult = 'PENDING' | 'PASS' | 'FAIL' | 'NOT_RUN'

export type AssetManifestEntry = {
  assetId: string
  assetType: string
  version: string
  source: 'registry_spec' | 'imported_file' | 'generated_file' | 'unknown'
  width: number
  height: number
  format: 'png' | 'webp' | 'none'
  transparent: boolean
  anchor: { x: number; y: number }
  pivot: { x: number; y: number }
  parts: string[]
  coloringRegions: string[]
  animationStates: string[]
  visualBibleVersion: string
  productionApproved: boolean
  qualityGateResult: ManifestQualityResult
  /** Present only when a real file exists under public/ */
  filePath: string | null
}

export const VISUAL_BIBLE_VERSION = 'VSM-2026-08-12'
