import { describe, expect, it } from 'vitest'
import { durationPartsToMs, formatDuration, parseDurationInput, splitDuration } from '@/utils/time'

describe('duration helpers', () => {
  it('formats mm:ss', () => {
    expect(formatDuration(12 * 60 * 1000)).toBe('12:00')
    expect(formatDuration(65_000)).toBe('01:05')
  })

  it('parses minute-only and mm:ss input', () => {
    expect(parseDurationInput('12')).toBe(12 * 60 * 1000)
    expect(parseDurationInput('12:30')).toBe((12 * 60 + 30) * 1000)
    expect(parseDurationInput('1:02:03')).toBe((1 * 3600 + 2 * 60 + 3) * 1000)
    expect(parseDurationInput('12분30초')).toBe((12 * 60 + 30) * 1000)
    expect(parseDurationInput('90초')).toBe(90_000)
    expect(parseDurationInput('')).toBeNull()
    expect(parseDurationInput('12:99')).toBeNull()
  })

  it('converts parts and splits duration', () => {
    expect(durationPartsToMs(10, 15)).toBe((10 * 60 + 15) * 1000)
    expect(durationPartsToMs(10, 75)).toBeNull()
    expect(splitDuration(125_000)).toEqual({ hours: 0, minutes: 2, seconds: 5 })
  })
})
