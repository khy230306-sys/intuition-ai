import { describe, expect, it } from 'vitest'
import {
  STAGE_FLOW,
  nextStage,
  requiresApprovedArt,
  unlockThrough,
} from './stageFlow'

describe('AIZIO Studio stage flow', () => {
  it('includes wash and repair between paint and drive', () => {
    expect(STAGE_FLOW).toEqual([
      'select',
      'assemble',
      'paint',
      'wash',
      'repair',
      'drive',
      'mission',
      'reward',
      'growth',
    ])
    expect(nextStage('paint')).toBe('wash')
    expect(nextStage('wash')).toBe('repair')
    expect(nextStage('repair')).toBe('drive')
  })

  it('unlocks contiguous stages through target', () => {
    expect(unlockThrough('wash')).toEqual([
      'select',
      'assemble',
      'paint',
      'wash',
    ])
  })

  it('requires approved art except select/growth', () => {
    expect(requiresApprovedArt('select')).toBe(false)
    expect(requiresApprovedArt('growth')).toBe(false)
    expect(requiresApprovedArt('wash')).toBe(true)
    expect(requiresApprovedArt('repair')).toBe(true)
    expect(requiresApprovedArt('assemble')).toBe(true)
  })
})
