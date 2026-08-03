import type { Outcome } from './types'

type CellKind = 'B' | 'P' | 'T' | 'empty'

interface DetectedCell {
  col: number
  row: number
  kind: Exclude<CellKind, 'empty'>
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 불러오지 못했습니다'))
    }
    img.src = url
  })
}

function classifyPixel(r: number, g: number, b: number): CellKind {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const sat = max === 0 ? 0 : (max - min) / max
  const bright = (r + g + b) / 3

  // Skip bright board / dark felt
  if (bright > 210 || bright < 35 || sat < 0.22) return 'empty'

  // Red banker
  if (r > 140 && r > g + 30 && r > b + 30) return 'B'
  // Blue player
  if (b > 140 && b > r + 25 && b >= g - 10) return 'P'
  // Green tie slash / bead
  if (g > 130 && g > r + 20 && g > b + 10) return 'T'

  return 'empty'
}

/**
 * Detect Big Road beads from a lobby photo and return chronological B/P/T sequence.
 * Best-effort: always review in the editor before playing.
 */
export async function extractPatternFromImage(file: Blob): Promise<Outcome[]> {
  const img = await loadImage(file)
  const maxW = 960
  const scale = Math.min(1, maxW / img.width)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('캔버스를 사용할 수 없습니다')
  ctx.drawImage(img, 0, 0, w, h)

  // Road strips usually sit in the lower portion of table thumbnails.
  const y0 = Math.floor(h * 0.45)
  const data = ctx.getImageData(0, y0, w, h - y0)
  const { width: rw, height: rh, data: px } = data

  const cols = 28
  const rows = 7
  const cellW = rw / cols
  const cellH = rh / rows

  const grid: CellKind[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => 'empty' as CellKind),
  )

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const votes = { B: 0, P: 0, T: 0, empty: 0 }
      const xStart = Math.floor(c * cellW + cellW * 0.25)
      const xEnd = Math.floor(c * cellW + cellW * 0.75)
      const yStart = Math.floor(r * cellH + cellH * 0.25)
      const yEnd = Math.floor(r * cellH + cellH * 0.75)
      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const i = (y * rw + x) * 4
          const kind = classifyPixel(px[i]!, px[i + 1]!, px[i + 2]!)
          votes[kind] += 1
        }
      }
      const ranked = (Object.entries(votes) as [CellKind, number][]).sort((a, b) => b[1] - a[1])
      const [best, score] = ranked[0]!
      const area = Math.max(1, (xEnd - xStart) * (yEnd - yStart))
      grid[c]![r] = score / area > 0.12 && best !== 'empty' ? best : 'empty'
    }
  }

  // Find used column range
  const usedCols: number[] = []
  for (let c = 0; c < cols; c++) {
    if (grid[c]!.some((k) => k === 'B' || k === 'P')) usedCols.push(c)
  }
  if (usedCols.length === 0) {
    // Fallback: scan full frame
    return extractFromFullFrame(ctx, w, h)
  }

  const cells: DetectedCell[] = []
  for (const c of usedCols) {
    for (let r = 0; r < rows; r++) {
      const kind = grid[c]![r]!
      if (kind === 'B' || kind === 'P' || kind === 'T') {
        cells.push({ col: c, row: r, kind })
      }
    }
  }

  // Chronological Big Road: left→right columns, top→bottom within column
  cells.sort((a, b) => a.col - b.col || a.row - b.row)

  const pattern: Outcome[] = []
  let lastCol = -1
  let lastBp: 'B' | 'P' | null = null

  for (const cell of cells) {
    if (cell.kind === 'T') {
      // Tie mark on a bead — append T after the bead in same cell if we just placed it
      if (pattern.length > 0) pattern.push('T')
      continue
    }
    // Skip empty-looking duplicate noise: same color immediately below same column is fine
    if (cell.col === lastCol && cell.kind === lastBp) {
      pattern.push(cell.kind)
    } else if (cell.col !== lastCol || cell.kind !== lastBp) {
      pattern.push(cell.kind)
    }
    lastCol = cell.col
    lastBp = cell.kind
  }

  return collapseNoise(pattern)
}

function extractFromFullFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): Outcome[] {
  const data = ctx.getImageData(0, 0, w, h)
  const step = 4
  const hits: { x: number; y: number; kind: 'B' | 'P' }[] = []
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      const kind = classifyPixel(data.data[i]!, data.data[i + 1]!, data.data[i + 2]!)
      if (kind === 'B' || kind === 'P') hits.push({ x, y, kind })
    }
  }
  if (hits.length < 3) return []

  // Cluster by approximate columns
  hits.sort((a, b) => a.x - b.x || a.y - b.y)
  const colTol = Math.max(8, w * 0.02)
  const columns: { x: number; items: typeof hits }[] = []
  for (const hit of hits) {
    const col = columns.find((c) => Math.abs(c.x - hit.x) < colTol)
    if (col) {
      col.items.push(hit)
      col.x = (col.x * (col.items.length - 1) + hit.x) / col.items.length
    } else {
      columns.push({ x: hit.x, items: [hit] })
    }
  }
  columns.sort((a, b) => a.x - b.x)

  const pattern: Outcome[] = []
  for (const col of columns) {
    col.items.sort((a, b) => a.y - b.y)
    // Dedup vertically close same color
    const cleaned: typeof hits = []
    for (const item of col.items) {
      const prev = cleaned[cleaned.length - 1]
      if (prev && Math.abs(prev.y - item.y) < h * 0.02 && prev.kind === item.kind) continue
      cleaned.push(item)
    }
    for (const item of cleaned) pattern.push(item.kind)
  }
  return collapseNoise(pattern)
}

function collapseNoise(pattern: Outcome[]): Outcome[] {
  // Remove impossible single-bead flicker: keep as-is but cap length
  if (pattern.length > 120) return pattern.slice(0, 120)
  return pattern
}
