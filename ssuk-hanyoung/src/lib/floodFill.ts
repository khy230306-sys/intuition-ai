/** Scanline flood fill on ImageData. Returns true if any pixels changed. */
export function floodFill(
  imageData: ImageData,
  sx: number,
  sy: number,
  fillR: number,
  fillG: number,
  fillB: number,
  fillA = 255,
  tolerance = 32,
): boolean {
  const { width, height, data } = imageData
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return false

  const i0 = (y0 * width + x0) * 4
  const tr = data[i0]
  const tg = data[i0 + 1]
  const tb = data[i0 + 2]
  const ta = data[i0 + 3]

  if (tr === fillR && tg === fillG && tb === fillB && ta === fillA) return false

  // Don't fill opaque dark lines (outline)
  if (ta > 200 && tr < 60 && tg < 60 && tb < 60) return false

  const match = (i: number) => {
    const dr = Math.abs(data[i] - tr)
    const dg = Math.abs(data[i + 1] - tg)
    const db = Math.abs(data[i + 2] - tb)
    const da = Math.abs(data[i + 3] - ta)
    return dr + dg + db + da <= tolerance * 4
  }

  const stack: number[] = [x0, y0]
  const visited = new Uint8Array(width * height)
  let changed = false

  while (stack.length) {
    const y = stack.pop()!
    const x = stack.pop()!
    let lx = x
    while (lx >= 0) {
      const idx = y * width + lx
      if (visited[idx] || !match(idx * 4)) break
      lx--
    }
    lx++
    let spanUp = false
    let spanDown = false
    while (lx < width) {
      const idx = y * width + lx
      const di = idx * 4
      if (visited[idx] || !match(di)) break
      visited[idx] = 1
      data[di] = fillR
      data[di + 1] = fillG
      data[di + 2] = fillB
      data[di + 3] = fillA
      changed = true
      if (y > 0) {
        const u = (y - 1) * width + lx
        if (!visited[u] && match(u * 4)) {
          if (!spanUp) {
            stack.push(lx, y - 1)
            spanUp = true
          }
        } else spanUp = false
      }
      if (y < height - 1) {
        const d = (y + 1) * width + lx
        if (!visited[d] && match(d * 4)) {
          if (!spanDown) {
            stack.push(lx, y + 1)
            spanDown = true
          }
        } else spanDown = false
      }
      lx++
    }
  }
  return changed
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
