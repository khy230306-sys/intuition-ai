import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('PIP App', () => {
  it('renders playable demo shell in Korean betting UX', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'PIP' })).toBeInTheDocument()
    expect(screen.getByText(/데모 포인트는 금전적 가치가 없으며/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /카드 비교/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^합계/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '선택 확정' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '대로표' })).toBeInTheDocument()
    expect(screen.getAllByText(/슈/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/라운드/).length).toBeGreaterThan(0)
  })
})
