import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BUNDLE_CATALOG } from '../betting/bundles'
import { choiceButtonText, labelChoice, labelMode } from '../betting/labels'
import {
  allocateStakes,
  collectUniquePicks,
  resolveSelections,
  type SelectionInput,
} from '../betting/selection'
import App from '../App'

function baseInput(partial: Partial<SelectionInput> = {}): SelectionInput {
  return {
    duelPick: null,
    totalPick: null,
    extraPick: null,
    bundleIds: [],
    stake: 100,
    amountMode: 'SPLIT_TOTAL',
    ...partial,
  }
}

describe('betting labels (Korean)', () => {
  it('shows Korean labels for core markets and choices', () => {
    expect(labelMode('CARD_DUEL')).toBe('카드 비교')
    expect(labelMode('TOTAL')).toBe('합계')
    expect(labelChoice('DOWN')).toBe('하')
    expect(labelChoice('SAME')).toBe('무')
    expect(labelChoice('UP')).toBe('상')
    expect(labelChoice('LOW')).toBe('낮음')
    expect(labelChoice('CENTER')).toBe('중앙')
    expect(labelChoice('HIGH')).toBe('높음')
    expect(labelChoice('ODD')).toBe('홀')
    expect(labelChoice('EVEN')).toBe('짝')
    expect(labelChoice('PAIR')).toBe('같은 숫자')
    expect(labelMode('EXACT_TOTAL')).toBe('합계 맞히기')
    expect(choiceButtonText('UP')).toContain('상')
    expect(choiceButtonText('CENTER')).toContain('중앙(6)')
  })
})

describe('bundle selection resolution', () => {
  it('supports duel/total/cross bundle catalogs', () => {
    expect(BUNDLE_CATALOG.some((b) => b.id === 'duel-down-same')).toBe(true)
    expect(BUNDLE_CATALOG.some((b) => b.id === 'duel-same-up')).toBe(true)
    expect(BUNDLE_CATALOG.some((b) => b.id === 'total-low-center')).toBe(true)
    expect(BUNDLE_CATALOG.some((b) => b.id === 'cross-up-high')).toBe(true)
  })

  it('resolves 하+무 bundle', () => {
    const resolved = resolveSelections(
      baseInput({ bundleIds: ['duel-down-same'], amountMode: 'SPLIT_TOTAL', stake: 100 }),
    )
    expect(resolved.picks.map((p) => `${p.mode}:${p.choice}`).sort()).toEqual([
      'CARD_DUEL:DOWN',
      'CARD_DUEL:SAME',
    ])
    expect(resolved.picks.every((p) => p.stake === 50)).toBe(true)
    expect(resolved.totalStake).toBe(100)
  })

  it('resolves 무+상 bundle', () => {
    const resolved = resolveSelections(baseInput({ bundleIds: ['duel-same-up'] }))
    expect(resolved.picks.map((p) => p.choice).sort()).toEqual(['SAME', 'UP'])
  })

  it('resolves 낮음+중앙 bundle', () => {
    const resolved = resolveSelections(baseInput({ bundleIds: ['total-low-center'] }))
    expect(resolved.picks.map((p) => `${p.mode}:${p.choice}`).sort()).toEqual([
      'TOTAL:CENTER',
      'TOTAL:LOW',
    ])
  })

  it('resolves 상+높음 cross bundle', () => {
    const resolved = resolveSelections(baseInput({ bundleIds: ['cross-up-high'] }))
    expect(resolved.picks.map((p) => `${p.mode}:${p.choice}`).sort()).toEqual([
      'CARD_DUEL:UP',
      'TOTAL:HIGH',
    ])
  })

  it('removes duplicate overlapping results', () => {
    const unique = collectUniquePicks({
      duelPick: 'UP',
      totalPick: null,
      extraPick: null,
      bundleIds: ['cross-up-high'],
    })
    expect(unique).toHaveLength(2)
    expect(unique.map((p) => `${p.mode}:${p.choice}`).sort()).toEqual([
      'CARD_DUEL:UP',
      'TOTAL:HIGH',
    ])
  })

  it('splits total stake evenly (방식 A)', () => {
    const picks = allocateStakes(
      [
        { mode: 'CARD_DUEL', choice: 'UP' },
        { mode: 'CARD_DUEL', choice: 'SAME' },
      ],
      100,
      'SPLIT_TOTAL',
    )
    expect(picks.map((p) => p.stake)).toEqual([50, 50])
  })

  it('applies each-item full stake (방식 B)', () => {
    const resolved = resolveSelections(
      baseInput({
        duelPick: 'UP',
        bundleIds: ['duel-same-up'],
        amountMode: 'EACH_FULL',
        stake: 100,
      }),
    )
    // unique: UP, SAME
    expect(resolved.picks).toHaveLength(2)
    expect(resolved.picks.every((p) => p.stake === 100)).toBe(true)
    expect(resolved.totalStake).toBe(200)
  })
})

describe('betting UI', () => {
  it('renders Korean betting labels and actions', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'PIP' })).toBeInTheDocument()
    expect(screen.getByText(/데모 포인트는 금전적 가치가 없으며/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /카드 비교/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^합계/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '선택 확정' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '선택 취소' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '데모 포인트 초기화' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /묶음 선택/ })).toBeInTheDocument()
    expect(screen.getByText('↓ 하')).toBeInTheDocument()
    expect(screen.getByText('● 무')).toBeInTheDocument()
    expect(screen.getByText('↑ 상')).toBeInTheDocument()
  })

  it('supports single CARD DUEL and TOTAL picks', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /↑ 상/ }))
    expect(screen.getByText(/총 사용 데모 포인트/)).toBeInTheDocument()
    expect(screen.getByText(/카드 비교 상/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^합계/ }))
    await user.click(screen.getByRole('button', { name: /↑ 높음/ }))
    expect(screen.getByText(/합계 높음/)).toBeInTheDocument()
  })

  it('opens bundle sheet and toggles 하+무', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^묶음 선택/ }))
    const dialog = screen.getByRole('dialog', { name: '묶음 선택' })
    await user.click(within(dialog).getByRole('button', { name: '하 + 무' }))
    expect(screen.getByText(/배분/)).toBeInTheDocument()
    expect(screen.getByText(/카드 비교 하 · 50/)).toBeInTheDocument()
    expect(screen.getByText(/카드 비교 무 · 50/)).toBeInTheDocument()
  })

  it('keeps clearSelection independent from resetPoints', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /↑ 상/ }))
    expect(screen.getByText(/카드 비교 상/)).toBeInTheDocument()

    const pointsBefore = screen.getByText(/10[,.]?000|10000/)
    expect(pointsBefore).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '선택 취소' }))
    expect(screen.getByText('선택된 항목이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText(/10[,.]?000|10000/)).toBeInTheDocument()
  })

  it('disables betting controls after lock-in (and after timer auto-lock uses same path)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /↑ 상/ }))
    await user.click(screen.getByRole('button', { name: '선택 확정' }))
    expect(screen.getByRole('button', { name: /^묶음 선택/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /↑ 상/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: '선택 취소' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '선택 확정' })).toBeDisabled()
  })
})
