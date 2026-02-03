import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Home from './pages/Home'

describe('Home', () => {
  it('FlipNote と表示される', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText('FlipNote')).toBeInTheDocument()
  })

  it('デッキ一覧へのリンクがある', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByText('デッキ一覧')).toBeInTheDocument()
  })
})
