/**
 * Phase 19 — Automated forbidden-asset gate.
 * Fails when runtime source ships emoji / hue-rotate / bible image imports / etc.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildAssetManifest } from '../assets/manifest/buildManifest'
import { getAssetProviderStatus } from '../assets/factory/provider'
import { evaluatePrototypeGates } from '../prototype/playLoop'

const ROOT = join(process.cwd(), 'src')

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx|css|html)$/.test(name)) acc.push(p)
  }
  return acc
}

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
const PICTOGRAM_CHARS = ['\u2605', '\u2B50', '\uD83D\uDE92', '\uD83D\uDE97', '\uD83D\uDE9C', '\uD83D\uDC36']

describe('FORBIDDEN_ASSET_GATE', () => {
  const files = walk(ROOT).filter((f) => !f.includes(`${join('src', 'tests')}`))

  it('rejects emoji / unicode pictograms in runtime source', () => {
    const hits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      const withoutComments = text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      if (EMOJI_RE.test(withoutComments)) hits.push(file)
      for (const ch of PICTOGRAM_CHARS) {
        if (withoutComments.includes(ch)) hits.push(file)
      }
    }
    expect(hits).toEqual([])
  })

  it('rejects hue-rotate / whole-vehicle CSS filter paint hacks', () => {
    const hits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (/hue-rotate\s*\(/i.test(text)) hits.push(file)
      if (/filter:\s*[^;]*hue/i.test(text)) hits.push(file)
    }
    expect(hits).toEqual([])
  })

  it('rejects base64 embedded images and remote random asset URLs in src', () => {
    const hits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (/data:image\//i.test(text)) hits.push(`${file}:base64`)
      if (/https?:\/\/[^"')\s]+\.(png|jpg|jpeg|webp|gif)/i.test(text)) {
        hits.push(`${file}:remote-image`)
      }
    }
    expect(hits).toEqual([])
  })

  it('rejects Visual Bible image / screenshot asset imports', () => {
    const hits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (/import\s+[^;]+visual[-_]?bible[^;]*\.(png|jpg|jpeg|webp|svg)/i.test(text)) {
        hits.push(file)
      }
      if (/from\s+['"][^'"]*visual[-_]?bible[^'"]*\.(png|jpg|jpeg|webp|svg)['"]/i.test(text)) {
        hits.push(file)
      }
      if (/src\s*=\s*['"][^'"]*screenshot[^'"]*\.(png|jpg|webp)['"]/i.test(text)) {
        hits.push(file)
      }
    }
    expect(hits).toEqual([])
  })

  it('does not mark missing files as productionApproved', () => {
    const manifest = buildAssetManifest()
    const falselyApproved = manifest.filter((m) => m.productionApproved)
    expect(falselyApproved).toEqual([])
  })

  it('reports provider NOT_CONFIGURED when no API key', () => {
    expect(getAssetProviderStatus().status).toBe('NOT_CONFIGURED')
  })

  it('keeps Prototype 01 BLOCKED without baseline production art', () => {
    const gates = evaluatePrototypeGates()
    expect(gates.VISUAL_PRODUCTION_GATE).toBe('BLOCKED')
    expect(gates.PROTOTYPE_01).toBe('BLOCKED')
    expect(gates.stages.every((s) => s.gate === 'BLOCKED')).toBe(true)
  })
})
