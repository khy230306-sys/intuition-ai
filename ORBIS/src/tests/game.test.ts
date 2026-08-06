import { describe, expect, it } from 'vitest'
import { evaluateSync } from '../game/score'
import { angleDelta, gradeFromError, normalizeAngle } from '../game/types'

describe('ORBIS Orbit Sync scoring', () => {
  it('normalizes angles', () => {
    expect(normalizeAngle(-30)).toBe(330)
    expect(normalizeAngle(400)).toBe(40)
  })

  it('computes shortest angle delta', () => {
    expect(angleDelta(10, 350)).toBe(20)
    expect(angleDelta(0, 120)).toBe(120)
  })

  it('grades timing windows', () => {
    expect(gradeFromError(8)).toBe('perfect')
    expect(gradeFromError(20)).toBe('great')
    expect(gradeFromError(40)).toBe('good')
    expect(gradeFromError(80)).toBe('miss')
  })

  it('evaluates sync against orb targets', () => {
    const perfectBlue = evaluateSync('blue', 0)
    expect(perfectBlue.grade).toBe('perfect')
    expect(perfectBlue.energy).toBe(100)

    const goldNear = evaluateSync('gold', 130)
    expect(goldNear.grade).toBe('perfect')

    const violetMiss = evaluateSync('violet', 40)
    expect(violetMiss.grade).toBe('miss')
  })
})
