import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('PIP App', () => {
  it('renders playable demo shell', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'PIP' })).toBeInTheDocument()
    expect(screen.getByText(/DEMO POINT는 금전적 가치가 없으며/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CARD DUEL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'TOTAL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'LOCK IN' })).toBeInTheDocument()
    expect(screen.getByText(/SHOE/)).toBeInTheDocument()
  })
})
