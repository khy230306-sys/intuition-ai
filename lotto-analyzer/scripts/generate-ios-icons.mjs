#!/usr/bin/env node
/**
 * Generate App Store / iOS icon assets from brand geometry.
 * Output is opaque (no transparency) and square — corners are NOT rounded.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'resources', 'ios')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1)
    raw[row] = 0
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const bg = [11, 46, 42]
  for (let i = 0; i < size * size; i++) {
    const o = i * 4
    rgba[o] = bg[0]
    rgba[o + 1] = bg[1]
    rgba[o + 2] = bg[2]
    rgba[o + 3] = 255
  }

  const balls = [
    { cx: 0.34, cy: 0.38, r: 0.19, c: [242, 193, 78] },
    { cx: 0.62, cy: 0.46, r: 0.18, c: [58, 166, 255] },
    { cx: 0.52, cy: 0.68, r: 0.13, c: [255, 107, 90] },
  ]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size
      const ny = y / size
      for (const b of balls) {
        const dx = nx - b.cx
        const dy = ny - b.cy
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d <= b.r) {
          // soft highlight
          const hx = (nx - (b.cx - b.r * 0.35)) / (b.r * 1.2)
          const hy = (ny - (b.cy - b.r * 0.4)) / (b.r * 1.2)
          const hi = Math.max(0, 1 - Math.sqrt(hx * hx + hy * hy))
          const o = (y * size + x) * 4
          rgba[o] = Math.min(255, b.c[0] + hi * 55)
          rgba[o + 1] = Math.min(255, b.c[1] + hi * 45)
          rgba[o + 2] = Math.min(255, b.c[2] + hi * 35)
          rgba[o + 3] = 255
        }
      }
    }
  }
  return encodePNG(size, size, rgba)
}

mkdirSync(OUT, { recursive: true })
mkdirSync(join(ROOT, 'resources'), { recursive: true })

const sizes = {
  'AppIcon-1024.png': 1024,
  'AppIcon-180.png': 180,
  'AppIcon-120.png': 120,
  'AppIcon-87.png': 87,
  'AppIcon-80.png': 80,
  'AppIcon-60.png': 60,
  'AppIcon-58.png': 58,
  'AppIcon-40.png': 40,
}

for (const [name, size] of Object.entries(sizes)) {
  const png = drawIcon(size)
  writeFileSync(join(OUT, name), png)
  console.log('wrote', name, png.length)
}

// Canonical App Store marketing icon
writeFileSync(join(ROOT, 'resources', 'icon-1024.png'), drawIcon(1024))
// Refresh apple-touch for web/PWA consistency (opaque)
writeFileSync(join(ROOT, 'public', 'apple-touch-icon.png'), drawIcon(180))
console.log('done')
