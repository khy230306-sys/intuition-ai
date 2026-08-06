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

  it('starts playable Orbit Sync experience', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: '체험 시작' })[0]!)
    expect(screen.getByRole('heading', { name: 'ORBIS 체험 라운드' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'BLUE' }))
    expect(screen.getByRole('button', { name: '라운드 시작' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '라운드 시작' }))
    expect(screen.getByRole('button', { name: 'SYNC' })).toBeInTheDocument()
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
