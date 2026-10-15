/** Fisher–Yates shuffle using crypto.getRandomValues when available. */
export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1)
    const tmp = items[i]!
    items[i] = items[j]!
    items[j] = tmp
  }
  return items
}

export function shuffleCopy<T>(items: readonly T[]): T[] {
  return shuffleInPlace([...items])
}

export function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const limit = 0x100000000
    const threshold = limit - (limit % maxExclusive)
    const buffer = new Uint32Array(1)
    do {
      crypto.getRandomValues(buffer)
    } while (buffer[0]! >= threshold)
    return buffer[0]! % maxExclusive
  }

  // Fallback for non-browser test hosts without Web Crypto
  return Math.floor(Math.random() * maxExclusive)
}
