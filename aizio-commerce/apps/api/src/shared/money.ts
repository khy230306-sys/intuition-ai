/** Deterministic KRW money helpers. Never use LLM output as money. */

export function roundKrw(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

export function toRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10_000) / 10_000;
}

export function usdToKrw(usd: number, usdKrwRate: number): number {
  return roundKrw(usd * usdKrwRate);
}

export function safeDiv(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function median(values: number[]): number | null {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2 === 0) {
    return ((nums[mid - 1] ?? 0) + (nums[mid] ?? 0)) / 2;
  }
  return nums[mid] ?? null;
}
