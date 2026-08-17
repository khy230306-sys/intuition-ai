/**
 * Lightweight async scheduler — yields to the UI between engine jobs.
 * True Web Worker bundling is optional; this prevents main-thread freeze
 * for sequential engine analysis without fake progress.
 */

export async function mapWithYield<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R> | R,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const out: R[] = []
  const total = items.length
  for (let i = 0; i < total; i++) {
    out.push(await fn(items[i]!, i))
    onProgress?.(i + 1, total)
    await yieldToUi()
  }
  return out
}

export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

export async function runChunked<T>(
  total: number,
  chunkSize: number,
  worker: (start: number, end: number) => T | Promise<T>,
  onProgress?: (done: number, total: number) => void,
): Promise<T[]> {
  const results: T[] = []
  for (let start = 0; start < total; start += chunkSize) {
    const end = Math.min(total, start + chunkSize)
    results.push(await worker(start, end))
    onProgress?.(end, total)
    await yieldToUi()
  }
  return results
}
