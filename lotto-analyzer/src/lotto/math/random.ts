/** Seedable PRNG (mulberry32) for reproducible random engines & tests */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function sampleUnique(
  pool: number[],
  k: number,
  rand: () => number,
): number[] {
  const arr = [...pool]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr.slice(0, k).sort((a, b) => a - b)
}

export function weightedPick(
  items: { n: number; w: number }[],
  k: number,
  rand: () => number,
): number[] {
  const pool = items.filter((x) => x.w > 0).map((x) => ({ ...x }))
  const picked: number[] = []
  while (picked.length < k && pool.length) {
    const total = pool.reduce((s, x) => s + x.w, 0)
    let r = rand() * total
    let idx = 0
    for (; idx < pool.length; idx++) {
      r -= pool[idx]!.w
      if (r <= 0) break
    }
    idx = Math.min(idx, pool.length - 1)
    picked.push(pool[idx]!.n)
    pool.splice(idx, 1)
  }
  return picked.sort((a, b) => a - b)
}
