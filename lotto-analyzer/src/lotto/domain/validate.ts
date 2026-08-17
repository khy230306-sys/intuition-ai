import { MAX_N, PICK, type LottoDraw } from './types'

export class DrawValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DrawValidationError'
  }
}

export function validateDraw(d: LottoDraw): LottoDraw {
  if (!Number.isInteger(d.drawNumber) || d.drawNumber < 1) {
    throw new DrawValidationError(`invalid drawNumber: ${d.drawNumber}`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.drawDate)) {
    throw new DrawValidationError(`invalid drawDate: ${d.drawDate}`)
  }
  if (!Array.isArray(d.numbers) || d.numbers.length !== PICK) {
    throw new DrawValidationError(`numbers must be length ${PICK}`)
  }
  const sorted = [...d.numbers].sort((a, b) => a - b)
  const set = new Set(sorted)
  if (set.size !== PICK) throw new DrawValidationError('duplicate numbers')
  for (const n of sorted) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_N) {
      throw new DrawValidationError(`out of range number: ${n}`)
    }
  }
  if (
    !Number.isInteger(d.bonusNumber) ||
    d.bonusNumber < 1 ||
    d.bonusNumber > MAX_N
  ) {
    throw new DrawValidationError(`invalid bonus: ${d.bonusNumber}`)
  }
  if (set.has(d.bonusNumber)) {
    throw new DrawValidationError('bonus conflicts with main numbers')
  }
  return {
    ...d,
    numbers: sorted,
    source: d.source || 'unknown',
    fetchedAt: d.fetchedAt || new Date().toISOString(),
  }
}

export function validateCombination(nums: number[]): number[] {
  if (nums.length !== PICK) throw new DrawValidationError('need exactly 6 numbers')
  const sorted = [...nums].sort((a, b) => a - b)
  if (new Set(sorted).size !== PICK) throw new DrawValidationError('duplicates')
  for (const n of sorted) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_N) {
      throw new DrawValidationError(`invalid number ${n}`)
    }
  }
  return sorted
}
