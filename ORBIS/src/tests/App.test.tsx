import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../app/App'

describe('ORBIS App', () => {
  it('renders home brand identity', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'ORBIS' })).toBeInTheDocument()
    expect(screen.getByText('Every Round Creates a New Story')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '체험 시작' })[0]).toBeInTheDocument()
  })

  it('opens Stage 2 preview modal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: '체험 시작' })[0]!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('게임 시스템은 Stage 2에서 연결됩니다.')).toBeInTheDocument()
  })

  it('navigates to settings and switches language', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('link', { name: '설정 열기' })[0]!)
    expect(screen.getByRole('heading', { name: '설정' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '영어' }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })
})
