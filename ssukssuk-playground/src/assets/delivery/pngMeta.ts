import { readFileSync } from 'node:fs'

export type PngMeta = {
  width: number
  height: number
  colorType: number
  bitDepth: number
  /** colorType 4 or 6 includes alpha channel */
  hasAlphaChannel: boolean
  isPng: boolean
}

/** Minimal PNG IHDR reader — no external deps. */
export function readPngMeta(filePath: string): PngMeta {
  const buf = readFileSync(filePath)
  const sig = buf.subarray(0, 8)
  const isPng =
    sig[0] === 0x89 &&
    sig[1] === 0x50 &&
    sig[2] === 0x4e &&
    sig[3] === 0x47 &&
    sig[4] === 0x0d &&
    sig[5] === 0x0a &&
    sig[6] === 0x1a &&
    sig[7] === 0x0a

  if (!isPng || buf.length < 33) {
    return {
      width: 0,
      height: 0,
      colorType: -1,
      bitDepth: 0,
      hasAlphaChannel: false,
      isPng: false,
    }
  }

  // IHDR chunk starts at byte 8; length(4)+type(4)+data
  const type = buf.toString('ascii', 12, 16)
  if (type !== 'IHDR') {
    return {
      width: 0,
      height: 0,
      colorType: -1,
      bitDepth: 0,
      hasAlphaChannel: false,
      isPng: false,
    }
  }

  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const bitDepth = buf[24]
  const colorType = buf[25]
  const hasAlphaChannel = colorType === 4 || colorType === 6

  return { width, height, colorType, bitDepth, hasAlphaChannel, isPng: true }
}

/** Heuristic: scan uncompressed-ish bytes for common watermark/brand strings. */
export function scanForSuspiciousText(filePath: string): string[] {
  const buf = readFileSync(filePath)
  const ascii = buf.toString('latin1')
  const hits: string[] = []
  const needles = [
    'getty',
    'shutterstock',
    'adobe stock',
    'istock',
    'unsplash',
    'midjourney',
    'visual bible',
    'style master',
    '©',
    'watermark',
  ]
  const lower = ascii.toLowerCase()
  for (const n of needles) {
    if (lower.includes(n)) hits.push(n)
  }
  return hits
}
