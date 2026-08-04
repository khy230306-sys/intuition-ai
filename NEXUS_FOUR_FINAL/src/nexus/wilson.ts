export function wilsonLowerBound(successes: number, n: number, z = 1.96) {
  if (n <= 0) return 0
  const p = successes / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = (p + z2 / (2 * n)) / denom
  const halfWidth = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom
  return Math.max(0, center - halfWidth)
}

