// 간단하지만 재현 가능한 PRNG (seeded)
// 암호학적 난수 자체가 필요한 경우에는 seed를 crypto에서 만들고,
// 평가 구간에서는 deterministic PRNG로 재현성을 유지합니다.
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function deriveSeedFromString(s: string) {
  // FNV-1a 32bit
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

